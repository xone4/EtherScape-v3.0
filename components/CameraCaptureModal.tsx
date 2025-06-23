
import React, { useState, useRef, useEffect, useCallback } from 'react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64ImageData: string, mimeType: 'image/jpeg' | 'image/png') => void;
  onError: (errorMessage: string) => void;
}

const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({ isOpen, onClose, onCapture, onError }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: "environment", // Prefer back camera
                width: { ideal: 1280 },
                height: { ideal: 720 } 
            } 
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } else {
        throw new Error("Camera access (getUserMedia) is not supported by this browser.");
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      let message = "Could not access the camera. Please ensure permissions are granted.";
      if (err instanceof Error) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          message = "Camera permission denied. Please enable camera access in your browser settings for this site.";
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          message = "No camera found. Please ensure a camera is connected and enabled.";
        } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
            message = "Camera is already in use or cannot be read. Try closing other apps using the camera.";
        } else {
            message = `Camera error: ${err.message}`;
        }
      }
      setCameraError(message);
      onError(message);
    }
  }, [onError]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    // Cleanup on component unmount if modal was left open
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current && stream) {
      setIsCapturing(true);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video to avoid distortion
      const videoSettings = stream.getVideoTracks()[0].getSettings();
      canvas.width = videoSettings.width || video.videoWidth;
      canvas.height = videoSettings.height || video.videoHeight;

      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Using JPEG for smaller size, good for network transmission
        const mimeType = 'image/jpeg';
        const base64ImageData = canvas.toDataURL(mimeType, 0.85); // 0.85 quality
        const imageDataWithoutPrefix = base64ImageData.split(',')[1];

        onCapture(imageDataWithoutPrefix, mimeType);
        setIsCapturing(false);
        // onClose(); // Let App.tsx handle closing after processing
      } else {
        onError("Could not get canvas context for capture.");
        setIsCapturing(false);
      }
    } else {
        onError("Camera or canvas not ready for capture.");
        setIsCapturing(false);
    }
  };
  
  const handleModalClose = () => {
      stopCamera();
      onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div 
        className="fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4"
        onClick={handleModalClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="camera-capture-title"
    >
      <div 
        className="bg-gray-800 p-4 sm:p-6 rounded-lg shadow-2xl w-full max-w-lg md:max-w-xl lg:max-w-2xl flex flex-col items-center space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="camera-capture-title" className="text-xl font-semibold text-gray-200">Live Camera Query</h2>
        
        {cameraError && (
          <div className="p-3 bg-red-700/80 text-white rounded-md text-sm w-full">
            <p><strong>Camera Error:</strong> {cameraError}</p>
            <p className="mt-1 text-xs">Try granting permissions or checking your camera connection. You might need to refresh the page after changing browser settings.</p>
          </div>
        )}

        <div className="w-full aspect-video bg-gray-700 rounded-md overflow-hidden relative border border-gray-600">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover"
            aria-label="Live camera feed"
          />
          {!stream && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              Initializing Camera...
            </div>
          )}
        </div>
        <canvas ref={canvasRef} style={{ display: 'none' }} aria-hidden="true"></canvas>

        <p className="text-xs text-gray-400 text-center">
            Point your camera and capture an image. This image, along with your current theme, will be sent to Gemini for a creative textual response.
        </p>

        <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-3 w-full">
          <button
            onClick={handleCapture}
            disabled={!stream || !!cameraError || isCapturing}
            className="w-full sm:w-auto px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-md shadow-md transition-colors duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center text-sm"
          >
            {isCapturing ? (
                <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg>
                Capturing...
                </>
            ) : (
                <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm10.5 5.5a.5.5 0 000-1H14a.5.5 0 000 1h.5zm-1.5 0a.5.5 0 00-1 0V10a.5.5 0 00.5.5H14a.5.5 0 00.5-.5V6a.5.5 0 00-.5-.5h-1zm-3.75-1a.75.75 0 00-1.5 0V10a.75.75 0 001.5 0V5zM5 10a1 1 0 100-2 1 1 0 000 2zM6 5a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    <path d="M7 14a1 1 0 11-2 0 1 1 0 012 0zm3 0a1 1 0 11-2 0 1 1 0 012 0zm4-2.5a.5.5 0 00-1 0V14a.5.5 0 00.5.5h.5a.5.5 0 000-1h-.5v-2z" />
                </svg>
                Capture Image
                </>
            )}
          </button>
          <button
            onClick={handleModalClose}
            className="w-full sm:w-auto px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white font-medium rounded-md shadow-md transition-colors duration-150 ease-in-out text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CameraCaptureModal;
