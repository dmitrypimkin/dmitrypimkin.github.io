import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { UpdateOutputsFn, PromptType, Subject, TimelineEvent } from '../types';
import { PROMPT_DATA, TAB_CONFIG, TYPE_VISIBILITY, SUBJECT_COLORS } from '../constants';
import InteractiveTimeline from './InteractiveTimeline';

// --- HELPER & UI COMPONENTS ---

const MemoizedAccordion: React.FC<{ title: React.ReactNode, children: React.ReactNode, initialOpen?: boolean }> = React.memo(({ title, children, initialOpen = false }) => {
    const [isOpen, setIsOpen] = useState(initialOpen);
    const toggle = useCallback(() => setIsOpen(o => !o), []);

    return (
        <div className="border border-gray-700 rounded-lg">
            <button onClick={toggle} className="w-full flex justify-between items-center p-4 hover:bg-gray-800/50 transition-colors">
                <div className="font-semibold text-white text-left">{title}</div>
                <svg className={`w-5 h-5 text-gray-400 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[2000px]' : 'max-h-0'}`}>
                <div className="p-4 pt-0">{children}</div>
            </div>
        </div>
    );
});

const UniversalChipInput: React.FC<{
    value: string[],
    onChange: (val: string[]) => void,
    presets?: string[],
    allowCustom?: boolean,
    showColorPicker?: boolean
}> = ({ value = [], onChange, presets = [], allowCustom = true, showColorPicker = false }) => {
    const [inputValue, setInputValue] = useState('');
    const colorInputRef = useRef<HTMLInputElement>(null);
    
    const handleAdd = (val: string) => {
        const trimmed = val.trim();
        if (trimmed && !value.includes(trimmed)) {
            onChange([...value, trimmed]);
        }
        setInputValue('');
    };

    const handleRemove = (val: string) => {
        onChange(value.filter(v => v !== val));
    };

    const togglePreset = (p: string) => {
        if (value.includes(p)) {
            handleRemove(p);
        } else {
            handleAdd(p);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-900 border border-gray-700 rounded-lg">
                {value.map(v => (
                    <div key={v} className="flex items-center gap-2 bg-blue-600 text-white text-sm rounded-full px-3 py-1">
                        <span style={{ borderBottom: v.startsWith('#') ? `2px solid ${v}`: 'none' }}>{v}</span>
                        <button onClick={() => handleRemove(v)} className="font-bold text-blue-200 hover:text-white">&times;</button>
                    </div>
                ))}
                {allowCustom && <input
                    type="text"
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAdd(inputValue))}
                    className="flex-grow bg-transparent focus:outline-none p-1 min-w-[80px]"
                    placeholder="Add..."
                />}
                 {showColorPicker && (
                    <>
                        <input ref={colorInputRef} type="color" onChange={e => handleAdd(e.target.value)} className="w-6 h-6 p-0 border-none bg-transparent cursor-pointer" style={{'WebkitAppearance': 'none', 'MozAppearance': 'none', appearance: 'none'}}/>
                    </>
                )}
            </div>
            {presets.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {presets.map(p => (
                        <button key={p} onClick={() => togglePreset(p)} className={`text-xs rounded-full px-2 py-1 transition-colors ${value.includes(p) ? 'bg-blue-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
                           {p}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};


const TimeScrubber: React.FC<{ 
    duration: number, 
    onAdd: (start: number, end: number) => void,
}> = ({ duration, onAdd }) => {
    const [start, setStart] = useState<number | null>(null);
    const [end, setEnd] = useState<number | null>(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const barRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = (sec: number) => {
        setIsSelecting(true);
        setStart(sec);
        setEnd(sec);
    };

    const handleMouseEnter = (sec: number) => {
        if (isSelecting && start !== null) {
            setEnd(sec);
        }
    };

    const handleMouseUp = () => {
        setIsSelecting(false);
    };
    
    const handleReset = () => {
        setStart(null);
        setEnd(null);
        setIsSelecting(false);
    }
    
    const handleAddClick = () => {
        if (start === null || end === null) return;
        const finalStart = Math.min(start, end);
        const finalEnd = Math.max(start, end) + 1;
        onAdd(finalStart, finalEnd);
        handleReset();
    }

    const getIsSelected = (sec: number) => {
        if (start === null || end === null) return false;
        const selStart = Math.min(start, end);
        const selEnd = Math.max(start, end);
        return sec >= selStart && sec <= selEnd;
    };

    return (
        <div className="flex flex-col gap-2 mt-2 p-2 bg-gray-900/50 rounded-md border border-gray-700">
            <div className="flex w-full bg-gray-900/50 rounded-md border border-gray-700 p-1 select-none" ref={barRef} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
                {Array.from({ length: duration }).map((_, i) => (
                    <div
                        key={i}
                        onMouseDown={() => handleMouseDown(i)}
                        onMouseEnter={() => handleMouseEnter(i)}
                        className={`flex-1 text-center text-xs h-6 flex items-center justify-center cursor-pointer rounded-sm transition-colors ${
                            getIsSelected(i) ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-400'
                        }`}
                    >
                        {i}
                    </div>
                ))}
            </div>
            {(start !== null && end !== null) && (
                 <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Selected: {Math.min(start, end)}s - {Math.max(start, end)+1}s</span>
                    <div className="flex gap-2">
                        <button onClick={handleReset} className="text-xs text-gray-400 hover:text-white">Reset</button>
                        <button onClick={handleAddClick} className="text-xs bg-blue-600 text-white px-3 py-1 rounded">Add to Timeline</button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- ICONS ---
const IconImage = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>;
const IconVideo = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>;
const IconVideoSound = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>;

const PROMPT_TYPE_CONFIG: { [key in PromptType]: { icon: React.FC, label: string } } = {
    'Image': { icon: IconImage, label: 'Image' },
    'Video': { icon: IconVideo, label: 'Video' },
    'VideoWithSound': { icon: IconVideoSound, label: 'Video With Sound' }
};


// --- MAIN STUDIO COMPONENT ---

const SceneGenerationStudio: React.FC<{ updateOutputs: UpdateOutputsFn }> = ({ updateOutputs }) => {
    const [promptType, setPromptType] = useState<PromptType>('Image');
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [params, setParams] = useState<{[key: string]: any}>({});
    const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
    const [activeTab, setActiveTab] = useState<string>('Director');
    const [animatedParams, setAnimatedParams] = useState<{[key: string]: boolean}>({});

    const duration = useMemo(() => parseInt(params.technical?.duration?.[0]?.replace('s', '') || '12', 10) || 12, [params.technical?.duration]);

    const resetState = useCallback(() => {
        setSubjects([{ id: `subj_${Date.now()}`, name: 'subject_1' }]);
        setParams({});
        setTimeline([]);
        setAnimatedParams({});
    }, []);

    useEffect(resetState, [resetState]);
    useEffect(() => { if(promptType === 'Image') setTimeline([]); }, [promptType]);

    const updateSubject = (id: string, key: string, value: any) => {
        setSubjects(s => s.map(subj => subj.id === id ? { ...subj, [key]: value } : subj));
    };
    
    const removeSubject = (id: string) => {
        const subjectToRemove = subjects.find(s => s.id === id);
        if (subjectToRemove) {
            setSubjects(s => s.filter(subj => subj.id !== id));
            setTimeline(t => t.filter(event => event.subjectId !== subjectToRemove.id));
        }
    };

    const handleParamChange = (path: string, value: any) => {
        setParams(p => {
            const newParams = JSON.parse(JSON.stringify(p)); // Deep copy
            const keys = path.split('.');
            let current: any = newParams;
            for (let i = 0; i < keys.length - 1; i++) {
                current[keys[i]] = current[keys[i]] || {};
                current = current[keys[i]];
            }
            if (!value || (Array.isArray(value) && value.length === 0) || value === '') {
                delete current[keys[keys.length-1]];
            } else {
                current[keys[keys.length - 1]] = value;
            }
            return newParams;
        });
    };
    
    const addTimelineEvent = useCallback((paramPath: string, paramLabel: string, start: number, end: number, value: string, subjectContext?: {id: string, name: string}) => {
        if (!value) return;
        const newEvent: TimelineEvent = { 
            id: `evt_${Date.now()}_${Math.random()}`, 
            paramPath,
            paramName: subjectContext ? `${subjectContext.name}.${paramLabel}` : paramLabel,
            paramLabel, 
            subjectId: subjectContext?.id, 
            start, end, value 
        };
        setTimeline(t => [...t, newEvent]);
    }, []);

    const removeTimelineEvent = useCallback((id: string) => setTimeline(t => t.filter(event => event.id !== id)), []);
    const updateTimelineEvent = useCallback((updatedEvent: TimelineEvent) => {
        setTimeline(t => t.map(e => e.id === updatedEvent.id ? updatedEvent : e));
    }, []);
    
    const formatWildcard = (val: any): string => {
        if (!val) return '';
        if (!Array.isArray(val) || val.length === 0) return String(val);
        if (val.length === 1) return val[0];
        return `{${val.join('|')}}`;
    }

    useEffect(() => {
        const jsonPrompt: any = { 
            promptType, 
            subjects: subjects.filter(s => Object.keys(s).length > 2),
            params, 
            timeline 
        };

        const hasSubjects = subjects.some(s => Object.keys(s).length > 2);
        const hasParams = Object.keys(params).some(cat => Object.keys(params[cat]).length > 0);
        const hasTimeline = timeline.length > 0;

        if (!hasSubjects && !hasParams && !hasTimeline) {
            updateOutputs('', { status: "Empty prompt" });
            return;
        }

        const buildSegment = (categoryName: string, subParams: object): string => {
            const title = categoryName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            let segment = `\n\n${title}:`;
            let hasContent = false;
            Object.entries(subParams).forEach(([param, value]) => {
                const formattedValue = formatWildcard(value);
                if (formattedValue) {
                    segment += `\n  - ${param.replace(/([A-Z])/g, ' $1').toLowerCase()}: ${formattedValue}`;
                    hasContent = true;
                }
            });
            return hasContent ? segment : '';
        };

        let textPrompt = `Create ${promptType === 'Image' ? 'an image' : 'a video'} with the following parameters:`;

        // 1. Subjects
        subjects.forEach(s => {
            const { id, ...subjectData } = s;
            const subjectParams = Object.entries(subjectData).filter(([key, value]) => key !== 'name' && formatWildcard(value));
            if (subjectParams.length > 0) {
                 textPrompt += `\n\nSubject "${s.name}":`;
                 subjectParams.forEach(([key, value]) => {
                     textPrompt += `\n  - ${key}: ${formatWildcard(value)}`;
                 });
            }
        });
        
        // 2. Ordered General Settings
        const promptOrder = ['directorNotes', 'scene', 'composition', 'camera', 'style', 'audio', 'technical'];
        promptOrder.forEach(category => {
            if (params[category] && Object.keys(params[category]).length > 0) {
                 // Special handling for negativeKeywords
                if (category === 'technical' && params.technical.negativeKeywords) return;
                textPrompt += buildSegment(category, params[category]);
            }
        });
        
        // 3. Timeline
        if (hasTimeline) {
            textPrompt += "\n\nTimeline:";
            [...timeline].sort((a,b) => a.start - b.start).forEach(event => {
                const subjectName = event.subjectId ? subjects.find(s => s.id === event.subjectId)?.name : null;
                const prefix = subjectName ? `subject_${subjectName}.${event.paramLabel}` : event.paramPath;
                textPrompt += `\n  - (${event.start}s-${event.end}s) ${prefix}: ${event.value}`;
            });
        }

        // 4. Rules (Negative Keywords)
        if (params.rules?.negativeKeywords?.length > 0) {
            textPrompt += `\n\nNegative Keywords: ${params.rules.negativeKeywords.join(', ')}`;
        }

        updateOutputs(textPrompt.trim(), jsonPrompt);

    }, [promptType, subjects, params, timeline, updateOutputs]);
    
    const renderField = (category: string, subCategory: string, options: any, subject?: Subject) => {
        const isSubjectField = !!subject;
        const path = isSubjectField ? `${category}.${subCategory}` : `${category}.${subCategory}`;
        const paramLabel = subCategory.replace(/([A-Z])/g, ' $1').trim();
        
        let currentValue: string[] | string;
        let handleChange: (value: any) => void;
        let handleReset: () => void;

        if (isSubjectField && subject) {
            currentValue = subject[subCategory] || [];
            handleChange = (value: any) => updateSubject(subject.id, subCategory, value);
            handleReset = () => updateSubject(subject.id, subCategory, Array.isArray(currentValue) ? [] : '');
        } else {
            currentValue = params[category]?.[subCategory] || [];
            handleChange = (value: any) => handleParamChange(path, value);
            handleReset = () => handleParamChange(path, Array.isArray(currentValue) ? [] : '');
        }

        const hasValue = Array.isArray(currentValue) ? currentValue.length > 0 : !!currentValue;
        
        const isAnimatable = promptType !== 'Image' && !['directorNotes', 'technical', 'rules'].includes(category);
        const isAnimated = timeline.some(e => e.paramPath === path && e.subjectId === subject?.id);

        const handleAddToTimeline = (start: number, end: number) => {
            const valueToAnimate = Array.isArray(currentValue) ? currentValue[0] : currentValue;
            if (!valueToAnimate) {
                alert(`Please select a value for "${paramLabel}" before adding to timeline.`);
                return;
            }
            addTimelineEvent(path, paramLabel, start, end, valueToAnimate, subject ? {id: subject.id, name: subject.name} : undefined);
        }
        
        const paramKey = subject ? `${subject.id}-${path}` : path;

        return (
            <div>
                 <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-400 capitalize">{paramLabel}</label>
                        {hasValue && (
                            <button onClick={handleReset} title="Reset parameter" className="text-gray-500 hover:text-red-400 text-xs font-bold">[&times;]</button>
                        )}
                    </div>
                    {isAnimatable && (
                        <button onClick={() => setAnimatedParams(p => ({...p, [paramKey]: !p[paramKey]}))} className="text-2xl" title="Animate this parameter">
                            {isAnimated ? '✅' : '🎬'}
                        </button>
                    )}
                </div>
                
                {Array.isArray(options) && options.length === 0 ? (
                    <textarea className="w-full custom-input" value={Array.isArray(currentValue) ? currentValue.join(', '): currentValue} onChange={e => handleChange(e.target.value.split(',').map(s=>s.trim()))} placeholder={`Describe ${subCategory}...`}/>
                ) : (
                    <UniversalChipInput 
                        value={Array.isArray(currentValue) ? currentValue : (currentValue ? [currentValue] : [])}
                        onChange={handleChange} 
                        presets={options.options || (Array.isArray(options) ? options : [])}
                        allowCustom={options.custom}
                        showColorPicker={subCategory === 'colorPalette'}
                    />
                )}
                {animatedParams[paramKey] && isAnimatable && <TimeScrubber duration={duration} onAdd={handleAddToTimeline} />}
            </div>
        );
    };
    
    const visibilityConfig = useMemo(() => TYPE_VISIBILITY[promptType], [promptType]);

    return (
        <div className="bg-gray-900/50 p-6 rounded-lg ring-1 ring-white/10 space-y-6">
            <div className="flex justify-between items-start">
                <div className="w-[240px]">
                    <label className="font-medium text-gray-300 mb-2 block">Prompt Type</label>
                    <div className="flex bg-gray-800 rounded-lg p-1">
                        {(['Image', 'Video', 'VideoWithSound'] as PromptType[]).map(type => {
                            const Icon = PROMPT_TYPE_CONFIG[type].icon;
                            return (
                                <button key={type} onClick={() => setPromptType(type)} title={PROMPT_TYPE_CONFIG[type].label} className={`flex-1 p-2 rounded-md font-medium text-sm transition-colors duration-200 flex items-center justify-center ${promptType === type ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}>
                                    <Icon />
                                </button>
                            );
                        })}
                    </div>
                </div>
                <button onClick={resetState} className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg text-sm">Reset All</button>
            </div>
            {promptType !== 'Image' && <InteractiveTimeline events={timeline} duration={duration} onEventRemove={removeTimelineEvent} onEventUpdate={updateTimelineEvent} />}
            <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
                <aside className="flex flex-col gap-4">
                    {Object.keys(TAB_CONFIG).map(tabName => (
                         <button key={tabName} onClick={() => setActiveTab(tabName)} className={`w-full text-left p-3 rounded-md font-medium text-sm transition-all duration-200 ${visibilityConfig.tabs.includes(tabName.toLowerCase()) ? 'opacity-50 pointer-events-none' : ''} ${activeTab === tabName ? 'bg-blue-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}`}>
                            {tabName}
                        </button>
                    ))}
                </aside>
                <div className="bg-gray-800 p-4 sm:p-6 rounded-lg">
                    {Object.entries(TAB_CONFIG).map(([tabName, categories]) => (
                        <div key={tabName} className={`${activeTab === tabName ? 'block' : 'hidden'} space-y-6`}>
                            {tabName === 'Subjects' ? (
                                <>
                                    {subjects.map((s, i) => (
                                        <MemoizedAccordion key={s.id} initialOpen={true} title={
                                            <div className="flex items-center gap-3 w-full">
                                                <span className="w-4 h-4 rounded-full flex-shrink-0" style={{backgroundColor: SUBJECT_COLORS[i % SUBJECT_COLORS.length]}}></span>
                                                <input type="text" value={s.name} onChange={e => updateSubject(s.id, 'name', e.target.value)} className="bg-transparent text-white font-semibold w-full focus:ring-0 focus:outline-none p-0" />
                                                {subjects.length > 1 && <button onClick={(e) => {e.stopPropagation(); removeSubject(s.id);}} className="text-gray-500 hover:text-red-400 ml-auto font-bold text-xl">&times;</button>}
                                            </div>
                                        }>
                                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                                {Object.entries(PROMPT_DATA.subjects).map(([subCat, opts]) => (
                                                    <div key={subCat}>
                                                        {renderField('subjects', subCat, opts, s)}
                                                    </div>
                                                ))}
                                            </div>
                                        </MemoizedAccordion>
                                    ))}
                                    <button onClick={() => setSubjects(s => [...s, {id: `subj_${Date.now()}`, name: `subject_${s.length + 1}`}])} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg">+ Add Subject</button>
                                </>
                            ) : (
                                categories.map(category => (
                                    <MemoizedAccordion key={category} title={<h3 className="capitalize">{category.replace(/([A-Z])/g, ' $1')}</h3>}>
                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                            {Object.entries((PROMPT_DATA as any)[category] || {}).map(([subCat, opts]) => (
                                                <div key={subCat} className={visibilityConfig.params.includes(subCat) ? 'opacity-50 pointer-events-none' : ''}>
                                                    {renderField(category, subCat, opts)}
                                                </div>
                                            ))}
                                        </div>
                                    </MemoizedAccordion>
                                ))
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SceneGenerationStudio;