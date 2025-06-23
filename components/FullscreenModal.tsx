
import React, { useState, useEffect, useRef } from 'react'; 
import { FullscreenImage, ImageHistoryItem, HistoryActionType } from '../types';
import classNames from 'classnames';
import SharedZoomControls from './SharedZoomControls'; 

// Icon definitions remain
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828zM5 12V7.828l5-5H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2.172l-5 5H5z" />
  </svg>
);
const AnimateIconModal = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M2.973 3.42A1.5 1.5 0 002 4.831v10.338a1.5 1.5 0 002.249 1.306l8.098-5.169a1.5 1.5 0 000-2.612L4.25 3.524A1.5 1.5 0 002.973 3.42zM14 5a1 1 0 00-1 1v8a1 1 0 102 0V6a1 1 0 00-1-1zm3 0a1 1 0 00-1 1v8a1 1 0 102 0V6a1 1 0 00-1-1z" />
  </svg>
);
const MusicNoteIconModal = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.017 4.017 0 005 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7.82l8-1.6v5.894A4.017 4.017 0 0015 12c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V4a1 1 0 00-1-1z" />
    </svg>
);

const ControlButton: React.FC<{
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  title: string;
  label: string;
  children: React.ReactNode; 
  className?: string;
  disabled?: boolean;
}> = ({ onClick, title, label, children, className = "bg-gray-700/80 hover:bg-gray-600/90", disabled = false }) => (
  <button
    onClick={onClick}
    title={title}
    aria-label={label}
    disabled={disabled}
    className={`p-2.5 rounded-md text-white transition-colors duration-150 ease-in-out text-xs flex flex-col items-center justify-center min-h-[56px] text-center ${className} disabled:opacity-50 disabled:cursor-not-allowed`}
  >
    {children}
    <span className="mt-0.5 text-[10px] leading-tight">{title}</span>
  </button>
);

interface FullscreenModalProps {
  image: FullscreenImage | null;
  onClose: () => void;
  onAction: (action: HistoryActionType, item: ImageHistoryItem) => void;
  isGeneratingVideo?: boolean;
  isGeneratingAudio?: boolean;
}

const FullscreenModal: React.FC<FullscreenModalProps> = ({ image, onClose, onAction, isGeneratingVideo, isGeneratingAudio }) => {
  const [modalZoomLevel, setModalZoomLevel] = useState<number>(1);
  const [modalIsFitToScreen, setModalIsFitToScreen] = useState<boolean>(true);

  useEffect(() => {
    setModalZoomLevel(1);
    setModalIsFitToScreen(true);
  }, [image]);

  if (!image) return null;

  const handleActionClick = (actionType: HistoryActionType) => {
    onAction(actionType, image);
    const isAsyncLoadingOperation = (actionType === 'animate_svd' && isGeneratingVideo) || (actionType === 'generate_soundscape' && isGeneratingAudio);
    if (actionType !== 'download' && actionType !== 'copy_prompt' && actionType !== 'fullscreen' && !isAsyncLoadingOperation) {
      // Intentionally not closing on async operations to keep modal state.
      // onClose(); // This was removed to keep the modal open for async operations.
    }
  };
  
  const downloadImageFromUrl = async (imageUrl: string, filename: string) => {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
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

  const handleDownloadClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const safeConcept = image.concept.replace(/[^a-z0-9_.-]/gi, '_').toLowerCase();
    const safeArtStyle = (image.artStyle || 'default').replace(/[^a-z0-9_.-]/gi, '_').toLowerCase();
    const safeAspectRatio = image.aspectRatio.replace(':','-');
    const timestampSuffix = new Date().toISOString().slice(11,19).replace(/:/g,''); 
    let filename = `etherscape_${safeConcept}_${safeArtStyle}_${safeAspectRatio}_${timestampSuffix}`;
    if (image.isUpscaled) filename += "_upscaled";
    filename += ".jpeg";
    
    if (image.imageUrl.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = image.imageUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else if (image.imageUrl.startsWith('http')) {
        await downloadImageFromUrl(image.imageUrl, filename);
    } else {
        console.error("Unsupported image URL format for download:", image.imageUrl);
        alert("Cannot download this image: unsupported format.");
    }
    onAction('download', image); 
  };

  const handleCopyPromptClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    handleActionClick('copy_prompt'); 
  };

  const handleModalZoomChange = (newLevel: number) => {
    setModalZoomLevel(newLevel);
    if (modalIsFitToScreen) setModalIsFitToScreen(false);
  };

  const handleToggleModalFitActualWrapper = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const newFitState = !modalIsFitToScreen;
    setModalIsFitToScreen(newFitState);
    if (!newFitState) setModalZoomLevel(1); // Set to 100% when switching to actual size
    // else if slider is active, it will manage zoom level
  };

  const imagePanelContainerClasses = classNames(
    "relative flex-grow h-full flex flex-col bg-gray-900/50" // Changed to flex-col
  );

  const imageViewportClasses = classNames(
    "flex-grow w-full flex items-center justify-center p-2",
    (image.imageUrl && !modalIsFitToScreen)
      ? "overflow-auto scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-800/60"
      : "overflow-hidden"
  );

  const imgClasses = classNames(
    "rounded-md shadow-2xl transition-transform duration-150 ease-in-out",
    {
      'max-w-full max-h-full object-contain': modalIsFitToScreen || !image.imageUrl,
    }
  );
  const imgStyle: React.CSSProperties = (image.imageUrl && !modalIsFitToScreen)
    ? { transform: `scale(${modalZoomLevel})`, transformOrigin: 'center', width: 'auto', height: 'auto', maxWidth:'none', maxHeight:'none' }
    : {};

  const isAnyMultimediaLoading = isGeneratingVideo || isGeneratingAudio;

  return (
    <div
      className="fixed inset-0 bg-black/90 flex flex-row z-50 p-1"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="fullscreen-image-concept"
      aria-describedby="fullscreen-image-prompt"
    >
      {/* Left Panel: Image Display */}
      <div
        className={imagePanelContainerClasses}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Zoom Controls Area for Fullscreen Modal Image */}
        <div className="p-1.5">
            <SharedZoomControls
                zoomLevel={modalZoomLevel}
                onZoomChange={handleModalZoomChange}
                onToggleFitActual={handleToggleModalFitActualWrapper}
                isFitToScreen={modalIsFitToScreen}
                disabled={!image.imageUrl}
            />
        </div>
        <div className={imageViewportClasses} >
            <img
              src={image.imageUrl}
              alt={image.prompt}
              className={imgClasses}
              style={imgStyle}
            />
        </div>
      </div>

      {/* Right Panel: Info and Actions */}
      <div
        className="w-[300px] flex-shrink-0 h-full bg-gray-800/90 backdrop-blur-md flex flex-col p-3 space-y-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700/50 shadow-xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
            onClick={onClose}
            className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-white bg-gray-700/50 hover:bg-gray-600/70 rounded-full z-10"
            aria-label="Close"
            title="Close"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>

        <div className="space-y-1 text-sm pt-6">
          <h3 id="fullscreen-image-concept" className="text-base font-semibold text-gray-100 break-words">
            {image.concept} {image.isUpscaled && <span className="text-xs text-blue-300">(Upscaled)</span>}
          </h3>
          {image.artStyle && image.artStyle !== "Default (AI Decides)" && (
            <p className="text-xs text-gray-300">Style: <span className="text-gray-200">{image.artStyle}</span></p>
          )}
          <p className="text-xs text-gray-300">Aspect Ratio: <span className="text-gray-200">{image.aspectRatio}</span></p>
          {image.provider && <p className="text-xs text-gray-300">Provider: <span className="text-gray-200">{image.provider}</span></p>}
          {image.modelDisplayName && (
            <p className="text-xs text-gray-300">Model: <span className="text-gray-200">{image.modelDisplayName}</span></p>
          )}
           {image.negativePrompt && (
            <p className="text-xs text-gray-300">Negative: <span className="text-gray-200 break-words">{image.negativePrompt}</span></p>
          )}
          {image.cfgScale !== undefined && <p className="text-xs text-gray-300">CFG Scale: <span className="text-gray-200">{image.cfgScale.toFixed(1)}</span></p>}
          {image.steps !== undefined && <p className="text-xs text-gray-300">Steps: <span className="text-gray-200">{image.steps}</span></p>}
          {image.seed !== undefined && (
             <p className="text-xs text-gray-300">Seed: <span className="text-gray-200">{image.seed}</span></p>
          )}
           {image.sampler && <p className="text-xs text-gray-300">Sampler: <span className="text-gray-200">{image.sampler}</span></p>}
          {image.stylePreset && <p className="text-xs text-gray-300">Style Preset: <span className="text-gray-200">{image.stylePreset}</span></p>}
          {image.leonardoPresetStyle && image.leonardoPresetStyle !== "NONE" && <p className="text-xs text-gray-300">Leonardo Preset: <span className="text-gray-200">{image.leonardoPresetStyle}</span></p>}
          {image.useAlchemy !== undefined && <p className="text-xs text-gray-300">Alchemy: <span className="text-gray-200">{image.useAlchemy ? 'On' : 'Off'}</span></p>}
          {image.usePhotoReal !== undefined && <p className="text-xs text-gray-300">PhotoReal: <span className="text-gray-200">{image.usePhotoReal ? 'On' : 'Off'}</span></p>}
          <p id="fullscreen-image-prompt" className="text-xs italic pt-1 text-gray-200 max-h-28 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-700/50 border-t border-gray-700 mt-1.5 break-words">
            {image.prompt}
          </p>
        </div>
        
        <div className="grid grid-cols-3 gap-1.5 mt-auto pt-2 border-t border-gray-700">
          <ControlButton onClick={(e) => {e.stopPropagation(); handleActionClick('edit');}} title="Edit" label="Open image editor"><EditIcon /></ControlButton>
          <ControlButton onClick={(e) => {e.stopPropagation(); handleActionClick('animate_svd');}} title="Animate" label="Animate with Fal.ai SVD" disabled={isAnyMultimediaLoading}><AnimateIconModal /></ControlButton>
          <ControlButton onClick={(e) => {e.stopPropagation(); handleActionClick('generate_soundscape');}} title="Soundscape" label="Generate soundscape with Fal.ai AudioGen" disabled={isAnyMultimediaLoading}><MusicNoteIconModal /></ControlButton>
          <ControlButton onClick={(e) => {e.stopPropagation(); handleActionClick('regenerate');}} title="Regenerate" label="Re-generate image"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m-15.357-2a8.001 8.001 0 0015.357 2M9 15h4.581" /></svg></ControlButton>
          <ControlButton onClick={(e) => {e.stopPropagation(); handleActionClick('enhance');}} title="Enhance" label="Enhance image details"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 2a1 1 0 00-1 1v1H2.5A1.5 1.5 0 001 5.5V14a2 2 0 002 2h14a2 2 0 002-2V5.5A1.5 1.5 0 0017.5 4H16V3a1 1 0 00-1-1H5zm0 2h10V3H5v1zm10.5 2H4.5A.5.5 0 004 6.5V14a1 1 0 001 1h10a1 1 0 001-1V6.5a.5.5 0 00-.5-.5zM10 12a1 1 0 100-2 1 1 0 000 2zM6 8a.5.5 0 01.5-.5h2a.5.5 0 010 1h-2A.5.5 0 016 8zm0 2a.5.5 0 01.5-.5h2a.5.5 0 010 1h-2a.5.5 0 01-.5-.5zm5 .5a.5.5 0 000-1h-2a.5.5 0 000 1h2z" clipRule="evenodd" /></svg></ControlButton>
          <ControlButton onClick={(e) => {e.stopPropagation(); handleActionClick('use_concept');}} title="Use Settings" label="Set these settings as current"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></ControlButton>
          <ControlButton onClick={(e) => {e.stopPropagation(); handleActionClick('branch');}} title="Branch" label="Use these settings as a new starting point"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 00-1 1v2.586l-1.293-1.293a1 1 0 10-1.414 1.414L8.586 9H6a1 1 0 000 2h2.586l-2.293 2.293a1 1 0 101.414 1.414L10 12.414V17a1 1 0 102 0v-4.586l2.293 2.293a1 1 0 101.414-1.414L11.414 11H14a1 1 0 100-2h-2.586l2.293-2.293a1 1 0 00-1.414-1.414L10 5.586V3a1 1 0 00-1-1z" clipRule="evenodd" /></svg></ControlButton>
          <ControlButton onClick={handleDownloadClick} title="Download" label="Download this image"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></ControlButton>
          <ControlButton onClick={handleCopyPromptClick} title="Copy Prompt" label="Copy image prompt"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></ControlButton>
          <ControlButton onClick={(e) => {e.stopPropagation(); handleActionClick('delete');}} title="Delete" label="Delete this image from local history" className="bg-red-700/80 hover:bg-red-600/90"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></ControlButton>
        </div>
      </div>
       <style>{`
        .scrollbar-thin {
          scrollbar-width: thin;
          scrollbar-color: #4A5568 #374151;
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: #374151;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background-color: #4A5568;
          border-radius: 20px;
          border: 2px solid #374151;
        }
      `}</style>
    </div>
  );
};

export default FullscreenModal;
