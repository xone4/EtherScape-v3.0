import React from 'react';

interface VideoDisplayModalProps {
  videoUrl: string;
  onClose: () => void;
  title?: string;
}

const VideoDisplayModal: React.FC<VideoDisplayModalProps> = ({ 
  videoUrl, 
  onClose, 
  title = "Generated Animation" 
}) => {
  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4"
      onClick={onClose} // Close when clicking backdrop
      role="dialog"
      aria-modal="true"
      aria-labelledby="video-modal-title"
    >
      <div
        className="bg-gray-800 p-4 sm:p-6 rounded-lg shadow-2xl w-full max-w-xl md:max-w-2xl lg:max-w-3xl flex flex-col items-center space-y-4 max-h-[90vh]"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal content
      >
        <div className="flex items-center justify-between w-full">
            <h2 id="video-modal-title" className="text-lg sm:text-xl font-semibold text-gray-200">
            {title}
            </h2>
            <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700 transition-colors"
                aria-label="Close video player"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
        
        <div className="w-full aspect-video bg-black rounded-md overflow-hidden border border-gray-700">
          <video
            src={videoUrl}
            controls
            autoPlay
            loop
            playsInline
            className="w-full h-full object-contain"
            aria-label="Video playback of generated animation"
          />
        </div>
        <button
            onClick={onClose}
            className="mt-2 px-5 py-2 sm:py-2.5 bg-gray-600 hover:bg-gray-500 text-white font-medium rounded-md self-center text-sm"
            aria-label="Close video player"
        >
            Close
        </button>
      </div>
    </div>
  );
};

export default VideoDisplayModal;
