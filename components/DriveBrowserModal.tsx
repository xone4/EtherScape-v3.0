import React, { useState, useEffect } from 'react';
import { DriveFileMetadata, ImageHistoryItem } from '../types';
import { listImagesFromDrive } from '../services/driveService';

interface DriveBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageSelect: (image: ImageHistoryItem) => void;
  showToast: (message: string, duration?: number) => void;
}

const DriveBrowserModal: React.FC<DriveBrowserModalProps> = ({ isOpen, onClose, onImageSelect, showToast }) => {
  const [images, setImages] = useState<DriveFileMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchImages = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const driveImages = await listImagesFromDrive();
      setImages(driveImages);
    } catch (err: any) {
      setError(err.message);
      showToast(`Error fetching Drive images: ${err.message}`, 4000);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchImages();
    }
  }, [isOpen]);

  const handleImageClick = (driveFile: DriveFileMetadata) => {
    // This is a simplified conversion. The actual implementation might need more details.
    const historyItem: ImageHistoryItem = {
      id: driveFile.id || `drive-${Date.now()}`,
      imageUrl: `https://lh3.googleusercontent.com/d/${driveFile.id}`, // This is a common pattern for Drive image URLs
      prompt: driveFile.appProperties?.prompt || '',
      concept: driveFile.appProperties?.concept || driveFile.name || 'Untitled',
      mediaType: 'image',
      artStyle: driveFile.appProperties?.artStyle || 'unknown',
      aspectRatio: driveFile.appProperties?.aspectRatio || '1:1',
      provider: 'google-drive',
      modelId: 'unknown',
      driveFileId: driveFile.id,
    };
    onImageSelect(historyItem);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Browse Google Drive</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
        </div>
        <div className="flex-grow overflow-y-auto">
          {isLoading && <p className="text-white">Loading images...</p>}
          {error && <p className="text-red-500">{error}</p>}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {images.map(image => (
              <div key={image.id} className="cursor-pointer group" onClick={() => handleImageClick(image)}>
                <img src={image.thumbnailLink} alt={image.name} className="w-full h-auto object-cover rounded-md group-hover:opacity-75 transition-opacity" />
                <p className="text-xs text-gray-400 truncate mt-1">{image.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriveBrowserModal;
