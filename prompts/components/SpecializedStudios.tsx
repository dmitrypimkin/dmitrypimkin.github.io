import React, { useState, useEffect } from 'react';
import type { UpdateOutputsFn } from '../types';

// --- SHARED HELPER COMPONENTS ---

const UniversalChipInput: React.FC<{
    value: string[],
    onChange: (val: string[]) => void,
    presets?: string[],
    placeholder?: string,
}> = ({ value = [], onChange, presets = [], placeholder="Add..." }) => {
    const [inputValue, setInputValue] = useState('');
    
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
            <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-800 border border-gray-700 rounded-lg min-h-[46px]">
                {value.map(v => (
                    <div key={v} className="flex items-center gap-2 bg-blue-600 text-white text-sm rounded-full px-3 py-1">
                        <span>{v}</span>
                        <button onClick={() => handleRemove(v)} className="font-bold text-blue-200 hover:text-white">&times;</button>
                    </div>
                ))}
                <input
                    type="text"
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAdd(inputValue))}
                    className="flex-grow bg-transparent focus:outline-none p-1 min-w-[80px]"
                    placeholder={placeholder}
                />
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


const formatWildcard = (val: any): string => {
    if (!val) return '';
    if (!Array.isArray(val) || val.length === 0) return String(val);
    if (val.length === 1) return val[0];
    return `{${val.join('|')}}`;
}

// A generic hook for form state in these simpler studios
const useFormState = <T,>(initialState: T, updateOutputs: UpdateOutputsFn, promptGenerator: (state: T) => { text: string; json: object }) => {
    const [state, setState] = useState<T>(initialState);

    const handleChange = (key: keyof T, value: any) => {
        setState(prevState => ({ ...prevState, [key]: value }));
    };

    useEffect(() => {
        const { text, json } = promptGenerator(state);
        updateOutputs(text, json);
    }, [state, updateOutputs, promptGenerator]);

    return { state, handleChange };
};

// --- Image Editing Studio ---

interface EditingState { refImages: string; instruction: string; }
const editingPromptGenerator = (state: EditingState) => {
    if (!state.refImages && !state.instruction) {
        return { text: '', json: { mode: 'Editing', ...state } };
    }
    const text = `Using reference images (${state.refImages || 'unspecified'}), perform the following edit: ${state.instruction || 'unspecified'}.`;
    return { text, json: { mode: 'Editing', ...state } };
};

export const ImageEditingStudio: React.FC<{ updateOutputs: UpdateOutputsFn }> = ({ updateOutputs }) => {
    const { state, handleChange } = useFormState<EditingState>({ refImages: '', instruction: '' }, updateOutputs, editingPromptGenerator);
    return (
        <div className="bg-gray-900/50 p-6 rounded-lg ring-1 ring-white/10 space-y-6">
            <h2 className="text-xl font-semibold text-white">Image Editing Studio</h2>
            <p className="text-gray-400">Combine elements from multiple reference images to create a new composition.</p>
            <div>
                <label className="font-medium text-gray-300 mb-2 block">Reference Images</label>
                <input type="text" value={state.refImages} onChange={e => handleChange('refImages', e.target.value)} className="w-full custom-input bg-gray-800 border-gray-700" placeholder="e.g., subject_img, background_texture" />
            </div>
            <div>
                <label className="font-medium text-gray-300 mb-2 block">Editing Instruction</label>
                <textarea value={state.instruction} onChange={e => handleChange('instruction', e.target.value)} className="w-full custom-input" rows={4} placeholder="e.g., Place the subject from subject_img into the scene, using the background_texture for the floor."></textarea>
            </div>
        </div>
    );
};

// --- Product Studio ---

interface ProductState { mode: 'Standard' | 'Mockup'; productDescription: string; shotType: string[]; cameraAngle: string[]; lighting: string[]; background: string; props: string; mockupType: string[]; mockupLogo: string; mockupColors: string; mockupContext: string; }
const productPromptGenerator = (state: ProductState) => {
    let text, json;
    if (state.mode === 'Standard') {
        const parts = [];
        if (state.productDescription) parts.push(`A commercial photograph of ${state.productDescription}.`);
        if (state.shotType.length > 0) parts.push(`Shot Type: ${formatWildcard(state.shotType)}.`);
        if (state.cameraAngle.length > 0) parts.push(`Angle: ${formatWildcard(state.cameraAngle)}.`);
        if (state.lighting.length > 0) parts.push(`Lighting: ${formatWildcard(state.lighting)}.`);
        if (state.background) parts.push(`Background: ${state.background}.`);
        if (state.props) parts.push(`Props: ${state.props}.`);
        text = parts.join(' ');
        json = { mode: 'Product', productMode: state.mode, productDescription: state.productDescription, shotType: state.shotType, cameraAngle: state.cameraAngle, lighting: state.lighting, background: state.background, props: state.props };
    } else {
        const parts = [];
        if (state.mockupType.length > 0) parts.push(`A branded mockup of a ${formatWildcard(state.mockupType)}.`);
        if (state.mockupLogo) parts.push(`Features logo from ${state.mockupLogo}.`);
        if (state.mockupColors) parts.push(`Colors: ${state.mockupColors}.`);
        if (state.mockupContext) parts.push(`Context: ${state.mockupContext}.`);
        text = parts.join(' ');
        json = { mode: 'Product', productMode: state.mode, mockupType: state.mockupType, mockupLogo: state.mockupLogo, mockupColors: state.mockupColors, mockupContext: state.mockupContext };
    }
    return { text, json };
}

export const ProductStudio: React.FC<{ updateOutputs: UpdateOutputsFn }> = ({ updateOutputs }) => {
    const { state, handleChange } = useFormState<ProductState>({ mode: 'Standard', productDescription: '', shotType: [], cameraAngle: [], lighting: [], background: '', props: '', mockupType: [], mockupLogo: '', mockupColors: '', mockupContext: '' }, updateOutputs, productPromptGenerator);

    const standardFields = [
        { key: 'productDescription', label: 'Product Description', type: 'textarea', placeholder: 'e.g., a sleek, matte black wireless headphone' },
        { key: 'shotType', label: 'Shot Type', type: 'chips', options: ['Hero Shot', 'Lifestyle', 'Detail', 'Group Shot', 'On-white background', '360 spin', 'In-context mockup', 'Packaging shot'] },
        { key: 'cameraAngle', label: 'Camera Angle', type: 'chips', options: ['Eye-Level', '45-Degree Angle', 'Top-Down', 'Low Angle', 'Dutch Angle', "Worm's Eye View", 'Front-on'] },
        { key: 'lighting', label: 'Lighting Style', type: 'chips', options: ['Studio Softbox', 'Hard Sunlight', 'Cinematic Neon', 'Natural Light', 'Ring Light', 'Backlit', 'Golden Hour', 'Split lighting', 'Rim lighting'] },
        { key: 'background', label: 'Background / Surface', type: 'text', placeholder: 'e.g., on a marble slab, against a gradient blue wall' },
        { key: 'props', label: 'Props', type: 'text', placeholder: 'e.g., surrounded by coffee beans and a laptop' },
    ];
    const mockupFields = [
        { key: 'mockupType', label: 'Mockup Type', type: 'chips', options: ['T-Shirt', 'Hoodie', 'Mug', 'Tote Bag', 'Cap', 'Poster', 'Phone Case', 'Book Cover'] },
        { key: 'mockupLogo', label: 'Logo / Artwork Reference', type: 'text', placeholder: 'e.g., logo_ref_img' },
        { key: 'mockupColors', label: 'Brand Colors', type: 'text', placeholder: 'e.g., navy blue, gold, and white' },
        { key: 'mockupContext', label: 'Mockup Context', type: 'textarea', placeholder: 'e.g., worn by a person walking in a vibrant city street' },
    ];

    const renderField = (field: any) => (
        <div key={field.key}>
            <label className="font-medium text-gray-300 mb-2 block">{field.label}</label>
            {field.type === 'chips' ? (
                <UniversalChipInput
                    value={state[field.key as keyof ProductState] as string[]}
                    onChange={value => handleChange(field.key as keyof ProductState, value)}
                    presets={field.options}
                />
            ) : field.type === 'textarea' ? (
                <textarea value={state[field.key as keyof ProductState] as string} onChange={e => handleChange(field.key as keyof ProductState, e.target.value)} className="w-full custom-input" rows={2} placeholder={field.placeholder || ''} />
            ) : (
                <input type="text" value={state[field.key as keyof ProductState] as string} onChange={e => handleChange(field.key as keyof ProductState, e.target.value)} className="w-full custom-input" placeholder={field.placeholder || ''} />
            )}
        </div>
    );

    return (
        <div className="bg-gray-900/50 p-6 rounded-lg ring-1 ring-white/10 space-y-6">
            <h2 className="text-xl font-semibold text-white">Product Photography Studio</h2>
            <div className="flex bg-gray-800 rounded-lg p-1">
                {(['Standard', 'Mockup'] as const).map(mode => (
                    <button key={mode} onClick={() => handleChange('mode', mode)} className={`flex-1 p-2 rounded-md font-medium text-sm transition-colors duration-200 ${state.mode === mode ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                        {mode === 'Standard' ? 'Standard Photo' : 'Branded Mockup'}
                    </button>
                ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(state.mode === 'Standard' ? standardFields : mockupFields).map(renderField)}
            </div>
        </div>
    );
};

// --- Banner Design Studio ---

interface BannerState { size: string; customWidth: string; customHeight: string; style: string[]; palette: string; headline: string; body: string; cta: string; }
const bannerPromptGenerator = (state: BannerState) => {
    const size = state.size === 'custom' ? (state.customWidth && state.customHeight ? `${state.customWidth}x${state.customHeight}` : '') : state.size;
    
    const parts: string[] = [];
    const styleText = formatWildcard(state.style);

    if (styleText || size) {
        let initialPart = "Design a";
        if (styleText) initialPart += ` ${styleText}`;
        initialPart += ` web banner`;
        if (size) initialPart += ` (${size})`;
        initialPart += ".";
        parts.push(initialPart);
    }

    if (state.palette) parts.push(`Palette: ${state.palette}.`);
    if (state.headline) parts.push(`Headline: "${state.headline}".`);
    if (state.body) parts.push(`Body: "${state.body}".`);
    if (state.cta) parts.push(`CTA: "${state.cta}".`);
    
    const text = parts.join(' ');
    return { text, json: { mode: 'Banner', ...state, finalSize: size }};
}

export const BannerDesignStudio: React.FC<{ updateOutputs: UpdateOutputsFn }> = ({ updateOutputs }) => {
    const { state, handleChange } = useFormState<BannerState>({ size: '', customWidth: '1200', customHeight: '628', style: [], palette: '', headline: '', body: '', cta: '' }, updateOutputs, bannerPromptGenerator);

    const fields = [
        { key: 'style', label: 'Design Style', type: 'chips', options: ['Minimalist & Clean', 'Corporate & Professional', 'Playful & Vibrant', 'Elegant & Luxury', 'Tech & Futuristic', 'Grunge & Textured'] },
        { key: 'palette', label: 'Primary Color Palette', type: 'text', placeholder: 'e.g., #0A192F, #64FFDA' },
        { key: 'headline', label: 'Headline Text', type: 'text', placeholder: 'e.g., The Future is Now' },
        { key: 'body', label: 'Subheading / Body', type: 'textarea', placeholder: 'e.g., Discover our revolutionary new product.' },
        { key: 'cta', label: 'Call To Action', type: 'text', placeholder: 'e.g., Shop Now and Get 20% Off' },
    ];

    return (
        <div className="bg-gray-900/50 p-6 rounded-lg ring-1 ring-white/10 space-y-6">
            <h2 className="text-xl font-semibold text-white">Banner Design Studio</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="font-medium text-gray-300 mb-2 block">Banner Size</label>
                    <select value={state.size} onChange={e => handleChange('size', e.target.value)} className="w-full custom-input">
                        <option value="" disabled>Select a size...</option>
                        <option value="1200x628">1200x628 (Facebook)</option>
                        <option value="1080x1080">1080x1080 (Instagram)</option>
                        <option value="1080x1920">1080x1920 (Story)</option>
                        <option value="custom">Custom...</option>
                    </select>
                </div>
                 {state.size === 'custom' && (
                    <div className="grid grid-cols-2 gap-4">
                        <input type="number" placeholder="Width (px)" value={state.customWidth} onChange={e => handleChange('customWidth', e.target.value)} className="w-full custom-input" />
                        <input type="number" placeholder="Height (px)" value={state.customHeight} onChange={e => handleChange('customHeight', e.target.value)} className="w-full custom-input" />
                    </div>
                )}
                {fields.map(field => (
                    <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                        <label className="font-medium text-gray-300 mb-2 block">{field.label}</label>
                        {field.type === 'chips' ? (
                            <UniversalChipInput
                                value={state[field.key as keyof BannerState] as string[]}
                                onChange={value => handleChange(field.key as keyof BannerState, value)}
                                presets={field.options}
                                placeholder="Add custom style..."
                            />
                        ) : field.type === 'textarea' ? (
                             <textarea value={state[field.key as keyof BannerState] as string} onChange={e => handleChange(field.key as keyof BannerState, e.target.value)} className="w-full custom-input" rows={2} placeholder={field.placeholder} />
                        ) : (
                            <input type="text" value={state[field.key as keyof BannerState] as string} onChange={e => handleChange(field.key as keyof BannerState, e.target.value)} className="w-full custom-input" placeholder={field.placeholder}/>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};