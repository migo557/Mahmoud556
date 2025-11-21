/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useState, useRef } from 'react';
import { ArrowDownTrayIcon, PlusIcon, ViewColumnsIcon, DocumentIcon, CodeBracketIcon, XMarkIcon, DocumentDuplicateIcon, CheckIcon, ArrowPathIcon, VideoCameraIcon } from '@heroicons/react/24/outline';
import { Creation } from './CreationHistory';

interface LivePreviewProps {
  creation: Creation | null;
  isLoading: boolean;
  isFocused: boolean;
  onReset: () => void;
  loadingMode: 'app' | 'video';
  onRegenerateVideo: (prompt: string, creation: Creation) => void;
}

// Add type definition for the global pdfjsLib
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

// FIX: Define props with an interface and use React.FC to correctly type the component for use with a `key` prop.
interface LoadingStepProps {
  text: string,
  active: boolean,
  completed: boolean
}

const LoadingStep: React.FC<LoadingStepProps> = ({ text, active, completed }) => (
    <div className={`flex items-center space-x-3 transition-all duration-500 ${active || completed ? 'opacity-100 translate-x-0' : 'opacity-30 translate-x-4'}`}>
        <div className={`w-4 h-4 flex items-center justify-center ${completed ? 'text-green-400' : active ? 'text-blue-400' : 'text-zinc-700'}`}>
            {completed ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            ) : active ? (
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
            ) : (
                <div className="w-1.5 h-1.5 bg-zinc-700 rounded-full"></div>
            )}
        </div>
        <span className={`font-mono text-xs tracking-wide uppercase ${active ? 'text-zinc-200' : completed ? 'text-zinc-400 line-through' : 'text-zinc-600'}`}>{text}</span>
    </div>
);

const AppLoadingIndicator = () => {
    const steps = [
        "Analyzing visual inputs",
        "Identifying UI patterns",
        "Generating functional logic",
        "Compiling preview",
    ];
    const [step, setStep] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setStep(prev => (prev < steps.length - 1 ? prev + 1 : prev));
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center p-8 w-full max-w-md animate-in fade-in duration-500">
            <div className="w-16 h-16 mb-6 text-blue-500 relative">
                <svg className="w-full h-full animate-spin-slow" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="45" stroke="currentColor" strokeOpacity="0.2" strokeWidth="4"/>
                    <path d="M50 5 C74.8528 5 95 25.1472 95 50" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                </svg>
                 <CodeBracketIcon className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500/80" />
            </div>
            <h3 className="text-zinc-100 font-mono text-lg tracking-tight">Constructing Environment</h3>
            <div className="w-full h-1 bg-zinc-800 rounded-full my-6 overflow-hidden">
                <div 
                    className="h-full bg-blue-500 transition-all duration-1000 ease-out" 
                    style={{ width: `${((step + 1) / steps.length) * 100}%` }}
                ></div>
            </div>
            <div className="w-full space-y-3 font-mono text-sm">
                {steps.map((text, index) => (
                    <LoadingStep key={text} text={text} active={index === step} completed={index < step} />
                ))}
            </div>
        </div>
    );
};

const VideoLoadingIndicator = () => {
    const messages = [
        "Initializing video synthesizer...",
        "Generating keyframes from prompt...",
        "Rendering video stream (this can take a minute)...",
        "Finalizing composition and audio...",
    ];
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex(prev => (prev + 1) % messages.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col items-center text-center animate-in fade-in duration-500">
            <div className="w-16 h-16 mb-6 text-blue-500 relative flex items-center justify-center">
                 <svg className="w-full h-full animate-spin-slow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                     <path d="M2.5 8.5v7l4-3.5-4-3.5zM8 7.5v9l5-4.5-5-4.5zM13.5 6.5v11l6-5.5-6-5.5z"/>
                 </svg>
                 <VideoCameraIcon className="w-6 h-6 absolute text-blue-500/80"/>
            </div>
            <h3 className="text-zinc-100 font-mono text-lg tracking-tight">Constructing Video</h3>
            <p className="text-zinc-500 text-sm mt-2 h-10 flex items-center justify-center transition-opacity duration-500">
                {messages[index]}
            </p>
        </div>
    );
};

const PdfRenderer = ({ dataUrl }: { dataUrl: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderPdf = async () => {
      if (!window.pdfjsLib) {
        setError("PDF library not initialized");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const loadingTask = window.pdfjsLib.getDocument(dataUrl);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        const viewport = page.getViewport({ scale: 2.0 });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
        setLoading(false);
      } catch (err) {
        console.error("Error rendering PDF:", err);
        setError("Could not render PDF preview.");
        setLoading(false);
      }
    };

    renderPdf();
  }, [dataUrl]);

  if (error) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-zinc-500 p-6 text-center">
            <DocumentIcon className="w-12 h-12 mb-3 opacity-50 text-red-400" />
            <p className="text-sm mb-2 text-red-400/80">{error}</p>
        </div>
    );
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center">
        {loading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
        )}
        <canvas 
            ref={canvasRef} 
            className={`max-w-full max-h-full object-contain shadow-xl border border-zinc-800/50 rounded transition-opacity duration-500 ${loading ? 'opacity-0' : 'opacity-100'}`}
        />
    </div>
  );
};

export const LivePreview: React.FC<LivePreviewProps> = ({ creation, isLoading, isFocused, onReset, loadingMode, onRegenerateVideo }) => {
    const [showSplitView, setShowSplitView] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [editablePrompt, setEditablePrompt] = useState('');
    const [isContentLoaded, setIsContentLoaded] = useState(false);

    useEffect(() => {
        if (creation) {
            setIsContentLoaded(false); // Reset on new creation
            setEditablePrompt(creation.name);
            if (creation.originalImage && creation.type === 'app') {
                setShowSplitView(true);
            } else {
                setShowSplitView(false);
            }
        }
    }, [creation]);

    const handleCopyHtml = () => {
        if (!creation?.html || isCopied) return;
        navigator.clipboard.writeText(creation.html).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }).catch(err => {
            console.error("Failed to copy HTML:", err);
            alert("Could not copy HTML to clipboard.");
        });
    };

    const handleDownloadVideo = () => {
        if (!creation?.videoUrl) return;
        const a = document.createElement('a');
        a.href = creation.videoUrl;
        a.download = `${creation.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleExport = () => {
        if (!creation) return;
        const { videoUrl, ...exportableCreation } = creation; // Exclude blob URL from export
        const dataStr = JSON.stringify(exportableCreation, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${creation.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_artifact.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleRegenerateClick = () => {
        if (!creation || !editablePrompt.trim() || isLoading) return;
        onRegenerateVideo(editablePrompt, creation);
    };

  return (
    <div
      className={`
        fixed z-40 flex flex-col
        rounded-lg overflow-hidden border border-zinc-800 bg-[#0E0E10] shadow-2xl
        transition-all duration-700 cubic-bezier(0.2, 0.8, 0.2, 1)
        ${isFocused
          ? 'inset-2 md:inset-4 opacity-100 scale-100'
          : 'top-1/2 left-1/2 w-[90%] h-[60%] -translate-x-1/2 -translate-y-1/2 opacity-0 scale-95 pointer-events-none'
        }
      `}
    >
      <div className="bg-[#121214] px-4 py-3 flex items-center justify-between border-b border-zinc-800 shrink-0">
        <div className="flex items-center space-x-3 w-32">
           <div className="flex space-x-2 group/controls">
                <button 
                  onClick={onReset}
                  className="w-3 h-3 rounded-full bg-zinc-700 group-hover/controls:bg-red-500 hover:!bg-red-600 transition-colors flex items-center justify-center focus:outline-none"
                  title="Close Preview"
                ><XMarkIcon className="w-2 h-2 text-black opacity-0 group-hover/controls:opacity-100" /></button>
                <div className="w-3 h-3 rounded-full bg-zinc-700 group-hover/controls:bg-yellow-500 transition-colors"></div>
                <div className="w-3 h-3 rounded-full bg-zinc-700 group-hover/controls:bg-green-500 transition-colors"></div>
           </div>
        </div>
        
        <div className="flex-1 text-center min-w-0 px-4">
            {isLoading ? (
                <div className="flex items-center justify-center space-x-2 text-zinc-500 animate-pulse">
                    <CodeBracketIcon className="w-3 h-3" />
                    <span className="text-[11px] font-mono uppercase tracking-wider">System Processing...</span>
                </div>
            ) : creation?.type === 'video' ? (
                <input
                    type="text"
                    value={editablePrompt}
                    onChange={(e) => setEditablePrompt(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRegenerateClick() }}
                    disabled={isLoading}
                    className="w-full bg-zinc-900/50 text-center text-zinc-300 text-[11px] font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-zinc-800 rounded-md px-3 py-1.5 border border-zinc-800 disabled:opacity-50"
                    placeholder="Edit prompt and regenerate..."
                />
            ) : (
                <div className="flex items-center justify-center space-x-2 text-zinc-500">
                    <CodeBracketIcon className="w-3 h-3" />
                    <span className="text-[11px] font-mono uppercase tracking-wider truncate">
                    {creation ? creation.name : 'Preview Mode'}
                    </span>
                </div>
            )}
        </div>

        <div className="flex items-center justify-end space-x-1 w-32">
            {!isLoading && creation && (
                <>
                    {creation.originalImage && creation.type === 'app' && (
                         <button 
                            onClick={() => setShowSplitView(!showSplitView)}
                            title={showSplitView ? "Show App Only" : "Compare with Original"}
                            className={`p-1.5 rounded-md transition-all ${showSplitView ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
                        ><ViewColumnsIcon className="w-4 h-4" /></button>
                    )}

                    {creation.type === 'app' && (
                        <button
                            onClick={handleCopyHtml}
                            title={isCopied ? 'Copied to clipboard!' : 'Copy HTML'}
                            className={`p-1.5 rounded-md transition-colors duration-200 ${isCopied ? 'text-green-500' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
                            disabled={isCopied}
                        >{isCopied ? <CheckIcon className="w-4 h-4" /> : <DocumentDuplicateIcon className="w-4 h-4" />}</button>
                    )}

                    {creation.type === 'video' && (
                        <>
                            <button 
                                onClick={handleRegenerateClick}
                                title="Regenerate Video with new prompt"
                                className="text-zinc-500 hover:text-blue-400 transition-colors p-1.5 rounded-md hover:bg-zinc-800"
                            >
                                <ArrowPathIcon className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={handleDownloadVideo}
                                title="Download Video (MP4)"
                                className="text-zinc-500 hover:text-zinc-300 transition-colors p-1.5 rounded-md hover:bg-zinc-800"
                            ><ArrowDownTrayIcon className="w-4 h-4" /></button>
                        </>
                    )}

                    <button 
                        onClick={handleExport}
                        title="Export Artifact (JSON)"
                        className="text-zinc-500 hover:text-zinc-300 transition-colors p-1.5 rounded-md hover:bg-zinc-800"
                    ><ArrowDownTrayIcon className="w-4 h-4" /></button>

                    <button 
                        onClick={onReset}
                        title="New Upload"
                        className="ml-2 flex items-center space-x-1 text-xs font-bold bg-white text-black hover:bg-zinc-200 px-3 py-1.5 rounded-md transition-colors"
                    >
                        <PlusIcon className="w-3 h-3" />
                        <span className="hidden sm:inline">New</span>
                    </button>
                </>
            )}
        </div>
      </div>

      <div className="relative w-full flex-1 bg-[#09090b] flex overflow-hidden">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 w-full">
             {loadingMode === 'video' ? <VideoLoadingIndicator /> : <AppLoadingIndicator />}
          </div>
        ) : creation ? (
          <>
            {showSplitView && creation.originalImage && creation.type === 'app' && (
                <div className="w-full md:w-1/2 h-1/2 md:h-full border-b md:border-b-0 md:border-r border-zinc-800 bg-[#0c0c0e] relative flex flex-col shrink-0">
                    <div className="absolute top-4 left-4 z-10 bg-black/80 backdrop-blur text-zinc-400 text-[10px] font-mono uppercase px-2 py-1 rounded border border-zinc-800">Input Source</div>
                    <div className="w-full h-full p-6 flex items-center justify-center overflow-hidden">
                        {creation.originalImage.startsWith('data:application/pdf') ? (
                            <PdfRenderer dataUrl={creation.originalImage} />
                        ) : (
                            <img 
                                src={creation.originalImage} 
                                alt="Original Input" 
                                className="max-w-full max-h-full object-contain shadow-xl border border-zinc-800/50 rounded"
                            />
                        )}
                    </div>
                </div>
            )}

            {creation.type === 'video' && creation.videoUrl && (
                <div className="w-full h-full bg-black flex items-center justify-center relative">
                    {!isContentLoaded && (
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                            <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin"></div>
                        </div>
                    )}
                    <video 
                        src={creation.videoUrl} 
                        controls autoPlay loop 
                        className={`max-w-full max-h-full transition-opacity duration-300 ${isContentLoaded ? 'opacity-100' : 'opacity-0'}`}
                        onCanPlay={() => setIsContentLoaded(true)}
                    />
                </div>
            )}

            {creation.type === 'app' && creation.html && (
                <div className={`relative h-full bg-white transition-all duration-500 ${showSplitView && creation.originalImage ? 'w-full md:w-1/2 h-1/2 md:h-full' : 'w-full'}`}>
                    {!isContentLoaded && (
                        <div className="absolute inset-0 flex items-center justify-center z-10 bg-white">
                            <div className="w-6 h-6 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin"></div>
                        </div>
                    )}
                    <iframe
                        title="Gemini Live Preview"
                        srcDoc={creation.html}
                        className={`w-full h-full transition-opacity duration-300 ${isContentLoaded ? 'opacity-100' : 'opacity-0'}`}
                        sandbox="allow-scripts allow-forms allow-popups allow-modals allow-same-origin"
                        onLoad={() => setIsContentLoaded(true)}
                    />
                </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
};