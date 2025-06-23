
import React, { useState, useEffect, useRef } from 'react'; 
import classNames from 'classnames';
import SharedZoomControls from './SharedZoomControls'; 

interface ImageDisplayProps {
  imageUrl: string | null;
  prompt: string;
  concept: string;
  isLoading: boolean;
  loadingMessageOverride?: string;
  providerDisplayName?: string;
  modelDisplayName?: string;
  zoomLevel: number;
  isFitToScreen: boolean;
  onZoomChange: (newLevel: number) => void; 
  onToggleFitActual: () => void; 
}

const ImageDisplay: React.FC<ImageDisplayProps> = ({
  imageUrl,
  prompt,
  concept,
  isLoading,
  loadingMessageOverride,
  providerDisplayName,
  modelDisplayName,
  zoomLevel,
  isFitToScreen,
  onZoomChange, 
  onToggleFitActual
}) => {

  let loadingMessage = loadingMessageOverride || 'Generating Etherscape...';
  if (!loadingMessageOverride) {
    if (providerDisplayName && modelDisplayName) {
      loadingMessage = `Generating with ${providerDisplayName} (${modelDisplayName})...`;
    } else if (providerDisplayName) {
      loadingMessage = `Generating with ${providerDisplayName}...`;
    }
  }

  const containerClasses = classNames(
    "w-full h-full flex flex-col relative rounded-lg shadow-xl bg-gray-800/30" // Changed to flex-col
  );
  
  const imageViewportClasses = classNames(
    "flex-grow w-full flex items-center justify-center p-1 relative",
    (imageUrl && !isFitToScreen)
      ? "overflow-auto scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-800/60 bg-gray-800/50"
      : "overflow-hidden bg-black/30"
  );

  const imgClasses = classNames(
    "animate-fadeIn rounded-md shadow-2xl transition-transform duration-150 ease-in-out",
    {
      'max-w-full max-h-full object-contain': isFitToScreen || !imageUrl,
    }
  );

  const imgStyle: React.CSSProperties = (imageUrl && !isFitToScreen)
    ? { transform: `scale(${zoomLevel})`, transformOrigin: 'center', width: 'auto', height: 'auto', maxWidth:'none', maxHeight:'none' }
    : {};
  
  const handleToggleFitActualWrapper = (e: React.MouseEvent<HTMLButtonElement>) => { 
    e.stopPropagation(); 
    onToggleFitActual(); 
  };

  return (
    <div className={containerClasses}>
      {/* Zoom Controls Area */}
      <div className="p-1.5 sticky top-0 z-10"> 
        <SharedZoomControls
          zoomLevel={zoomLevel}
          onZoomChange={onZoomChange}
          onToggleFitActual={handleToggleFitActualWrapper}
          isFitToScreen={isFitToScreen}
          disabled={!imageUrl || isLoading}
        />
      </div>

      {/* Image Viewport */}
      <div className={imageViewportClasses}>
        {imageUrl && (
          <img
            key={imageUrl}
            src={imageUrl}
            alt={prompt || concept || "Generated abstract art"}
            className={imgClasses}
            style={imgStyle}
          />
        )}

        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 bg-opacity-80 z-10">
            <div className="w-16 h-16 border-4 border-t-transparent border-blue-500 rounded-full animate-spin"></div>
            <p className="mt-4 text-lg text-gray-300 text-center px-2">
              {loadingMessage}
            </p>
          </div>
        )}

        {!imageUrl && !isLoading && (
          <div className="text-center text-gray-400 p-5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 md:h-24 md:w-24 mx-auto mb-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-lg md:text-xl">Welcome to Etherscape!</p>
            <p className="text-sm md:text-base text-gray-500 mt-1">Open controls, enter a theme, and press Start to begin.</p>
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default ImageDisplay;
