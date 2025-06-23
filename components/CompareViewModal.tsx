
import React from 'react';
import { ImageHistoryItem } from '../types';
import classNames from 'classnames';

interface CompareViewModalProps {
  items: ImageHistoryItem[];
  onClose: () => void;
}

const DetailItem: React.FC<{ label: string; value?: string | number | boolean; isBoolean?: boolean }> = ({ label, value, isBoolean }) => {
  if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) return null;
  const displayValue = isBoolean ? (value ? 'Yes' : 'No') : String(value);
  return (
    <p className="text-xs text-gray-400">
      <strong className="text-gray-300">{label}:</strong>{' '}
      <span className="break-all">{displayValue}</span>
    </p>
  );
};

const CompareViewModal: React.FC<CompareViewModalProps> = ({ items, onClose }) => {
  if (!items || items.length === 0) return null;

  const numItems = items.length;
  const gridColsClass = numItems === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2';
  // For 3 items, md:grid-cols-2 will make it 2 on top, 1 below. For 4, it's 2x2.
  // We can refine this further with more specific classes if needed.

  return (
    <div
      className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-[120] p-2 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-view-title"
    >
      <div
        className="bg-gray-800 w-full max-w-6xl h-[95vh] rounded-lg shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
          <h2 id="compare-view-title" className="text-lg sm:text-xl font-semibold text-gray-200">
            Comparing {items.length} Image{items.length > 1 ? 's' : ''}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700 transition-colors"
            aria-label="Close Compare View"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className={`grid ${gridColsClass} gap-2 sm:gap-3 p-2 sm:p-3 flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700/50`}>
          {items.map((item) => (
            <div key={item.id} className="bg-gray-700/50 rounded-lg p-2 flex flex-col shadow">
              <div className="aspect-w-16 aspect-h-9 mb-2 rounded overflow-hidden flex-shrink-0 relative">
                <img
                  src={item.imageUrl}
                  alt={item.prompt}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
                {item.isUpscaled && (
                    <span className="absolute top-1 right-1 bg-blue-500 text-white text-[9px] px-1.5 py-0.5 rounded-full shadow">
                        UPSCALED
                    </span>
                )}
              </div>
              <div className="text-xs space-y-0.5 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-600/70 pr-1 min-h-[100px]">
                <p className="text-sm font-semibold text-gray-200 truncate" title={item.concept}>{item.concept}</p>
                <DetailItem label="Prompt" value={item.prompt} />
                <DetailItem label="Art Style" value={item.artStyle} />
                <DetailItem label="Aspect Ratio" value={item.aspectRatio} />
                <DetailItem label="Provider" value={item.provider} />
                <DetailItem label="Model" value={item.modelDisplayName || item.modelId} />
                <DetailItem label="Negative Prompt" value={item.negativePrompt} />
                <DetailItem label="CFG Scale" value={item.cfgScale} />
                <DetailItem label="Steps" value={item.steps} />
                <DetailItem label="Seed" value={item.seed} />
                <DetailItem label="Sampler" value={item.sampler} />
                <DetailItem label="Style Preset" value={item.stylePreset} />
                <DetailItem label="Leonardo Preset" value={item.leonardoPresetStyle !== "NONE" ? item.leonardoPresetStyle : undefined} />
                <DetailItem label="Alchemy" value={item.useAlchemy} isBoolean={true} />
                <DetailItem label="PhotoReal" value={item.usePhotoReal} isBoolean={true} />
                <DetailItem label="Img2Img Source ID" value={item.sourceImageForImg2ImgId} />
                <DetailItem label="Img2Img Strength" value={item.initStrengthForImg2Img} />
              </div>
            </div>
          ))}
        </div>
      </div>
       <style>{`
        .scrollbar-thin {
          scrollbar-width: thin;
          scrollbar-color: #4A5568 #374151; 
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px; 
          height: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: #374151;
          border-radius: 3px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background-color: #4A5568; 
          border-radius: 3px;
        }
        .aspect-w-16 { position: relative; padding-bottom: 56.25%; }
        .aspect-h-9 { /* For a 16:9 aspect ratio */ }
        .aspect-w-16 > img, .aspect-w-16 > video {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: contain; /* or 'cover' depending on desired effect */
        }
      `}</style>
    </div>
  );
};

export default CompareViewModal;
