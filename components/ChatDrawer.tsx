


import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, ChatProviderId } from '../types';
import { default as classNames } from 'classnames';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
  isChatFullscreen: boolean;
  onToggleFullscreen: () => void;
  chatProviderDisplayName?: string;
  chatModelDisplayName?: string;
  selectedChatProviderId?: ChatProviderId;
}

const ChatDrawer: React.FC<ChatDrawerProps> = ({ 
  isOpen, 
  onClose, 
  messages, 
  onSendMessage, 
  isLoading,
  isChatFullscreen,
  onToggleFullscreen,
  chatProviderDisplayName,
  chatModelDisplayName,
  selectedChatProviderId
}) => {
  const [userInput, setUserInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);
  
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isChatFullscreen]);

  const handleSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (userInput.trim() && !isLoading) {
      await onSendMessage(userInput.trim());
      setUserInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const drawerClasses = classNames(
    "fixed left-0 right-0 bg-gray-800/80 backdrop-blur-md shadow-xl z-40 flex flex-col border-t border-gray-700/50",
    "transition-all duration-300 ease-[cubic-bezier(0.37,0,0.63,1)]", // Added 'transition-all' for height
    {
      'translate-y-0': isOpen,
      'translate-y-full': !isOpen,
    }
  );
  
  const drawerStyle: React.CSSProperties = {
    bottom: 0, 
    height: isOpen ? (isChatFullscreen ? `calc(100vh - ${56}px)` : '50vh') : '0px', // Use APP_HEADER_HEIGHT_PX (56px)
    maxHeight: `calc(100vh - ${56}px)`, // Ensure it doesn't overlap header
    // transitionProperty: 'transform, height', // Covered by 'transition-all'
  };

  return (
    <aside
      className={drawerClasses}
      style={drawerStyle}
      role="complementary"
      aria-labelledby="chat-drawer-title"
      aria-hidden={!isOpen}
    >
      <div className="flex items-center justify-between p-3 border-b border-gray-700/50 sticky top-0 bg-gray-800/80 backdrop-blur-md z-10">
        <div>
            <h2 id="chat-drawer-title" className="text-lg font-semibold text-gray-200">AI Co-pilot</h2>
            {isOpen && chatProviderDisplayName && (
                 <p className="text-xs text-gray-400 -mt-0.5" title={`Chat configured with ${chatProviderDisplayName} using model ${chatModelDisplayName || 'default'}`}>
                    Using: {chatProviderDisplayName} 
                    {chatModelDisplayName && ` (${chatModelDisplayName.split(' ')[0]})`}
                </p>
            )}
        </div>
        <div className="flex items-center space-x-2">
            <button 
                onClick={onToggleFullscreen} 
                className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-gray-700 transition-colors" 
                aria-label={isChatFullscreen ? "Exit Fullscreen Chat" : "Enter Fullscreen Chat"}
                title={isChatFullscreen ? "Exit Fullscreen Chat" : "Enter Fullscreen Chat"}
            >
                {isChatFullscreen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18M5 12h18" transform="rotate(45 12 12) scale(0.8) translate(0, -1)" />
                       <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 1v4m0 0h-4m4 0l-5-5" transform="scale(0.6) translate(13,13)"/>
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                         <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m7-5h4m0 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m7 5h4m0 0v-4m0 4l-5-5" />
                    </svg>
                )}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-gray-700 transition-colors" aria-label="Close Chat Drawer">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
      </div>

      <div className="flex-grow p-3 space-y-3 overflow-y-auto chat-drawer-content">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] p-2.5 rounded-lg shadow ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : msg.role === 'model'
                  ? 'bg-gray-600 text-gray-200 rounded-bl-none'
                  : 'bg-gray-700/70 text-gray-300 italic text-sm w-full text-center rounded-md' 
              }`}
            >
              <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
              {msg.role !== 'system' && (
                <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-blue-200 text-right' : 'text-gray-400 text-left'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {isLoading && (
        <div className="px-3 py-1.5 text-xs text-center text-gray-400 border-t border-gray-700/50">
          AI Co-pilot is thinking...
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-700/50 sticky bottom-0 bg-gray-800/80 backdrop-blur-md">
        <div className="flex items-end space-x-2">
          <textarea
            ref={inputRef}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask for ideas, or try 'change art style to X'..."
            className="flex-grow p-2.5 border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none text-sm scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-700 max-h-28"
            rows={1}
            disabled={isLoading || (isOpen && selectedChatProviderId !== 'gemini')}
            aria-label="Chat message input"
          />
          <button
            type="submit"
            disabled={isLoading || !userInput.trim() || (isOpen && selectedChatProviderId !== 'gemini')}
            className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-md shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            aria-label="Send chat message"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 16.571V11.5a1 1 0 011-1h.094a1 1 0 00.996-.923 1 1 0 01.923-.996A1 1 0 0013 7.586V3.5a1 1 0 00-.409-.816l-1.7-1.133z" />
            </svg>
          </button>
        </div>
      </form>
       <style>{`
        .chat-drawer-content::-webkit-scrollbar { width: 6px; }
        .chat-drawer-content::-webkit-scrollbar-track { background: transparent; }
        .chat-drawer-content::-webkit-scrollbar-thumb { background-color: #4b5563; border-radius: 10px; }
      `}</style>
    </aside>
  );
};

export default ChatDrawer;
