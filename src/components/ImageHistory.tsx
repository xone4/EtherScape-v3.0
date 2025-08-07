import React, { useState } from 'react';
import { ScrollArea } from './ui/scroll-area';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from './ui/context-menu';
import { Skeleton } from './ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import FalIcon from '../assets/fal-icon.svg';
import ClipdropIcon from '../assets/clipdrop-icon.svg';
import DriveIcon from '../assets/drive-icon.svg';

interface Image {
  src: string;
  alt: string;
  provider: 'fal' | 'clipdrop' | 'drive';
}

interface ImageHistoryProps {
  images: Image[];
  onSelectImage: (image: Image) => void;
  onDeleteImage: (index: number) => void;
}

const providerIcons = {
  fal: FalIcon,
  clipdrop: ClipdropIcon,
  drive: DriveIcon,
};

const ImageHistory: React.FC<ImageHistoryProps> = ({
  images,
  onSelectImage,
  onDeleteImage,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'fal' | 'clipdrop' | 'drive'>('all');

  const filteredImages = images.filter(
    (image) => activeTab === 'all' || image.provider === activeTab
  );

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-lg font-semibold mb-2">History</h2>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="fal">Fal</TabsTrigger>
          <TabsTrigger value="clipdrop">Clipdrop</TabsTrigger>
          <TabsTrigger value="drive">Drive</TabsTrigger>
        </TabsList>
      </Tabs>
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-2 gap-2">
          {filteredImages.map((image, index) => (
            <ContextMenu key={index}>
              <ContextMenuTrigger>
                <div
                  className="relative group cursor-pointer"
                  onClick={() => onSelectImage(image)}
                >
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="w-full h-auto rounded-md"
                  />
                  <img
                    src={providerIcons[image.provider]}
                    alt={`${image.provider} icon`}
                    className="absolute top-1 right-1 w-4 h-4 bg-white rounded-full p-0.5"
                  />
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem
                  onClick={() => {
                    const originalIndex = images.findIndex(
                      (img) => img.src === image.src
                    );
                    onDeleteImage(originalIndex);
                  }}
                >
                  Delete
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
          {filteredImages.length === 0 &&
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="w-full h-32" />
            ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ImageHistory;
