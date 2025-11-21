/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useCallback, useState, useEffect, useRef } from 'react';
import { SparklesIcon, CpuChipIcon, PhotoIcon, XMarkIcon, CodeBracketIcon, VideoCameraIcon } from '@heroicons/react/24/outline';

type GenerationMode = 'app' | 'video';

interface InputAreaProps {
  onGenerate: (prompt: string, file: File | null, mode: GenerationMode) => void;
  isGenerating: boolean;
  disabled?: boolean;
}

const StagedFilePreview = ({ file, onClear }: { file: File, onClear: () => void }) => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);

        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [file]);

    return (
        <div className="relative group w-24 h-24 rounded-lg overflow-hidden border border-zinc-700 bg-zinc-800/50">
            {previewUrl ? (
                <img src={previewUrl} alt="File preview" className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-zinc-500 border-t-zinc-300 rounded-full animate-spin"></div>
                </div>
            )}
            <button
                onClick={onClear}
                className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center text-zinc-300 hover:bg-black/80 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                title="Remove file"
            >
                <XMarkIcon className="w-3 h-3" />
            </button>
        </div>
    );
};

export const InputArea: React.FC<InputAreaProps> = ({ onGenerate, isGenerating, disabled = false }) => {
    const [mode, setMode] = useState<GenerationMode>('app');
    const [prompt, setPrompt] = useState('');
    const [stagedFile, setStagedFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = (file: File) => {
        if (file.type.startsWith('image/') || file.type === 'application/pdf') {
            setStagedFile(file);
        } else {
            alert("Please upload an image or PDF.");
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        if (disabled || isGenerating) return;
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    }, [disabled, isGenerating]);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (!disabled && !isGenerating) {
            setIsDragging(true);
        }
    }, [disabled, isGenerating]);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleGenerateClick = () => {
        if (isGenerating || disabled) return;

        if (mode === 'app' && !stagedFile) {
            alert("Please upload a file to generate an app.");
            return;
        }
        if (mode === 'video' && !prompt.trim() && !stagedFile) {
            alert("Please provide a prompt or an image to generate a video.");
            return;
        }

        onGenerate(prompt, stagedFile, mode);
        setPrompt('');
        setStagedFile(null);
    };

    const modeConfig = {
        app: {
            icon: CodeBracketIcon,
            title: 'Create App',
            promptPlaceholder: 'Describe any changes or additions to the uploaded file...',
            fileDropText: 'Drop a sketch, doc, or photo'
        },
        video: {
            icon: VideoCameraIcon,
            title: 'Create Video',
            promptPlaceholder: 'e.g., A cinematic shot of a racoon coding in a futuristic city',
            fileDropText: 'Drop an image (optional)'
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto perspective-1000">
            <div className="relative group bg-zinc-900/30 backdrop-blur-sm rounded-xl border border-zinc-800 shadow-lg p-2 transition-all duration-500">
                {/* Mode Tabs */}
                <div className="flex bg-zinc-950/50 p-1 rounded-lg border border-zinc-800/50 mb-4">
                    {(['app', 'video'] as GenerationMode[]).map(m => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            className={`w-1/2 py-2 px-4 rounded-md text-sm font-semibold flex items-center justify-center space-x-2 transition-all ${mode === m ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50'}`}
                            disabled={isGenerating}
                        >
                            <modeConfig[m].icon className="w-5 h-5" />
                            <span>{modeConfig[m].title}</span>
                        </button>
                    ))}
                </div>

                <div className="p-4 space-y-4">
                    {/* Prompt Textarea */}
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={modeConfig[mode].promptPlaceholder}
                        className="w-full h-24 bg-zinc-950/70 border border-zinc-800 rounded-lg p-4 text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none disabled:opacity-50"
                        disabled={isGenerating || disabled}
                    />

                    {/* File Area */}
                    <div className="flex items-center space-x-4">
                        {stagedFile ? (
                            <StagedFilePreview file={stagedFile} onClear={() => setStagedFile(null)} />
                        ) : (
                            <div
                                className={`
                                    relative flex-shrink-0 flex flex-col items-center justify-center
                                    w-24 h-24 bg-transparent rounded-lg border-2 border-dashed
                                    cursor-pointer overflow-hidden transition-all duration-300
                                    ${isDragging ? 'border-blue-500 bg-zinc-900/50' : 'border-zinc-700 hover:border-zinc-500'}
                                `}
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <PhotoIcon className={`w-8 h-8 transition-colors ${isDragging ? 'text-blue-400' : 'text-zinc-500'}`} />
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept="image/*,application/pdf"
                                    className="hidden"
                                    onChange={handleFileChange}
                                    disabled={isGenerating || disabled}
                                />
                            </div>
                        )}
                        <div className="text-zinc-500">
                            <h4 className="font-semibold text-zinc-300">{modeConfig[mode].fileDropText}</h4>
                            <p className="text-xs">
                                {mode === 'app' ? 'A file is required to generate an app.' : 'A starting image can guide the video.'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Generate Button */}
                <div className="p-4 border-t border-zinc-800/50 mt-2">
                    <button
                        onClick={handleGenerateClick}
                        disabled={isGenerating || disabled}
                        className="w-full flex items-center justify-center space-x-3 py-4 px-6 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-400 rounded-lg text-white font-bold text-lg transition-all duration-300 transform active:scale-[0.98] shadow-lg shadow-blue-900/30"
                    >
                        {isGenerating ? (
                            <>
                                <CpuChipIcon className="w-6 h-6 animate-spin-slow" />
                                <span>Generating...</span>
                            </>
                        ) : (
                            <>
                                <SparklesIcon className="w-6 h-6" />
                                <span>Generate</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};