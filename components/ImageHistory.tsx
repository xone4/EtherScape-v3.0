
import React, { useState } from 'react';
import { ImageHistoryItem, HistoryActionType, MAX_COMPARE_ITEMS, MediaType, ImageProviderId } from '../types';
import { default as classNames } from 'classnames';

import GeminiIcon from '../assets/gemini.svg';
import StabilityAIIcon from '../assets/stability_ai.svg';
import LeonardoAIIcon from '../assets/leonardo_ai.svg';
import ClipdropIcon from '../assets/clipdrop.svg';
import ReplicateIcon from '../assets/replicate.svg';
import FalAIIcon from '../assets/fal_ai.svg';

const providerIcons: Record<ImageProviderId, string> = {
    'gemini': GeminiIcon,
    'stability_ai': StabilityAIIcon,
    'leonardo_ai': LeonardoAIIcon,
    'clipdrop': ClipdropIcon,
    'replicate': ReplicateIcon,
    'fal_ai': FalAIIcon,
};

const getProviderIcon = (providerId?: ImageProviderId) => {
    if (!providerId) return null;
    return providerIcons[providerId] || null;
};


import Skeleton from './Skeleton';

interface ImageHistoryProps {
  history: ImageHistoryItem[];
  onSelectItemAction: (action: HistoryActionType, item: ImageHistoryItem) => void;
  isVisible: boolean;
  isCompareModeActive: boolean;
  selectedItemIdsForCompare: string[];
  onToggleCompareMode: () => void;
  onToggleItemForCompare: (itemId: string) => void;
  onStartComparison: () => void;
  onClearCompareSelection: () => void;
  isGenerating: boolean;
  isGeneratingVideo?: boolean; 
  isGeneratingAudio?: boolean;
  onCloseDrawer: () => void;
}

type HistoryTabType = 'all' | MediaType;


const ActionButton: React.FC<{ onClick: (e: React.MouseEvent<HTMLButtonElement>) => void; label: string; title: string; children: React.ReactNode; className?: string; disabled?: boolean }> = 
  ({ onClick, label, title, children, className = "bg-gray-600 hover:bg-gray-500", disabled = false }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClick(e); }}
    aria-label={label}
    title={title}
    disabled={disabled}
    className={`p-1.5 rounded-full text-white ${className} transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
  >
    {children}
  </button>
);

const CompareModeButton: React.FC<{ onClick: () => void; children: React.ReactNode; title: string, disabled?: boolean, isActive?: boolean }> = ({ onClick, children, title, disabled, isActive }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        aria-pressed={isActive}
        className={classNames(
            "px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center shadow-sm",
            isActive ? "bg-blue-600 hover:bg-blue-500 text-white" : "bg-gray-600 hover:bg-gray-500 text-gray-200",
            disabled ? "opacity-60 cursor-not-allowed" : ""
        )}
    >
        {children}
    </button>
);

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode; count: number }> = ({ active, onClick, children, count }) => (
  <button
    onClick={onClick}
    className={`px-2.5 py-1.5 text-xs sm:text-sm font-medium transition-colors rounded-t-md whitespace-nowrap
                ${active ? 'bg-gray-700 text-white border-b-2 border-blue-500' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'}`}
    aria-pressed={active}
  >
    {children} {count > 0 && <span className={`ml-1 text-xs px-1 py-0.5 rounded-full ${active ? 'bg-blue-500/30 text-blue-200' : 'bg-gray-600 text-gray-300'}`}>{count}</span>}
  </button>
);


const AnimateIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
    <path d="M2.973 3.42A1.5 1.5 0 002 4.831v10.338a1.5 1.5 0 002.249 1.306l8.098-5.169a1.5 1.5 0 000-2.612L4.25 3.524A1.5 1.5 0 002.973 3.42zM14 5a1 1 0 00-1 1v8a1 1 0 102 0V6a1 1 0 00-1-1zm3 0a1 1 0 00-1 1v8a1 1 0 102 0V6a1 1 0 00-1-1z" />
  </svg>
);

const MusicNoteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.017 4.017 0 005 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7.82l8-1.6v5.894A4.017 4.017 0 0015 12c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V4a1 1 0 00-1-1z" />
    </svg>
);

const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
  </svg>
);


const ImageHistory: React.FC<ImageHistoryProps> = ({ 
    history, 
    onSelectItemAction, 
    isVisible,
    isCompareModeActive,
    selectedItemIdsForCompare,
    onToggleCompareMode,
    onToggleItemForCompare,
    onStartComparison,
    onClearCompareSelection,
    isGenerating,
    isGeneratingVideo,
    isGeneratingAudio,
    onCloseDrawer
}) => {
  const [activeTab, setActiveTab] = useState<HistoryTabType>('all');
  
  const downloadImageFromUrl = async (imageUrl: string, filename: string) => {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error("Error downloading image from URL:", error);
      alert(`Download failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleDownloadClick = async (e: React.MouseEvent<HTMLButtonElement>, item: ImageHistoryItem) => {
    e.stopPropagation(); 
    const safeConcept = item.concept.replace(/[^a-z0-9_.-]/gi, '_').toLowerCase();
    const safeArtStyle = (item.artStyle || 'default').replace(/[^a-z0-9_.-]/gi, '_').toLowerCase();
    const safeAspectRatio = item.aspectRatio.replace(':','-');
    const timestampSuffix = new Date().toISOString().slice(11,19).replace(/:/g,''); 
    const extension = item.mediaType === 'video' ? 'mp4' : item.mediaType === 'audio' ? 'mp3' : 'jpeg';
    const filename = `etherscape_${safeConcept}_${safeArtStyle}_${safeAspectRatio}_${timestampSuffix}.${extension}`;

    if (item.imageUrl.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = item.imageUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (item.imageUrl.startsWith('http')) {
      await downloadImageFromUrl(item.imageUrl, filename);
    } else {
      console.error("Unsupported image URL format for download:", item.imageUrl);
      alert("Cannot download this image: unsupported format.");
    }
    onSelectItemAction('download', item); 
  };
  
  const handleItemClick = (item: ImageHistoryItem) => {
    if (isCompareModeActive) {
        if (item.mediaType === 'image' || !item.mediaType) { // Only allow images for comparison
            onToggleItemForCompare(item.id);
        } else {
            // Optionally show a toast message: "Only images can be compared."
        }
    } else {
      onSelectItemAction('fullscreen', item); // This will handle different media types
    }
  };
  
  const filteredHistory = history.filter(item => {
    if (activeTab === 'all') return true;
    if (activeTab === 'image') return item.mediaType === 'image' || !item.mediaType; // Backward compatibility
    return item.mediaType === activeTab;
  });

  const counts = {
    all: history.length,
    image: history.filter(item => item.mediaType === 'image' || !item.mediaType).length,
    video: history.filter(item => item.mediaType === 'video').length,
    audio: history.filter(item => item.mediaType === 'audio').length,
  };


  if (!isVisible) {
    return null;
  }

  const canSelectMore = selectedItemIdsForCompare.length < MAX_COMPARE_ITEMS;

  return (
    <div className={`w-full px-1 py-1 flex flex-col h-full ${isVisible ? 'block' : 'hidden'}`}>
        <div className="flex items-center justify-between mb-2 px-1 pt-1.5">
            <h2 className="text-lg font-semibold text-gray-300">History</h2>
            <div className="flex items-center space-x-2">
                <CompareModeButton onClick={onToggleCompareMode} title={isCompareModeActive ? "Exit Compare Mode" : "Enter Compare Mode"} isActive={isCompareModeActive}>
                    {isCompareModeActive ? "Exit Compare" : "Compare Images"}
                </CompareModeButton>
                <button onClick={onCloseDrawer} className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-gray-700/60" aria-label="Close History">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        </div>

        {isCompareModeActive && (
            <div className="flex space-x-2 mb-2 px-1">
                <CompareModeButton onClick={onClearCompareSelection} title="Clear Selection" disabled={selectedItemIdsForCompare.length === 0}>
                    Clear ({selectedItemIdsForCompare.length})
                </CompareModeButton>
                <CompareModeButton onClick={onStartComparison} title="Compare Selected Items" disabled={selectedItemIdsForCompare.length < 2} isActive={selectedItemIdsForCompare.length >= 2}>
                    Start Compare ({selectedItemIdsForCompare.length})
                </CompareModeButton>
            </div>
        )}

        <div className="flex border-b border-gray-700 px-1">
            {(['all', 'image', 'video', 'audio'] as HistoryTabType[]).map(tab => (
                <TabButton key={tab} active={activeTab === tab} onClick={() => setActiveTab(tab)} count={counts[tab]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </TabButton>
            ))}
        </div>


      {filteredHistory.length === 0 ? (
        <div className="flex flex-grow items-center justify-center">
            <p className="text-gray-400 text-sm p-4">No {activeTab !== 'all' ? activeTab : ''} items in history yet.</p>
        </div>
      ) : (
        <div className="flex overflow-x-auto space-x-3 p-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 flex-grow">
            {isGenerating && activeTab === 'all' && (
                <>
                    <Skeleton className="w-48 h-48 flex-none" />
                    <Skeleton className="w-48 h-48 flex-none" />
                </>
            )}
            {filteredHistory.map((item) => {
            const itemMediaType = item.mediaType || 'image';
            const isSelectedForCompare = isCompareModeActive && selectedItemIdsForCompare.includes(item.id);
            // Only images can be selected for comparison
            const canBeSelectedForCompare = isCompareModeActive && itemMediaType === 'image' && (canSelectMore || isSelectedForCompare);
            
            const isAnyMultimediaLoading = isGeneratingVideo || isGeneratingAudio;

            return (
            <div 
                key={item.id} 
                className={classNames(
                    "group relative flex-none w-48 h-auto bg-gray-700/80 p-1.5 rounded-lg shadow-md hover:shadow-xl transition-all duration-150 ease-in-out backdrop-blur-sm",
                    (isCompareModeActive && itemMediaType === 'image') ? "cursor-pointer" : "cursor-pointer",
                    isSelectedForCompare ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800" : "ring-1 ring-gray-600",
                    (isCompareModeActive && itemMediaType === 'image' && !canBeSelectedForCompare && !isSelectedForCompare) ? "opacity-60 cursor-not-allowed" : ""
                )}
                onClick={() => (isCompareModeActive && itemMediaType === 'image' && !canBeSelectedForCompare && !isSelectedForCompare) ? null : handleItemClick(item)}
                role="button"
                tabIndex={0}
                aria-label={`History item: ${item.concept}, Type: ${itemMediaType}. ${isCompareModeActive && itemMediaType === 'image' ? (isSelectedForCompare ? 'Selected for compare. Click to deselect.' : (canBeSelectedForCompare ? 'Click to select for compare.' : 'Cannot select, limit reached.')) : 'Click to view.'}`}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleItemClick(item);}}
            >
                {itemMediaType === 'image' ? (
                    <div className="relative">
                        <img src={item.imageUrl} alt={item.prompt || 'Generated art'} className="w-full h-28 object-cover rounded-md mb-1.5" loading="lazy"/>
                        {getProviderIcon(item.provider) && (
                            <img src={getProviderIcon(item.provider)!} alt={`${item.provider} logo`} className="absolute top-1 left-1 w-4 h-4 rounded-full bg-gray-900 p-0.5" />
                        )}
                    </div>
                ) : itemMediaType === 'video' ? (
                    <div className="w-full h-28 rounded-md mb-1.5 bg-black flex items-center justify-center text-gray-400 text-xs relative">
                       <PlayIcon /> Video: {item.concept.substring(0,15)}...
                       <span className="absolute bottom-1 right-1 text-[9px] bg-black/50 px-1 rounded">Video</span>
                    </div>
                ) : ( // audio
                    <div className="w-full h-28 rounded-md mb-1.5 bg-gray-800 flex items-center justify-center text-gray-400 text-xs relative">
                        <MusicNoteIcon /> Audio: {item.concept.substring(0,15)}...
                        <span className="absolute bottom-1 right-1 text-[9px] bg-black/50 px-1 rounded">Audio</span>
                    </div>
                )}
                <div className="px-1">
                <p className="text-xs text-gray-300 truncate" title={item.concept}>{item.concept}</p>
                {item.artStyle && item.artStyle !== "Default (AI Decides)" && itemMediaType === 'image' && (
                    <p className="text-[10px] text-gray-400 truncate mt-0.5" title={`Art Style: ${item.artStyle}`}>{item.artStyle}</p>
                )}
                {(itemMediaType === 'image' || itemMediaType === 'video') && (
                    <p className="text-[10px] text-gray-400 truncate mt-0.5" title={`Aspect Ratio: ${item.aspectRatio}`}>AR: {item.aspectRatio}</p>
                )}
                {item.modelDisplayName && (
                    <p className="text-[10px] text-gray-400 truncate mt-0.5" title={`Model: ${item.modelDisplayName}`}>Model: {item.modelDisplayName}</p>
                )}
                {item.seed !== undefined && itemMediaType === 'image' && (
                    <p className="text-[10px] text-gray-400 truncate mt-0.5" title={`Seed: ${item.seed}`}>Seed: {item.seed}</p>
                )}
                <p className="text-[11px] text-gray-300 truncate mt-0.5" title={item.prompt}>{item.prompt}</p>
                </div>
                
                {!isCompareModeActive && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                    <div className="grid grid-cols-3 gap-1 p-2">
                        <ActionButton onClick={(e) => onSelectItemAction(itemMediaType === 'image' ? 'fullscreen' : 'play_media', item)} label={itemMediaType === 'image' ? "Fullscreen" : "Play"} title={itemMediaType === 'image' ? "Fullscreen" : "Play Media"}>
                          {itemMediaType === 'image' ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 1v4m0 0h-4m4 0l-5-5" /></svg> : <PlayIcon />}
                        </ActionButton>
                        {itemMediaType === 'image' && (
                          <>
                            <ActionButton onClick={(e) => onSelectItemAction('edit', item)} label="Edit Image" title="Edit Image in Drawer">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828zM5 12V7.828l5-5H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2.172l-5 5H5z" />
                                </svg>
                            </ActionButton>
                            <ActionButton onClick={(e) => onSelectItemAction('animate_svd', item)} label="Animate Image (SVD)" title="Animate with Fal.ai SVD" disabled={isAnyMultimediaLoading}>
                               <AnimateIcon />
                            </ActionButton>
                            <ActionButton onClick={(e) => onSelectItemAction('generate_soundscape', item)} label="Generate Soundscape (AudioGen)" title="Generate Soundscape with Fal.ai AudioGen" disabled={isAnyMultimediaLoading}>
                               <MusicNoteIcon />
                            </ActionButton>
                            <ActionButton onClick={(e) => onSelectItemAction('regenerate', item)} label="Re-generate" title="Re-generate (Remix)">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m-15.357-2a8.001 8.001 0 0015.357 2M9 15h4.581" /></svg>
                            </ActionButton>
                             <ActionButton onClick={(e) => onSelectItemAction('enhance', item)} label="Detail Enhance" title="Detail Enhance">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 2a1 1 0 00-1 1v1H2.5A1.5 1.5 0 001 5.5V14a2 2 0 002 2h14a2 2 0 002-2V5.5A1.5 1.5 0 0017.5 4H16V3a1 1 0 00-1-1H5zm0 2h10V3H5v1zm10.5 2H4.5A.5.5 0 004 6.5V14a1 1 0 001 1h10a1 1 0 001-1V6.5a.5.5 0 00-.5-.5zM10 12a1 1 0 100-2 1 1 0 000 2zM6 8a.5.5 0 01.5-.5h2a.5.5 0 010 1h-2A.5.5 0 016 8zm0 2a.5.5 0 01.5-.5h2a.5.5 0 010 1h-2a.5.5 0 01-.5-.5zm5 .5a.5.5 0 000-1h-2a.5.5 0 000 1h2z" clipRule="evenodd" /></svg>
                            </ActionButton>
                            <ActionButton onClick={(e) => onSelectItemAction('use_concept', item)} label="Use Settings" title="Use Concept, Style & Model">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                            </ActionButton>
                            <ActionButton onClick={(e) => onSelectItemAction('branch', item)} label="Branch from here" title="Branch: Use these settings as a new starting point">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 3a1 1 0 00-1 1v2.586l-1.293-1.293a1 1 0 10-1.414 1.414L8.586 9H6a1 1 0 000 2h2.586l-2.293 2.293a1 1 0 101.414 1.414L10 12.414V17a1 1 0 102 0v-4.586l2.293 2.293a1 1 0 101.414-1.414L11.414 11H14a1 1 0 100-2h-2.586l2.293-2.293a1 1 0 00-1.414-1.414L10 5.586V3a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </ActionButton>
                          </>
                        )}
                        <ActionButton onClick={(e) => handleDownloadClick(e, item)} label="Download Media" title="Download Media File">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        </ActionButton>
                         <ActionButton onClick={(e) => onSelectItemAction('delete', item)} label="Delete" title="Delete" className="bg-gray-600 hover:bg-gray-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </ActionButton>
                        <ActionButton onClick={(e) => onSelectItemAction('copy_prompt', item)} label="Copy Prompt" title="Copy Prompt Text" className="bg-gray-600 hover:bg-gray-500 col-start-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </ActionButton>
                    </div>
                    </div>
                )}
                 {isCompareModeActive && itemMediaType === 'image' && isSelectedForCompare && (
                    <div className="absolute top-1 right-1 p-0.5 bg-blue-500 rounded-full shadow-lg">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    </div>
                )}
            </div>
            );
        })}
        </div>
      )}
       <style>{`
        .scrollbar-thin {
          scrollbar-width: thin;
          scrollbar-color: #4A5568 #222731; 
        }
        .scrollbar-thin::-webkit-scrollbar {
          height: 8px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: #222731; 
          border-radius: 10px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background-color: #4A5568; 
          border-radius: 10px;
          border: 2px solid #222731; 
        }
      `}</style>
    </div>
  );
};

export default ImageHistory;
