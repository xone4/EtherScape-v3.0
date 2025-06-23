
import React from 'react';
import classNames from 'classnames';

// Define Icon components directly here
const FitScreenIcon = () => (
 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 1v4m0 0h-4m4 0l-5-5" />
  </svg>
);

const ActualSizeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
    <rect x="3" y="3" width="14" height="14" rx="1" stroke="currentColor" fill="none" strokeWidth="1.5" />
    <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fontSize="6px" fontWeight="bold" fill="currentColor">1:1</text>
  </svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
  </svg>
);

const MinusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
  </svg>
);


const SharedZoomButton: React.FC<{ title: string; onClick: (e: React.MouseEvent<HTMLButtonElement>) => void; disabled: boolean; children: React.ReactNode }> = ({ title, onClick, disabled, children }) => (
  <button
    title={title}
    onClick={onClick}
    disabled={disabled}
    className="p-1 text-white bg-gray-700/70 hover:bg-gray-600/90 rounded-md disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
    aria-label={title}
  >
    {children}
  </button>
);

interface SharedZoomControlsProps {
  zoomLevel: number;
  onZoomChange: (newLevel: number) => void;
  onToggleFitActual: (e: React.MouseEvent<HTMLButtonElement>) => void;
  isFitToScreen: boolean;
  disabled?: boolean; 
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;
const ZOOM_STEP = 0.1;

const SharedZoomControls: React.FC<SharedZoomControlsProps> = ({
  zoomLevel,
  onZoomChange,
  onToggleFitActual,
  isFitToScreen,
  disabled = false,
}) => {
  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onZoomChange(parseFloat(event.target.value));
  };

  const handleZoomIncrement = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const newZoomLevel = Math.min(MAX_ZOOM, zoomLevel + ZOOM_STEP);
    onZoomChange(newZoomLevel);
  };

  const handleZoomDecrement = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const newZoomLevel = Math.max(MIN_ZOOM, zoomLevel - ZOOM_STEP);
    onZoomChange(newZoomLevel);
  };

  return (
    <div
      className={classNames(
        "max-w-[300px] mx-auto flex items-center space-x-1.5 bg-gray-800/65 backdrop-blur-sm p-1 rounded-md shadow-md"
      )}
      role="toolbar"
      aria-label="Image zoom controls"
    >
      <SharedZoomButton
        title={isFitToScreen ? "Switch to Actual Size (100%)" : "Switch to Fit to Screen"}
        onClick={onToggleFitActual}
        disabled={disabled}
      >
        {isFitToScreen ? <ActualSizeIcon /> : <FitScreenIcon />}
      </SharedZoomButton>
      
      <SharedZoomButton
        title="Zoom Out"
        onClick={handleZoomDecrement}
        disabled={disabled || zoomLevel <= MIN_ZOOM || isFitToScreen}
      >
        <MinusIcon />
      </SharedZoomButton>

      <input
        type="range"
        min={MIN_ZOOM}
        max={MAX_ZOOM}
        step="0.05"
        value={isFitToScreen ? 1 : zoomLevel} 
        onChange={handleSliderChange}
        disabled={disabled || isFitToScreen}
        className={classNames(
            "flex-grow h-1.5 rounded-lg appearance-none cursor-pointer",
            "focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-offset-gray-800 focus:ring-blue-400",
            isFitToScreen || disabled ? "bg-gray-500 opacity-60" : "bg-gray-500 accent-blue-500 hover:accent-blue-400"
        )}
        aria-label="Zoom level slider"
      />

      <SharedZoomButton
        title="Zoom In"
        onClick={handleZoomIncrement}
        disabled={disabled || zoomLevel >= MAX_ZOOM || isFitToScreen}
      >
        <PlusIcon />
      </SharedZoomButton>

      <span className="text-xs text-gray-300 w-12 text-center tabular-nums">
        {isFitToScreen ? "Fit" : `${Math.round(zoomLevel * 100)}%`}
      </span>
    </div>
  );
};

export default SharedZoomControls;
