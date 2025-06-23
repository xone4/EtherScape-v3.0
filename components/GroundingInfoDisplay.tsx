
import React from 'react';
import { GroundingSource } from '../types';

interface GroundingInfoDisplayProps {
  sources?: GroundingSource[];
}

const GroundingInfoDisplay: React.FC<GroundingInfoDisplayProps> = ({ sources }) => {
  if (!sources || sources.length === 0) {
    return null; 
  }

  return (
    <div className="w-full max-w-3xl mx-auto mt-2 p-2.5 bg-gray-800/60 border border-gray-700/70 rounded-lg shadow-md backdrop-blur-sm">
      <h3 className="text-xs font-semibold text-gray-400 mb-1.5">
        Grounding Sources (from Google Search):
      </h3>
      <ul className="space-y-1 text-xs max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700/50">
        {sources.map((source, index) => (
          <li key={index} className="truncate">
            <a
              href={source.web.uri}
              target="_blank"
              rel="noopener noreferrer"
              title={`Open source: ${source.web.title} (${source.web.uri})`}
              className="text-blue-400 hover:text-blue-300 hover:underline transition-colors"
            >
              {source.web.title || source.web.uri}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default GroundingInfoDisplay;
