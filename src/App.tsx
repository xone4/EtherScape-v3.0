import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
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

import {
  GoogleOAuthProvider,
  GoogleLogin,
  googleLogout,
} from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import {
  initSocket,
  joinSession,
  onEditingAction,
  sendEditingAction,
} from './services/collaborationService';

const App: React.FC = () => {
  return (
    <GoogleOAuthProvider clientId="YOUR_GOOGLE_CLIENT_ID">
      <AppContent />
    </GoogleOAuthProvider>
  );
};

const AppContent: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [images, setImages] = useState<Image[]>([]);
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [driveImages, setDriveImages] = useState<string[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<any>(null);

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

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onabort = () => console.log('file reading was aborted');
      reader.onerror = () => console.log('file reading has failed');
      reader.onload = () => {
        const binaryStr = reader.result as string;
        setImages((prev) => [
          ...prev,
          { src: binaryStr, alt: file.name, provider: 'drive' },
        ]);
      };
      reader.readAsDataURL(file);
    });
  }, []);
  const { getRootProps, getInputProps } = useDropzone({ onDrop });

  const handleLoginSuccess = (credentialResponse: any) => {
    const decoded = jwtDecode(credentialResponse.credential);
    setUser(decoded);
    setIsLoggedIn(true);
    const socket = initSocket();
    joinSession('my-session'); // Replace with a dynamic session ID
    onEditingAction((action) => {
      console.log('Received editing action:', action);
      // Apply the action to the local state
    });
  };

  return (
    <div {...getRootProps()} className="flex h-screen bg-gray-100">
      <input {...getInputProps()} />
      <OnboardingTour />
      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-md p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">AI Image Generator</h1>
          {isLoggedIn ? (
            <Button onClick={() => googleLogout()}>Logout</Button>
          ) : (
            <GoogleLogin
              onSuccess={handleLoginSuccess}
              onError={() => {
                console.log('Login Failed');
              }}
            />
          )}
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
            <ImageDisplay image={selectedImage} isGenerating={isGenerating} />
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
