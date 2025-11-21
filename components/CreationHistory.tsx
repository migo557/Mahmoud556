/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useRef, useState } from 'react';
import { ClockIcon, ArrowRightIcon, DocumentIcon, PhotoIcon, CodeBracketIcon, VideoCameraIcon } from '@heroicons/react/24/outline';

export interface Creation {
  id: string;
  name: string;
  timestamp: Date;
  type: 'app' | 'video';
  html?: string;
  originalImage?: string; // Base64 data URL
  videoUrl?: string; // Blob URL
}

interface CreationHistoryProps {
  history: Creation[];
  onSelect: (creation: Creation) => void;
  onReorder: (newHistory: Creation[]) => void;
  activeCreationId: string | null;
}

export const CreationHistory: React.FC<CreationHistoryProps> = ({ history, onSelect, onReorder, activeCreationId }) => {
  const dragItem = useRef<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (history.length === 0) return null;

  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>, index: number) => {
    dragItem.current = index;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnter = (index: number) => {
    if (draggedIndex !== null && index !== draggedIndex) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverIndex !== null && dragItem.current !== dragOverIndex) {
      const newHistory = [...history];
      const [draggedItem] = newHistory.splice(dragItem.current, 1);
      newHistory.splice(dragOverIndex, 0, draggedItem);
      onReorder(newHistory);
    }
    dragItem.current = null;
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const getIcon = (item: Creation) => {
    if (item.type === 'video') {
        return <VideoCameraIcon className="w-4 h-4 text-zinc-400" />;
    }
    // Logic for app type
    const isPdf = item.originalImage?.startsWith('data:application/pdf');
    if (isPdf) return <DocumentIcon className="w-4 h-4 text-zinc-400" />;
    if (item.originalImage) return <PhotoIcon className="w-4 h-4 text-zinc-400" />;
    return <CodeBracketIcon className="w-4 h-4 text-zinc-400" />;
  }

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex items-center space-x-3 mb-3 px-2">
        <ClockIcon className="w-4 h-4 text-zinc-500" />
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Archive</h2>
        <div className="h-px flex-1 bg-zinc-800"></div>
      </div>
      
      <div className="flex overflow-x-auto space-x-4 pb-2 px-2 scrollbar-hide">
        {history.map((item, index) => {
          const isActive = activeCreationId === item.id;
          return (
            <div key={item.id} className="relative">
              <button
                onClick={() => onSelect(item)}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnter={() => handleDragEnter(index)}
                onDragLeave={handleDragLeave}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className={`
                  group flex-shrink-0 relative flex flex-col text-left w-44 h-28 
                  bg-zinc-900/50 rounded-lg transition-all duration-200 overflow-hidden cursor-move 
                  ${draggedIndex === index ? 'opacity-30' : ''}
                  ${isActive 
                      ? 'border-blue-500 ring-2 ring-blue-500/30' 
                      : 'border-zinc-800 hover:bg-zinc-800 hover:border-zinc-600'
                  }
                `}
              >
                <div className="p-4 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-2">
                    <div className="p-1.5 bg-zinc-800 rounded group-hover:bg-zinc-700 transition-colors border border-zinc-700/50">
                        {getIcon(item)}
                    </div>
                    <span className="text-[10px] font-mono text-zinc-600 group-hover:text-zinc-400">
                      {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <div className="mt-auto">
                    <h3 className="text-sm font-medium text-zinc-300 group-hover:text-white truncate" title={item.name}>
                      {item.name}
                    </h3>
                    <div className="flex items-center space-x-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] text-blue-400">Restore</span>
                      <ArrowRightIcon className="w-3 h-3 text-blue-400" />
                    </div>
                  </div>
                </div>
              </button>
              {dragOverIndex === index && (
                  <div className="absolute top-0 bottom-0 -left-2 w-1 bg-blue-500 rounded-full" />
              )}
            </div>
          );
        })}
      </div>
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};