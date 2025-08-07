
import React, { useState, useEffect } from 'react';
import { 
    LogEntry, LogEntryType, DevPlanData, TroubleshootingGuideData, 
    ImageProviderId, UserApiKeys, ImageProviderSetting, ModelSetting,
    ChatProviderId, ChatProviderSetting, UserChatApiKeys, ChatConfig, ChatModelSetting
} from '../types'; 
import { DEFAULT_ASPECT_RATIO, COMMON_ASPECT_RATIOS, IMAGE_PROVIDERS_STATIC, CHAT_PROVIDERS_STATIC, DEFAULT_CHAT_CONFIG, DEFAULT_CHAT_SYSTEM_PROMPT_BASE } from '../constants';

interface AdvancedSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: LogEntry[];
  devPlan: DevPlanData;
  troubleshooting: TroubleshootingGuideData;
  onDownloadLogs: () => void;
  
  // Image Provider Settings
  imageProvidersConfig: ImageProviderSetting[]; 
  currentImageProviderId: ImageProviderId; 
  onSetImageProvider: (providerId: ImageProviderId) => void;
  currentModelId: string;
  onSetModelId: (modelId: string) => void;
  currentAspectRatio: string; 
  onSetAspectRatio: (aspectRatio: string) => void; 
  userApiKeys: UserApiKeys;
  onSaveUserApiKey: (providerId: ImageProviderId, apiKey: string) => void;
  onConfirmCurrentAsDefault: () => void; 
  onManualModelUpdate: () => Promise<void>; 
  isUpdatingModels: boolean; 

  // Chat Provider Settings
  chatProvidersConfig: ChatProviderSetting[];
  currentChatProviderId: ChatProviderId;
  onSetChatProvider: (providerId: ChatProviderId) => void;
  currentChatModelId: string; // New prop
  onSetChatModelId: (modelId: string) => void; // New prop
  userChatApiKeys: UserChatApiKeys;
  onSaveUserChatApiKey: (providerId: ChatProviderId, apiKey: string) => void;
  currentChatSystemPromptBase: string;
  onSetChatSystemPromptBase: (prompt: string) => void;
  currentChatConfig: ChatConfig;
  onSetChatConfig: (config: Partial<ChatConfig>) => void;
  onConfirmChatSettingsAsDefault: () => void;
}

type ActiveTab = 'logs' | 'devPlan' | 'troubleshooting' | 'imageProviders' | 'chatSettings' | 'help';

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-3 py-2 text-xs sm:text-sm font-medium transition-colors rounded-t-md whitespace-nowrap
                ${active ? 'bg-gray-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
  >
    {children}
  </button>
);

const LogTypeBadge: React.FC<{ type: LogEntryType }> = ({ type }) => {
  let bgColor = 'bg-gray-500';
  let textColor = 'text-white';
  switch (type) {
    case 'INFO': bgColor = 'bg-blue-500'; break;
    case 'ERROR': bgColor = 'bg-red-500'; break;
    case 'WARNING': bgColor = 'bg-yellow-500'; textColor = 'text-black'; break;
    case 'DRIVE': bgColor = 'bg-green-500'; break;
    case 'SYSTEM': bgColor = 'bg-indigo-500'; break;
    case 'API': bgColor = 'bg-pink-500'; break;
    case 'MODEL_DISCOVERY': bgColor = 'bg-purple-500'; break;
    case 'EDITING': bgColor = 'bg-teal-500'; break;
    case 'CHAT': bgColor = 'bg-cyan-500'; break;
  }
  return <span className={`px-1.5 py-0.5 text-xs font-semibold rounded-full ${bgColor} ${textColor}`}>{type}</span>;
};

const ExternalLinkIcon: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const DEV_PLAN_STORAGE_KEY = 'etherscapeDevPlanCheckedItems';

const AdvancedSettingsModal: React.FC<AdvancedSettingsModalProps> = ({
  isOpen,
  onClose,
  logs,
  devPlan,
  troubleshooting,
  onDownloadLogs,
  imageProvidersConfig,
  currentImageProviderId,
  onSetImageProvider,
  currentModelId,
  onSetModelId,
  currentAspectRatio,
  onSetAspectRatio,
  userApiKeys,
  onSaveUserApiKey,
  onConfirmCurrentAsDefault, 
  onManualModelUpdate,
  isUpdatingModels,
  // Chat props
  chatProvidersConfig,
  currentChatProviderId,
  onSetChatProvider,
  currentChatModelId,
  onSetChatModelId,
  userChatApiKeys,
  onSaveUserChatApiKey,
  currentChatSystemPromptBase,
  onSetChatSystemPromptBase,
  currentChatConfig,
  onSetChatConfig,
  onConfirmChatSettingsAsDefault,
  onStartTour,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('imageProviders');
  const [tempImageApiKey, setTempImageApiKey] = useState<string>('');
  const [tempChatApiKey, setTempChatApiKey] = useState<string>('');
  
  const [localChatSystemPrompt, setLocalChatSystemPrompt] = useState(currentChatSystemPromptBase);
  const [localChatConfig, setLocalChatConfig] = useState<ChatConfig>(currentChatConfig);
  const [stopSequencesInput, setStopSequencesInput] = useState<string>(currentChatConfig.stopSequences?.join(', ') || '');

  const [checkedDevPlanItems, setCheckedDevPlanItems] = useState<Record<string, Record<string, boolean>>>({});

  useEffect(() => {
    if (isOpen) {
      let initialCheckedState: Record<string, Record<string, boolean>> = {};
      try {
        const storedCheckedItems = localStorage.getItem(DEV_PLAN_STORAGE_KEY);
        if (storedCheckedItems) {
          initialCheckedState = JSON.parse(storedCheckedItems);
        }
      } catch (e) {
        console.error("Failed to load dev plan checked items from localStorage", e);
        initialCheckedState = {};
      }

      // Ensure the 'completed' category exists in the state
      initialCheckedState.completed = { ...(initialCheckedState.completed || {}) };

      // Mark all items from devPlan.completed as true if not already set by user (i.e. undefined in storage)
      if (devPlan && devPlan.completed) {
        devPlan.completed.forEach(completedItem => {
          if (initialCheckedState.completed![completedItem] === undefined) { 
            initialCheckedState.completed![completedItem] = true;
          }
        });
      }
      
      // Initialize other categories if they don't exist, to prevent undefined errors later
      if (devPlan && devPlan.inProgress && initialCheckedState.inProgress === undefined) {
        initialCheckedState.inProgress = {};
      }
      if (devPlan && devPlan.future && initialCheckedState.future === undefined) {
        initialCheckedState.future = {};
      }

      setCheckedDevPlanItems(initialCheckedState);
    }
  }, [isOpen, devPlan]);


  useEffect(() => {
    // Only save when modal is open and checkedDevPlanItems has been initialized
    if (isOpen && Object.keys(checkedDevPlanItems).length > 0) { 
      try {
        localStorage.setItem(DEV_PLAN_STORAGE_KEY, JSON.stringify(checkedDevPlanItems));
      } catch (e) {
        console.error("Failed to save dev plan checked items to localStorage", e);
      }
    }
  }, [checkedDevPlanItems, isOpen]);


  const selectedImageProviderDetails = imageProvidersConfig.find(p => p.id === currentImageProviderId);
  const selectedImageModelDetails = selectedImageProviderDetails?.models.find(m => m.id === currentModelId);
  const modelSupportedAspectRatios = selectedImageModelDetails?.supportedAspectRatios?.length ? selectedImageModelDetails.supportedAspectRatios : COMMON_ASPECT_RATIOS;

  const selectedChatProviderDetails = chatProvidersConfig.find(p => p.id === currentChatProviderId);
  const selectedChatModelDetails = selectedChatProviderDetails?.models.find(m => m.id === currentChatModelId);


  useEffect(() => {
    if (isOpen && selectedImageProviderDetails?.requiresApiKey) {
      setTempImageApiKey(userApiKeys[currentImageProviderId] || '');
    } else if (isOpen && !selectedImageProviderDetails?.requiresApiKey) {
      setTempImageApiKey('');
    }
  }, [isOpen, currentImageProviderId, userApiKeys, selectedImageProviderDetails]);

  useEffect(() => {
    if (isOpen && selectedChatProviderDetails?.requiresApiKey) {
      setTempChatApiKey(userChatApiKeys[currentChatProviderId] || '');
    } else if (isOpen && !selectedChatProviderDetails?.requiresApiKey) {
      setTempChatApiKey('');
    }
  }, [isOpen, currentChatProviderId, userChatApiKeys, selectedChatProviderDetails]);
  
  useEffect(() => {
      setLocalChatSystemPrompt(currentChatSystemPromptBase);
  }, [currentChatSystemPromptBase, isOpen, activeTab]);

  useEffect(() => {
      setLocalChatConfig(currentChatConfig);
      setStopSequencesInput(currentChatConfig.stopSequences?.join(', ') || '');
  }, [currentChatConfig, isOpen, activeTab]);


  const handleImageProviderApiKeyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTempImageApiKey(event.target.value);
  };
  const handleSaveImageApiKeyClick = () => {
    if (currentImageProviderId && selectedImageProviderDetails?.requiresApiKey) {
      onSaveUserApiKey(currentImageProviderId, tempImageApiKey.trim());
    }
  };

  const handleChatProviderApiKeyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTempChatApiKey(event.target.value);
  };
  const handleSaveChatApiKeyClick = () => {
    if (currentChatProviderId && selectedChatProviderDetails?.requiresApiKey) {
      onSaveUserChatApiKey(currentChatProviderId, tempChatApiKey.trim());
    }
  };
  
  const handleChatSystemPromptChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalChatSystemPrompt(event.target.value);
  };
  const handleSaveChatSystemPrompt = () => {
    onSetChatSystemPromptBase(localChatSystemPrompt);
  };

  const handleChatConfigChange = (field: keyof ChatConfig, value: any) => {
    setLocalChatConfig(prev => {
        if (field === 'stopSequences') { // Special handling for string input to array
            return { ...prev, [field]: value };
        }
        const numValue = parseFloat(value);
        return { ...prev, [field]: isNaN(numValue) ? undefined : numValue };
    });
  };
  const handleStopSequencesInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setStopSequencesInput(event.target.value);
    const sequences = event.target.value.split(',').map(s => s.trim()).filter(s => s !== '');
    handleChatConfigChange('stopSequences', sequences);
  };

  const handleSaveChatConfig = () => {
    onSetChatConfig(localChatConfig);
  };

  const handleDevPlanItemToggle = (category: keyof DevPlanData, itemText: string) => {
    setCheckedDevPlanItems(prev => {
      const newCategoryState = { ...(prev[category] || {}) };
      newCategoryState[itemText] = !newCategoryState[itemText];
      return { ...prev, [category]: newCategoryState };
    });
  };


  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/75 flex items-center justify-center z-[100] p-2 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="advanced-settings-title"
    >
      <div
        className="bg-gray-800 w-full max-w-xl md:max-w-2xl lg:max-w-3xl h-[90vh] md:h-[85vh] rounded-lg shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-700">
          <h2 id="advanced-settings-title" className="text-lg sm:text-xl font-semibold text-gray-300">Advanced Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close Advanced Settings">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-1.5 bg-gray-700/50 border-b border-gray-600/50 overflow-x-auto">
          <div className="flex space-x-1">
            <TabButton active={activeTab === 'imageProviders'} onClick={() => setActiveTab('imageProviders')}>Image Generation</TabButton>
            <TabButton active={activeTab === 'chatSettings'} onClick={() => setActiveTab('chatSettings')}>Chat Settings</TabButton>
            <TabButton active={activeTab === 'logs'} onClick={() => setActiveTab('logs')}>Logs</TabButton>
            <TabButton active={activeTab === 'devPlan'} onClick={() => setActiveTab('devPlan')}>Dev Plan</TabButton>
            <TabButton active={activeTab === 'troubleshooting'} onClick={() => setActiveTab('troubleshooting')}>Troubleshoot</TabButton>
            <TabButton active={activeTab === 'help'} onClick={() => setActiveTab('help')}>Help</TabButton>
          </div>
        </div>

        <div className="p-3 sm:p-4 flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700/50 text-sm">
          {activeTab === 'help' && (
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-200 mb-3">Help & Support</h3>
              <div className="space-y-4">
                <button
                  onClick={onStartTour}
                  className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-md shadow-md transition-all duration-150 ease-in-out text-sm flex items-center justify-center"
                >
                  Start Application Tour
                </button>
              </div>
            </div>
          )}
          {activeTab === 'logs' && (
            <div>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-2 gap-2">
                <h3 className="text-base sm:text-lg font-semibold text-gray-200">Application Logs ({logs.length})</h3>
                {logs.length > 0 && (
                  <button
                    onClick={onDownloadLogs}
                    className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white font-medium rounded-md text-xs self-start sm:self-center"
                    aria-label="Download all application logs"
                  >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Logs
                  </button>
                )}
              </div>
              {logs.length === 0 ? <p className="text-gray-400">No logs yet.</p> : (
                <ul className="space-y-2 text-xs">
                  {logs.map((log, index) => (
                    <li key={index} className="p-2 bg-gray-700/70 rounded-md shadow">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-400 font-mono text-[10px] sm:text-xs">{new Date(log.timestamp).toLocaleString()}</span>
                        <LogTypeBadge type={log.type} />
                      </div>
                      <p className="text-gray-200 break-words">{log.message}</p>
                      {log.details && (
                        <pre className="mt-1 p-1.5 bg-gray-600/50 text-gray-300 text-[10px] rounded overflow-x-auto max-h-24 scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-600/70">
                          {typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : String(log.details)}
                        </pre>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {activeTab === 'imageProviders' && (
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-200 mb-3">Default Image Generation Settings</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="image-provider-select-adv" className="block text-xs sm:text-sm font-medium text-gray-300 mb-1">Default Image Provider</label>
                  <select
                    id="image-provider-select-adv"
                    value={currentImageProviderId}
                    onChange={(e) => {
                        const newProviderId = e.target.value as ImageProviderId;
                        onSetImageProvider(newProviderId);
                    }}
                    className="w-full p-2.5 border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none transition-colors text-xs sm:text-sm"
                  >
                    {imageProvidersConfig.map(provider => (
                      <option key={provider.id} value={provider.id}>{provider.displayName}</option>
                    ))}
                  </select>
                </div>

                {selectedImageProviderDetails && selectedImageProviderDetails.models && selectedImageProviderDetails.models.length > 0 && (
                  <div>
                    <label htmlFor="model-select-adv" className="block text-xs sm:text-sm font-medium text-gray-300 mb-1">
                      Default Model ({selectedImageProviderDetails.displayName})
                    </label>
                    <select
                      id="model-select-adv"
                      value={currentModelId}
                      onChange={(e) => {
                          const newModelId = e.target.value;
                          onSetModelId(newModelId);
                      }}
                      className="w-full p-2.5 border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none transition-colors text-xs sm:text-sm"
                    >
                      {selectedImageProviderDetails.models.map(model => (
                        <option key={model.id} value={model.id}>{model.displayName}</option>
                      ))}
                       {selectedImageProviderDetails.models.length === 0 && <option value="" disabled>No models available for this provider.</option>}
                    </select>
                  </div>
                )}
                 {selectedImageProviderDetails && selectedImageProviderDetails.models.length === 0 && (
                     <p className="text-xs text-yellow-400 p-2 bg-yellow-800/20 rounded-md">
                        No models currently listed for {selectedImageProviderDetails.displayName}. This might be due to a failed dynamic fetch or if the provider has no configured models. Using fallback if available.
                     </p>
                 )}


                <div>
                    <label htmlFor="aspect-ratio-select-adv" className="block text-xs sm:text-sm font-medium text-gray-300 mb-1">
                        Default Aspect Ratio
                    </label>
                    <select
                        id="aspect-ratio-select-adv"
                        value={currentAspectRatio}
                        onChange={(e) => onSetAspectRatio(e.target.value)}
                        className="w-full p-2.5 border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none transition-colors text-xs sm:text-sm"
                        disabled={modelSupportedAspectRatios.length <= 1 && !(modelSupportedAspectRatios.length === 0)}
                    >
                        {(modelSupportedAspectRatios.length > 0 ? modelSupportedAspectRatios : COMMON_ASPECT_RATIOS).map(ratio => (
                           <option key={ratio} value={ratio}>{ratio}</option>
                        ))}
                    </select>
                     {selectedImageModelDetails && (!selectedImageModelDetails.supportedAspectRatios || selectedImageModelDetails.supportedAspectRatios.length === 0) && (
                        <p className="text-xs text-gray-400 mt-1">This model's aspect ratios are flexible or use a default. Common options shown.</p>
                    )}
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-600/70">
                   <button
                        onClick={onConfirmCurrentAsDefault}
                        className="w-full px-4 py-2.5 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-md shadow-md transition-all duration-150 ease-in-out text-sm flex items-center justify-center"
                        aria-label="Confirm current provider, model, and aspect ratio selection as the default for next session"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Confirm Image Settings as Default
                    </button>
                    <p className="mt-2 text-xs text-gray-400">
                      Saves the currently selected image provider, model, and aspect ratio as your default choices for when the app starts.
                    </p>
                </div>


                {selectedImageProviderDetails && selectedImageProviderDetails.requiresApiKey && (
                  <div className="mt-6 p-3 border border-gray-600 rounded-md bg-gray-700/50">
                    <div className="flex items-center justify-between mb-1">
                        <label htmlFor={`${selectedImageProviderDetails.id}-api-key`} className="block text-xs sm:text-sm font-medium text-gray-300">
                          {selectedImageProviderDetails.apiKeyLabel || `${selectedImageProviderDetails.displayName} API Key`}
                        </label>
                        {selectedImageProviderDetails.apiKeyManagementUrl && (
                            <a
                                href={selectedImageProviderDetails.apiKeyManagementUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`Go to ${selectedImageProviderDetails.displayName} API Key Management`}
                                aria-label={`Go to ${selectedImageProviderDetails.displayName} API Key Management`}
                                className="p-1.5 bg-gray-500 hover:bg-gray-400 text-white rounded-md transition-colors inline-flex items-center justify-center"
                            >
                                <ExternalLinkIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </a>
                        )}
                    </div>
                    <input
                      id={`${selectedImageProviderDetails.id}-api-key`}
                      type="password"
                      value={tempImageApiKey}
                      onChange={handleImageProviderApiKeyChange}
                      placeholder={`Enter your ${selectedImageProviderDetails.displayName} API Key`}
                      className="w-full p-2.5 border border-gray-500 rounded-md bg-gray-600 text-white placeholder-gray-400 focus:ring-1 focus:ring-gray-500 focus:border-gray-500 outline-none transition-colors text-xs sm:text-sm"
                    />
                    <button
                      onClick={handleSaveImageApiKeyClick}
                      className="mt-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-medium rounded-md text-xs sm:text-sm"
                    >
                      Save {selectedImageProviderDetails.displayName} Key
                    </button>
                    <p className="mt-2 text-[10px] sm:text-xs text-yellow-400 bg-yellow-900/30 p-1.5 rounded">
                      <strong>Warning:</strong> API keys for non-default providers are stored in your browser's local storage. 
                      Avoid using this feature on shared or public computers. The default Gemini provider uses a pre-configured key and does not require user input.
                    </p>
                  </div>
                )}
                 <p className="mt-3 text-xs text-gray-400">
                    The default "Google Gemini" provider uses the application's pre-configured API key.
                    Alternative providers may require you to supply your own API key. Keys are stored locally in your browser.
                    If a provider's quota is exhausted, the app will attempt to use the next available provider in a predefined fallback sequence.
                    {imageProvidersConfig.find(p => p.id === currentImageProviderId)?.isDynamic ? ` Model list for ${selectedImageProviderDetails?.displayName} is fetched dynamically if API key is valid.` : ''}
                  </p>
                 <div className="mt-4 pt-4 border-t border-gray-600/70">
                   <button
                        onClick={onManualModelUpdate}
                        disabled={isUpdatingModels}
                        className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-md shadow-md transition-all duration-150 ease-in-out text-sm flex items-center justify-center disabled:opacity-70 disabled:cursor-wait"
                        aria-label="Manually refresh the list of discoverable models from providers with API keys"
                    >
                        {isUpdatingModels ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Updating Models...
                            </>
                        ) : (
                             <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m-15.357-2a8.001 8.001 0 0015.357 2M9 15h4.581" />
                                </svg>
                                Update Discoverable Image Models
                             </>
                        )}
                    </button>
                    <p className="mt-2 text-xs text-gray-400">
                      Attempts to refresh the model lists for image providers like Stability AI and Leonardo.Ai if their API keys are set.
                    </p>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'chatSettings' && (
            <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-200 mb-3">Default Chat Settings</h3>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="chat-provider-select-adv" className="block text-xs sm:text-sm font-medium text-gray-300 mb-1">Default Chat Provider</label>
                        <select
                            id="chat-provider-select-adv"
                            value={currentChatProviderId}
                            onChange={(e) => onSetChatProvider(e.target.value as ChatProviderId)}
                            className="w-full p-2.5 border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none transition-colors text-xs sm:text-sm"
                        >
                            {chatProvidersConfig.map(provider => (
                            <option key={provider.id} value={provider.id} disabled={provider.isPlaceholder && provider.id !== 'deepseek'}>
                                {provider.displayName}{provider.isPlaceholder && provider.id !== 'deepseek' ? " (N/A)" : ""}
                            </option>
                            ))}
                        </select>
                         {selectedChatProviderDetails?.isPlaceholder && selectedChatProviderDetails.id !== 'deepseek' && (
                             <p className="text-xs text-yellow-400 mt-1">This provider is a placeholder and not yet functional for chat.</p>
                        )}
                    </div>
                     {selectedChatProviderDetails && selectedChatProviderDetails.models.length > 0 && (
                        <div>
                            <label htmlFor="chat-model-select-adv" className="block text-xs sm:text-sm font-medium text-gray-300 mb-1">
                            Default Chat Model ({selectedChatProviderDetails.displayName})
                            </label>
                            <select
                                id="chat-model-select-adv"
                                value={currentChatModelId}
                                onChange={(e) => onSetChatModelId(e.target.value)}
                                className="w-full p-2.5 border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none transition-colors text-xs sm:text-sm"
                            >
                            {selectedChatProviderDetails.models.map(model => (
                                <option key={model.id} value={model.id}>{model.displayName}</option>
                            ))}
                            </select>
                        </div>
                    )}


                    {selectedChatProviderDetails && selectedChatProviderDetails.requiresApiKey && (
                        <div className="mt-4 p-3 border border-gray-600 rounded-md bg-gray-700/50">
                            <div className="flex items-center justify-between mb-1">
                                <label htmlFor={`${selectedChatProviderDetails.id}-chat-api-key`} className="block text-xs sm:text-sm font-medium text-gray-300">
                                {selectedChatProviderDetails.apiKeyLabel || `${selectedChatProviderDetails.displayName} API Key`}
                                </label>
                                {selectedChatProviderDetails.apiKeyManagementUrl && (
                                    <a href={selectedChatProviderDetails.apiKeyManagementUrl} target="_blank" rel="noopener noreferrer"
                                    title={`Go to ${selectedChatProviderDetails.displayName} API Key Management`}
                                    className="p-1.5 bg-gray-500 hover:bg-gray-400 text-white rounded-md transition-colors inline-flex items-center justify-center">
                                        <ExternalLinkIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    </a>
                                )}
                            </div>
                            <input
                                id={`${selectedChatProviderDetails.id}-chat-api-key`}
                                type="password"
                                value={tempChatApiKey}
                                onChange={handleChatProviderApiKeyChange}
                                placeholder={`Enter your ${selectedChatProviderDetails.displayName} API Key`}
                                className="w-full p-2.5 border border-gray-500 rounded-md bg-gray-600 text-white placeholder-gray-400 focus:ring-1 focus:ring-gray-500 focus:border-gray-500 outline-none transition-colors text-xs sm:text-sm"
                            />
                            <button onClick={handleSaveChatApiKeyClick} className="mt-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-medium rounded-md text-xs sm:text-sm">
                                Save {selectedChatProviderDetails.displayName} Chat Key
                            </button>
                        </div>
                    )}
                    
                    {currentChatProviderId === 'gemini' && (
                        <>
                            <div className="mt-4 pt-4 border-t border-gray-600/70">
                                <label htmlFor="chat-system-prompt-base" className="block text-xs sm:text-sm font-medium text-gray-300 mb-1">Base System Prompt (for Gemini)</label>
                                <textarea
                                    id="chat-system-prompt-base"
                                    value={localChatSystemPrompt}
                                    onChange={handleChatSystemPromptChange}
                                    onBlur={handleSaveChatSystemPrompt}
                                    rows={4}
                                    className="w-full p-2.5 border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none transition-colors text-xs sm:text-sm scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-600/70"
                                    placeholder={DEFAULT_CHAT_SYSTEM_PROMPT_BASE}
                                />
                                <p className="text-xs text-gray-400 mt-1">The application will append dynamic context (current theme and art style) to this base prompt. Leave blank to use the app's default base prompt.</p>
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-600/70 space-y-3">
                                <h4 className="text-sm font-medium text-gray-300">Gemini Chat Model Parameters</h4>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label htmlFor="chat-temperature" className="block text-xs font-medium text-gray-300 mb-0.5">Temperature: <span className="text-gray-400">{localChatConfig.temperature?.toFixed(1) ?? 'Default'}</span></label>
                                        <input type="range" id="chat-temperature" min="0" max="1" step="0.1" 
                                               value={localChatConfig.temperature ?? DEFAULT_CHAT_CONFIG.temperature} 
                                               onChange={(e) => handleChatConfigChange('temperature', e.target.value)}
                                               onMouseUp={handleSaveChatConfig} onTouchEnd={handleSaveChatConfig}
                                               className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"/>
                                    </div>
                                    <div>
                                        <label htmlFor="chat-maxOutputTokens" className="block text-xs font-medium text-gray-300 mb-0.5">Max Tokens: <span className="text-gray-400">{localChatConfig.maxOutputTokens ?? 'Default'}</span></label>
                                        <input type="number" id="chat-maxOutputTokens" min="1" step="1" 
                                               value={localChatConfig.maxOutputTokens ?? ''} 
                                               placeholder={String(DEFAULT_CHAT_CONFIG.maxOutputTokens)}
                                               onChange={(e) => handleChatConfigChange('maxOutputTokens', e.target.value)}
                                               onBlur={handleSaveChatConfig}
                                               className="w-full p-2 border border-gray-500 rounded-md bg-gray-600 text-white text-xs placeholder-gray-400 focus:ring-1 focus:ring-gray-400"/>
                                    </div>
                                    <div>
                                        <label htmlFor="chat-topP" className="block text-xs font-medium text-gray-300 mb-0.5">Top P: <span className="text-gray-400">{localChatConfig.topP?.toFixed(2) ?? 'Default'}</span></label>
                                        <input type="number" id="chat-topP" min="0" max="1" step="0.01" 
                                               value={localChatConfig.topP ?? ''}
                                               placeholder="e.g. 0.95"
                                               onChange={(e) => handleChatConfigChange('topP', e.target.value)}
                                               onBlur={handleSaveChatConfig}
                                               className="w-full p-2 border border-gray-500 rounded-md bg-gray-600 text-white text-xs placeholder-gray-400 focus:ring-1 focus:ring-gray-400"/>
                                    </div>
                                    <div>
                                        <label htmlFor="chat-topK" className="block text-xs font-medium text-gray-300 mb-0.5">Top K: <span className="text-gray-400">{localChatConfig.topK ?? 'Default'}</span></label>
                                        <input type="number" id="chat-topK" min="1" step="1" 
                                               value={localChatConfig.topK ?? ''}
                                               placeholder="e.g. 40"
                                               onChange={(e) => handleChatConfigChange('topK', e.target.value)}
                                               onBlur={handleSaveChatConfig}
                                               className="w-full p-2 border border-gray-500 rounded-md bg-gray-600 text-white text-xs placeholder-gray-400 focus:ring-1 focus:ring-gray-400"/>
                                    </div>
                                    <div>
                                        <label htmlFor="chat-seed" className="block text-xs font-medium text-gray-300 mb-0.5">Seed (Optional):</label>
                                        <input type="number" id="chat-seed" min="0" step="1"
                                               value={localChatConfig.seed ?? ''}
                                               placeholder="Random"
                                               onChange={(e) => handleChatConfigChange('seed', e.target.value)}
                                               onBlur={handleSaveChatConfig}
                                               className="w-full p-2 border border-gray-500 rounded-md bg-gray-600 text-white text-xs placeholder-gray-400 focus:ring-1 focus:ring-gray-400"/>
                                    </div>
                                     <div>
                                        <label htmlFor="chat-stopSequences" className="block text-xs font-medium text-gray-300 mb-0.5">Stop Sequences (CSV):</label>
                                        <input type="text" id="chat-stopSequences"
                                               value={stopSequencesInput}
                                               onChange={handleStopSequencesInputChange}
                                               onBlur={handleSaveChatConfig}
                                               placeholder="e.g. Human:, AI:"
                                               className="w-full p-2 border border-gray-500 rounded-md bg-gray-600 text-white text-xs placeholder-gray-400 focus:ring-1 focus:ring-gray-400"/>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">Changes to these parameters will apply when a new chat session is started (e.g., by re-opening the chat drawer or if context changes).</p>
                            </div>
                        </>
                    )}

                    <div className="mt-6 pt-4 border-t border-gray-600/70">
                        <button
                            onClick={onConfirmChatSettingsAsDefault}
                            className="w-full px-4 py-2.5 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-md shadow-md transition-all duration-150 ease-in-out text-sm flex items-center justify-center"
                            aria-label="Confirm current chat provider, system prompt, and model parameters as default"
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Confirm Chat Settings as Default
                        </button>
                         <p className="mt-2 text-xs text-gray-400">
                           Saves the currently selected chat provider, model, system prompt base (if set), and model parameters (for Gemini) as your defaults.
                        </p>
                    </div>
                </div>
            </div>
          )}


          {activeTab === 'devPlan' && (
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-200 mb-3">Development Plan</h3>
              {(Object.keys(devPlan) as Array<keyof DevPlanData>).map(categoryKey => (
                <div key={categoryKey} className="mb-4">
                  <h4 className={`text-sm sm:text-md font-semibold mb-1.5 ${
                    categoryKey === 'completed' ? 'text-green-400' : 
                    categoryKey === 'inProgress' ? 'text-yellow-400' : 'text-blue-400'
                  }`}>
                    {categoryKey === 'completed' ? 'Completed Features:' : 
                     categoryKey === 'inProgress' ? 'Currently In Progress:' : 'Future Ideas:'}
                  </h4>
                  {devPlan[categoryKey].length === 0 ? (
                     <p className="text-gray-400 text-xs sm:text-sm italic">Nothing here yet.</p>
                  ) : (
                    <ul className="space-y-1.5 text-gray-300 text-xs sm:text-sm">
                      {devPlan[categoryKey].map((item, index) => {
                        const isChecked = checkedDevPlanItems[categoryKey]?.[item] || false;
                        const itemId = `dev-plan-${categoryKey}-${index}`;
                        return (
                          <li key={itemId} className="flex items-start space-x-2 py-0.5">
                            <input
                              type="checkbox"
                              id={itemId}
                              checked={isChecked}
                              onChange={() => handleDevPlanItemToggle(categoryKey, item)}
                              className="mt-1 h-3.5 w-3.5 text-blue-500 border-gray-400 rounded focus:ring-blue-400 bg-gray-600 cursor-pointer flex-shrink-0"
                            />
                            <label
                              htmlFor={itemId}
                              className={`cursor-pointer ${isChecked ? 'line-through text-gray-500' : 'text-gray-300'}`}
                            >
                              {item}
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'troubleshooting' && (
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-200 mb-3">Troubleshooting Guide</h3>
              <div className="space-y-3">
                {troubleshooting.map((item, i) => (
                  <div key={`ts-${i}`} className="p-2.5 bg-gray-700/70 rounded-md">
                    <h4 className="text-sm sm:text-md font-semibold text-orange-400 mb-1">{item.problem}</h4>
                    <p className="text-gray-300 text-xs sm:text-sm break-words">{item.solution}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
         <button 
          onClick={onClose} 
          className="m-3 sm:m-4 mt-2 px-5 py-2 sm:py-2.5 bg-gray-600 hover:bg-gray-500 text-white font-medium rounded-md self-center text-sm"
          aria-label="Close Advanced Settings"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default AdvancedSettingsModal;
