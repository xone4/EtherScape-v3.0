import React, { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { OnboardingTour } from './components/OnboardingTour';
import Controls from './components/Controls';
import ImageDisplay from './components/ImageDisplay';
import ImageHistory from './components/ImageHistory';
import DriveBrowserModal from './components/DriveBrowserModal';
import { generateWithFal, generateWithClipdrop } from './services/imageGenerator';
import { listImagesFromDrive } from './services/driveService';

interface Image {
  src: string;
  alt: string;
  provider: 'fal' | 'clipdrop' | 'drive';
}

const App: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [images, setImages] = useState<Image[]>([]);
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [driveImages, setDriveImages] = useState<string[]>([]);

  useEffect(() => {
    const fetchDriveImages = async () => {
      const images = await listImagesFromDrive();
      setDriveImages(images);
    };
    fetchDriveImages();
  }, []);

  const handleGenerate = async (
    theme: string,
    seed: number,
    guidance: number,
    style: string
  ) => {
    setIsGenerating(true);
    try {
      const falImage = await generateWithFal(theme, seed, guidance, style);
      setImages((prev) => [
        ...prev,
        { src: falImage, alt: theme, provider: 'fal' },
      ]);

      const clipdropImage = await generateWithClipdrop(theme);
      setImages((prev) => [
        ...prev,
        { src: clipdropImage, alt: theme, provider: 'clipdrop' },
      ]);
    } catch (error)d {
      console.error('Failed to generate images:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <OnboardingTour />
      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-md p-4">
          <h1 className="text-2xl font-bold">AI Image Generator</h1>
        </header>
        <main className="flex-1 p-4 flex gap-4">
          <div className="w-1/4">
            <Controls
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              onOpenDrive={() => setIsDriveModalOpen(true)}
            />
          </div>
          <div className="w-1/2">
            <ImageDisplay image={selectedImage} />
          </div>
          <div className="w-1/4">
            <ImageHistory
              images={images}
              onSelectImage={setSelectedImage}
              onDeleteImage={(index) => {
                setImages((prev) => prev.filter((_, i) => i !== index));
              }}
            />
          </div>
        </main>
      </div>
      <DriveBrowserModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        images={driveImages}
        onSelectImage={(src) => {
          setImages((prev) => [...prev, { src, alt: 'From Drive', provider: 'drive' }]);
          setIsDriveModalOpen(false);
        }}
      />
      <Toaster />
    </div>
  );
};

export default App;
