import React from 'react';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from './ui/drawer';
import ImageEditorDrawer from './ImageEditorDrawer';
import FalIcon from '../assets/fal-icon.svg';
import ClipdropIcon from '../assets/clipdrop-icon.svg';
import DriveIcon from '../assets/drive-icon.svg';

interface Image {
  src: string;
  alt: string;
  provider: 'fal' | 'clipdrop' | 'drive';
}

import { Progress } from './ui/progress';

interface ImageDisplayProps {
  image: Image | null;
  isGenerating: boolean;
}

const providerIcons = {
  fal: FalIcon,
  clipdrop: ClipdropIcon,
  drive: DriveIcon,
};

const ImageDisplay: React.FC<ImageDisplayProps> = ({ image, isGenerating }) => {
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [editedImage, setEditedImage] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    if (image) {
      setEditedImage(image.src);
    }
  }, [image]);

  React.useEffect(() => {
    if (isGenerating) {
      const interval = setInterval(() => {
        setProgress((prev) => (prev >= 95 ? 95 : prev + 5));
      }, 500);
      return () => clearInterval(interval);
    } else {
      setProgress(0);
    }
  }, [isGenerating]);

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-200 rounded-md">
      {isGenerating ? (
        <div className="w-1/2">
          <Progress value={progress} />
          <p className="text-center mt-2">Generating image...</p>
        </div>
      ) : image ? (
        <div className="relative group">
          <img
            src={editedImage || image.src}
            alt={image.alt}
            className="max-h-full max-w-full rounded-md"
          />
          <div className="absolute top-2 right-2 flex gap-2">
            <img
              src={providerIcons[image.provider]}
              alt={`${image.provider} icon`}
              className="w-6 h-6 bg-white rounded-full p-1"
            />
            <Drawer open={isEditorOpen} onOpenChange={setIsEditorOpen}>
              <DrawerTrigger asChild>
                <Button variant="secondary">Edit</Button>
              </DrawerTrigger>
              <DrawerContent>
                <ImageEditorDrawer
                  image={{ src: editedImage || image.src, alt: image.alt }}
                  onClose={() => setIsEditorOpen(false)}
                  onImageUpdate={setEditedImage}
                />
              </DrawerContent>
            </Drawer>
          </div>
        </div>
      ) : (
        <Skeleton className="w-full h-full" />
      )}
    </div>
  );
};

export default ImageDisplay;
