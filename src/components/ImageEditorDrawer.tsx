import React, { useRef, useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from './ui/drawer';
import { Label } from './ui/label';
import {
  inpaintWithClipdrop,
  outpaintWithClipdrop,
  replaceBackgroundWithClipdrop,
} from '../services/imageEditingService';
import { sendEditingAction } from '../services/collaborationService';

interface ImageEditorDrawerProps {
  image: { src: string; alt: string } | null;
  onClose: () => void;
  onImageUpdate: (newSrc: string) => void;
}

const ImageEditorDrawer: React.FC<ImageEditorDrawerProps> = ({
  image,
  onClose,
  onImageUpdate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isErasing, setIsErasing] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [isDragging, setIsDragging] = useState(false);
  const [backgroundPrompt, setBackgroundPrompt] = useState('');

  useEffect(() => {
    if (image && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = image.src;
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
        };
      }
    }
  }, [image]);

  const getMaskBlob = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!canvasRef.current) {
        resolve(null);
        return;
      }
      const originalCanvas = canvasRef.current;
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = originalCanvas.width;
      maskCanvas.height = originalCanvas.height;
      const maskCtx = maskCanvas.getContext('2d');

      if (maskCtx) {
        // Create a black rectangle
        maskCtx.fillStyle = 'black';
        maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

        // Get the original image data
        const originalCtx = originalCanvas.getContext('2d');
        if (originalCtx) {
          const imageData = originalCtx.getImageData(
            0,
            0,
            originalCanvas.width,
            originalCanvas.height
          );
          const data = imageData.data;
          // Make erased parts (transparent) white on the mask
          for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] === 0) {
              // If alpha is 0, pixel is erased
              maskCtx.fillStyle = 'white';
              maskCtx.fillRect(i / 4 % maskCanvas.width, Math.floor(i / 4 / maskCanvas.width), 1, 1);
            }
          }
        }
      }
      maskCanvas.toBlob(resolve, 'image/png');
    });
  };

  const handleInpaint = async () => {
    if (!image) return;
    const maskBlob = await getMaskBlob();
    if (maskBlob) {
      const newImageSrc = await inpaintWithClipdrop(image.src, maskBlob);
      onImageUpdate(newImageSrc);
      onClose();
    }
  };

  const handleSendAction = () => {
    sendEditingAction('my-session', {
      type: 'BRUSH_STROKE',
      payload: {
        x: 10,
        y: 20,
        color: '#ff0000',
      },
    });
  };

  const handleOutpaint = async () => {
    if (!image) return;
    const newImageSrc = await outpaintWithClipdrop(image.src);
    onImageUpdate(newImageSrc);
    onClose();
  };

  const handleRemoveObject = async () => {
    if (!image) return;
    const maskBlob = await getMaskBlob();
    if (maskBlob) {
      const newImageSrc = await inpaintWithClipdrop(image.src, maskBlob);
      onImageUpdate(newImageSrc);
      onClose();
    }
  };

  const handleReplaceBackground = async () => {
    if (!image || !backgroundPrompt) return;
    const maskBlob = await getMaskBlob();
    if (maskBlob) {
      const newImageSrc = await replaceBackgroundWithClipdrop(
        image.src,
        backgroundPrompt
      );
      onImageUpdate(newImageSrc);
      onClose();
    }
  };

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (canvasRef.current) {
      canvasRef.current.getContext('2d')?.beginPath();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (isErasing) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x, y, brushSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  return (
    <Drawer open={!!image} onClose={onClose}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Image Editor</DrawerTitle>
        </DrawerHeader>
        <div className="p-4">
          <canvas
            ref={canvasRef}
            className="w-full h-auto rounded-md"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
          />
          <div className="flex items-center gap-4 mt-4">
            <Button
              onClick={() => setIsErasing(!isErasing)}
              variant={isErasing ? 'destructive' : 'outline'}
            >
              {isErasing ? 'Stop Erasing' : 'Erase'}
            </Button>
            <div className="flex-1">
              <Label>Brush Size</Label>
              <Slider
                min={5}
                max={50}
                step={1}
                value={[brushSize]}
                onValueChange={(value) => setBrushSize(value[0])}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={handleInpaint}>Inpaint</Button>
            <Button onClick={handleOutpaint}>Outpaint</Button>
            <Button onClick={handleRemoveObject}>Remove Object</Button>
            <Button onClick={handleSendAction}>Send Action</Button>
          </div>
          <div className="mt-4 flex gap-2">
            <Input
              placeholder="New background prompt..."
              value={backgroundPrompt}
              onChange={(e) => setBackgroundPrompt(e.target.value)}
            />
            <Button onClick={handleReplaceBackground}>Replace Background</Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default ImageEditorDrawer;
