
import React, { useState, useRef, useEffect, useCallback } from 'react';
// import { default as classNames } from 'classnames'; // classNames not used, commented out

interface AudioPlayerProps {
  src: string | null;
  title?: string;
  onClose: () => void;
  isVisible: boolean;
}

const formatTime = (timeInSeconds: number): string => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, title, onClose, isVisible }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isSeeking, setIsSeeking] = useState(false);

  useEffect(() => {
    if (src && audioRef.current) {
      audioRef.current.src = src;
      audioRef.current.load(); // Important to load new src
      // Reset states for new audio
      setIsPlaying(false); 
      setCurrentTime(0);
      setDuration(0);
    }
  }, [src]);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(error => console.error("Error playing audio:", error));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && !isSeeking) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(event.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const newTime = parseFloat(event.target.value);
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime); // Update UI immediately during seek
    }
  };
  
  const handleSeekMouseDown = () => setIsSeeking(true);
  const handleSeekMouseUp = () => setIsSeeking(false);


  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0); 
    if(audioRef.current) audioRef.current.currentTime = 0;
  };

  if (!isVisible || !src) {
    return null;
  }

  return (
    <div 
      className="fixed bottom-4 right-4 w-full max-w-xs bg-gray-700/90 backdrop-blur-md text-white rounded-lg shadow-2xl p-3 z-[150] border border-gray-600"
      role="region"
      aria-label="Audio Player"
    >
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata" // Important for duration
      />
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold truncate" title={title || "Audio Player"}>
          {title || "Audio Player"}
        </h3>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-white rounded-full hover:bg-gray-600 transition-colors"
          aria-label="Close Audio Player"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex items-center space-x-2 mb-2">
        <button
          onClick={handlePlayPause}
          className="p-2 bg-gray-600 hover:bg-gray-500 rounded-full transition-colors"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 00-1 1v2a1 1 0 102 0V9a1 1 0 00-1-1zm7 0a1 1 0 00-1 1v2a1 1 0 102 0V9a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          )}
        </button>
        <div className="flex-grow">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            onMouseDown={handleSeekMouseDown}
            onMouseUp={handleSeekMouseUp}
            onTouchStart={handleSeekMouseDown}
            onTouchEnd={handleSeekMouseUp}
            className="w-full h-1.5 bg-gray-500 rounded-lg appearance-none cursor-pointer accent-teal-500"
            aria-label="Seek audio progress"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-0.5 px-0.5">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={handleVolumeChange}
          className="w-full h-1.5 bg-gray-500 rounded-lg appearance-none cursor-pointer accent-teal-500"
          aria-label="Volume control"
        />
      </div>
    </div>
  );
};

export default AudioPlayer;
