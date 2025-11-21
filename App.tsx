/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef } from 'react';
import { Hero } from './components/Hero';
import { InputArea } from './components/InputArea';
import { LivePreview } from './components/LivePreview';
import { CreationHistory, Creation } from './components/CreationHistory';
import { bringToLife, bringToLifeAsVideo } from './services/gemini';
import { ArrowUpTrayIcon } from '@heroicons/react/24/solid';

// Add type definition for the global aistudio
declare global {
  // FIX: Use a named interface for `aistudio` to resolve declaration conflicts.
  // This allows multiple declarations of `window.aistudio` to be merged correctly.
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

type GenerationMode = 'app' | 'video';

const App: React.FC = () => {
  const [activeCreation, setActiveCreation] = useState<Creation | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationMode, setGenerationMode] = useState<GenerationMode>('app');
  const [history, setHistory] = useState<Creation[]>([]);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initHistory = async () => {
      const saved = localStorage.getItem('gemini_app_history');
      let loadedHistory: Creation[] = [];

      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          loadedHistory = parsed.map((item: any) => ({
              ...item,
              timestamp: new Date(item.timestamp)
          }));
        } catch (e) { console.error("Failed to load history", e); }
      }

      if (loadedHistory.length > 0) {
        setHistory(loadedHistory);
      } else {
        try {
           const exampleUrls = [
               'https://storage.googleapis.com/sideprojects-asronline/bringanythingtolife/vibecode-blog.json',
               'https://storage.googleapis.com/sideprojects-asronline/bringanythingtolife/cassette.json',
               'https://storage.googleapis.com/sideprojects-asronline/bringanythingtolife/chess.json'
           ];
           const examples = await Promise.all(exampleUrls.map(async (url) => {
               const res = await fetch(url);
               if (!res.ok) return null;
               const data = await res.json();
               return { ...data, timestamp: new Date(data.timestamp || Date.now()), id: data.id || crypto.randomUUID() };
           }));
           setHistory(examples.filter((e): e is Creation => e !== null));
        } catch (e) { console.error("Failed to load examples", e); }
      }
    };
    initHistory();
  }, []);

  useEffect(() => {
    if (history.length > 0) {
        try {
            localStorage.setItem('gemini_app_history', JSON.stringify(history.map(c => {
                const { videoUrl, ...rest } = c; // Don't save temporary blob URLs
                return rest;
            })));
        } catch (e) { console.warn("Local storage full or error saving history", e); }
    }
  }, [history]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result.split(',')[1]);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleGenerate = async (promptText: string, file: File | null, mode: GenerationMode) => {
    setIsGenerating(true);
    setGenerationMode(mode);
    setActiveCreation(null);

    try {
      let imageBase64: string | undefined;
      let mimeType: string | undefined;
      if (file) {
        imageBase64 = await fileToBase64(file);
        mimeType = file.type.toLowerCase();
      }

      const newCreation: Omit<Creation, 'id' | 'timestamp'> = {
        name: file?.name || promptText.substring(0, 30) || 'New Creation',
        originalImage: imageBase64 && mimeType ? `data:${mimeType};base64,${imageBase64}` : undefined,
        type: mode,
      };

      if (mode === 'video') {
        if (window.aistudio) {
            let hasKey = await window.aistudio.hasSelectedApiKey();
            if (!hasKey) {
                await window.aistudio.openSelectKey();
                // Assume success and proceed, per guidelines
            }
        }
        const videoUrl = await bringToLifeAsVideo(promptText, imageBase64, mimeType);
        if (videoUrl) {
            const creationWithVideo: Creation = { ...newCreation, videoUrl, id: crypto.randomUUID(), timestamp: new Date() };
            setActiveCreation(creationWithVideo);
            setHistory(prev => [creationWithVideo, ...prev]);
        }
      } else {
        const html = await bringToLife(promptText, imageBase64, mimeType);
        if (html) {
            const creationWithHtml: Creation = { ...newCreation, html, id: crypto.randomUUID(), timestamp: new Date() };
            setActiveCreation(creationWithHtml);
            setHistory(prev => [creationWithHtml, ...prev]);
        }
      }
    } catch (error: any) {
      console.error("Failed to generate:", error);
      alert(`Something went wrong: ${error.message || "Please try again."}`);
      if (error.message.includes("API key not found")) {
          // This allows the user to try again after the key selection dialog might have failed.
          if (window.aistudio) window.aistudio.openSelectKey();
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateVideo = async (newPrompt: string, originalCreation: Creation) => {
    setIsGenerating(true);
    setGenerationMode('video');
    // The activeCreation remains, so the UI doesn't blank out, the loading overlay will just appear on top.

    try {
        let imageBase64: string | undefined;
        let mimeType: string | undefined;

        if (originalCreation.originalImage) {
            const parts = originalCreation.originalImage.split(';base64,');
            if (parts.length === 2) {
                mimeType = parts[0].split(':')[1];
                imageBase64 = parts[1];
            }
        }

        if (window.aistudio) {
            let hasKey = await window.aistudio.hasSelectedApiKey();
            if (!hasKey) {
                await window.aistudio.openSelectKey();
            }
        }
        
        const videoUrl = await bringToLifeAsVideo(newPrompt, imageBase64, mimeType);
        
        if (videoUrl) {
            const newCreation: Creation = {
                originalImage: originalCreation.originalImage,
                type: 'video',
                id: crypto.randomUUID(),
                timestamp: new Date(),
                name: newPrompt,
                videoUrl: videoUrl,
            };
            setActiveCreation(newCreation);
            setHistory(prev => [newCreation, ...prev]);
        }
    } catch (error: any) {
      console.error("Failed to regenerate video:", error);
      alert(`Something went wrong during regeneration: ${error.message || "Please try again."}`);
      if (error.message.includes("API key not found")) {
          if (window.aistudio) window.aistudio.openSelectKey();
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setActiveCreation(null);
    setIsGenerating(false);
  };

  const handleSelectCreation = (creation: Creation) => {
    setActiveCreation(creation);
  };

  const handleReorderHistory = (newHistory: Creation[]) => {
    setHistory(newHistory);
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const json = event.target?.result as string;
            const parsed = JSON.parse(json);
            if ((parsed.html || parsed.videoUrl) && parsed.name && parsed.type) {
                const importedCreation: Creation = {
                    ...parsed,
                    timestamp: new Date(parsed.timestamp || Date.now()),
                    id: parsed.id || crypto.randomUUID()
                };
                setHistory(prev => {
                    const exists = prev.some(c => c.id === importedCreation.id);
                    return exists ? prev : [importedCreation, ...prev];
                });
                setActiveCreation(importedCreation);
            } else {
                alert("Invalid creation file format.");
            }
        } catch (err) {
            console.error("Import error", err);
            alert("Failed to import creation.");
        }
        if (importInputRef.current) importInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const isFocused = !!activeCreation || isGenerating;

  return (
    <div className="h-[100dvh] bg-zinc-950 bg-dot-grid text-zinc-50 selection:bg-blue-500/30 overflow-y-auto overflow-x-hidden relative flex flex-col">
      <div 
        className={`
          min-h-full flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 relative z-10 
          transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1)
          ${isFocused 
            ? 'opacity-0 scale-95 blur-sm pointer-events-none h-[100dvh] overflow-hidden' 
            : 'opacity-100 scale-100 blur-0'
          }
        `}
      >
        <div className="flex-1 flex flex-col justify-center items-center w-full py-12 md:py-20">
          <div className="w-full mb-8 md:mb-16">
              <Hero />
          </div>
          <div className="w-full flex justify-center mb-8">
              <InputArea onGenerate={handleGenerate} isGenerating={isGenerating} disabled={isFocused} />
          </div>
        </div>
        
        <div className="flex-shrink-0 pb-6 w-full mt-auto flex flex-col items-center gap-6">
            <div className="w-full px-2 md:px-0">
                <CreationHistory 
                    history={history} 
                    onSelect={handleSelectCreation} 
                    onReorder={handleReorderHistory} 
                    activeCreationId={activeCreation?.id || null} 
                />
            </div>
            <a 
              href="https://x.com/ammaar" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-zinc-600 hover:text-zinc-400 text-xs font-mono transition-colors pb-2"
            >
              Created by @ammaar
            </a>
        </div>
      </div>

      <LivePreview
        creation={activeCreation}
        isLoading={isGenerating}
        isFocused={isFocused}
        onReset={handleReset}
        loadingMode={generationMode}
        onRegenerateVideo={handleRegenerateVideo}
      />

      <div className="fixed bottom-4 right-4 z-50">
        <button 
            onClick={handleImportClick}
            className="flex items-center space-x-2 p-2 text-zinc-500 hover:text-zinc-300 transition-colors opacity-60 hover:opacity-100"
            title="Import Artifact"
        >
            <span className="text-xs font-medium uppercase tracking-wider hidden sm:inline">Upload previous artifact</span>
            <ArrowUpTrayIcon className="w-5 h-5" />
        </button>
        <input 
            type="file" 
            ref={importInputRef} 
            onChange={handleImportFile} 
            accept=".json" 
            className="hidden" 
        />
      </div>
    </div>
  );
};

export default App;