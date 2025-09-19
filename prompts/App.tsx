import React, { useState, useCallback } from 'react';
import SceneGenerationStudio from './components/SceneGenerationStudio';
import { ImageEditingStudio, ProductStudio, BannerDesignStudio } from './components/SpecializedStudios';
import type { StudioMode } from './types';

const App: React.FC = () => {
    const [activeStudio, setActiveStudio] = useState<StudioMode>('Scene');
    const [textOutput, setTextOutput] = useState<string>('');
    const [jsonOutput, setJsonOutput] = useState<string>('');

    const handleStudioChange = (mode: StudioMode) => {
        setActiveStudio(mode);
        setTextOutput('');
        setJsonOutput('');
    };
    
    const updateOutputs = useCallback((text: string, json: object) => {
        setTextOutput(text);
        setJsonOutput(JSON.stringify(json, null, 2));
    }, []);

    const copyToClipboard = async (text: string, button: HTMLButtonElement) => {
        try {
            await navigator.clipboard.writeText(text);
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            setTimeout(() => {
                button.textContent = originalText;
            }, 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy text.');
        }
    };

    const renderStudio = () => {
        switch (activeStudio) {
            case 'Scene':
                return <SceneGenerationStudio updateOutputs={updateOutputs} />;
            case 'Editing':
                return <ImageEditingStudio updateOutputs={updateOutputs} />;
            case 'Product':
                return <ProductStudio updateOutputs={updateOutputs} />;
            case 'Banner':
                return <BannerDesignStudio updateOutputs={updateOutputs} />;
            default:
                return null;
        }
    };

    return (
        <div className="p-4 sm:p-6 md:p-8 max-w-8xl mx-auto">
            <header className="text-center mb-8">
                <h1 className="text-3xl sm:text-4xl font-bold text-white">Prompt Studio Pro</h1>
                <p className="text-gray-400 mt-2">The complete suite for creative generation and editing.</p>
            </header>

            <main className="flex flex-col gap-8">
                <section className="bg-gray-900/50 p-4 sm:p-6 rounded-lg ring-1 ring-white/10 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[300px]">
                        <div className="flex flex-col">
                            <div className="flex justify-between items-center mb-2">
                               <label htmlFor="text-output" className="font-medium text-gray-300">Text Prompt</label>
                               <button onClick={(e) => copyToClipboard(textOutput, e.currentTarget)} className="btn-primary text-sm py-1 px-3 rounded-md">Copy</button>
                            </div>
                            <textarea id="text-output" readOnly value={textOutput} className="w-full h-full custom-input flex-grow" placeholder="Your generated prompt will appear here..."></textarea>
                        </div>
                        <div className="flex flex-col">
                             <div className="flex justify-between items-center mb-2">
                                <label htmlFor="json-output" className="font-medium text-gray-300">JSON Output</label>
                                <button onClick={(e) => copyToClipboard(jsonOutput, e.currentTarget)} className="btn-primary text-sm py-1 px-3 rounded-md">Copy</button>
                            </div>
                            <pre className="w-full h-full custom-input overflow-auto p-3 flex-grow text-sm"><code id="json-output">{jsonOutput}</code></pre>
                        </div>
                    </div>
                </section>
                
                <section>
                    <div className="flex bg-gray-800 rounded-lg p-2 max-w-3xl mx-auto">
                        {(['Scene', 'Editing', 'Product', 'Banner'] as StudioMode[]).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => handleStudioChange(mode)}
                                className={`flex-1 py-3 px-4 rounded-md font-semibold text-base transition-colors duration-200 ${
                                    activeStudio === mode
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-300 hover:bg-gray-700'
                                }`}
                            >
                                {mode === 'Scene' ? 'Scene Generation' : mode.replace(/([A-Z])/g, ' $1').trim() + ' Studio'}
                            </button>
                        ))}
                    </div>
                </section>

                <section>
                    {renderStudio()}
                </section>
            </main>
        </div>
    );
};

export default App;