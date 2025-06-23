
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { 
    ImageProviderId, UserApiKeys, ImageProviderSetting, 
    ChatProviderId, ChatProviderSetting, UserChatApiKeys, ChatConfig, LogEntryType, LogEntry, // Added LogEntry
    DriveFileMetadata
} from './types';
import { 
    PREDEFINED_CONCEPTS, DEFAULT_ART_STYLE, DEFAULT_ASPECT_RATIO, DEFAULT_CFG_SCALE, DEFAULT_STEPS, DEFAULT_SEED,
    IMAGE_PROVIDERS_STATIC, CHAT_PROVIDERS_STATIC, DEFAULT_CHAT_SYSTEM_PROMPT_BASE, DEFAULT_CHAT_CONFIG 
} from './constants';
import { useToast as useAppToast } from './hooks/useToast'; 
import { useLogger as useAppLogger } from './hooks/useLogger'; 


const DEFAULT_PROVIDER_ID_APPCONTEXT: ImageProviderId = 'gemini';
const DEFAULT_MODEL_ID_FOR_PROVIDER_APPCONTEXT = (providerId: ImageProviderId, providersConfig: ImageProviderSetting[]): string => {
    const provider = providersConfig.find(p => p.id === providerId);
    return provider?.models[0]?.id || IMAGE_PROVIDERS_STATIC.find(p => p.id === DEFAULT_PROVIDER_ID_APPCONTEXT)!.models[0].id;
};
const DEFAULT_CHAT_PROVIDER_ID_APPCONTEXT: ChatProviderId = 'gemini';
const DEFAULT_CHAT_MODEL_ID_FOR_PROVIDER_APPCONTEXT = (providerId: ChatProviderId, providersConfig: ChatProviderSetting[]): string => {
    const provider = providersConfig.find(p => p.id === providerId);
    return provider?.models[0]?.id || CHAT_PROVIDERS_STATIC.find(p => p.id === DEFAULT_CHAT_PROVIDER_ID_APPCONTEXT)!.models[0].id;
};


interface AppContextType {
  // Core generation settings
  currentConcept: string; setCurrentConcept: (c: string) => void;
  initialThemeForControls: string; setInitialThemeForControls: (c: string) => void;
  currentArtStyle: string; setCurrentArtStyle: (s: string) => void;
  initialArtStyleForControls: string; setInitialArtStyleForControls: (s: string) => void;
  currentAspectRatio: string; setCurrentAspectRatio: (r: string) => void;
  initialAspectRatioForControls: string; setInitialAspectRatioForControls: (r: string) => void;
  currentNegativePrompt: string; setCurrentNegativePrompt: (p: string) => void;
  initialNegativePromptForControls: string; setInitialNegativePromptForControls: (p: string) => void;

  // Advanced generation settings
  currentCfgScale: number; setCurrentCfgScale: (v: number) => void;
  initialCfgScaleForControls: number; setInitialCfgScaleForControls: (v: number) => void;
  currentSteps: number; setCurrentSteps: (v: number) => void;
  initialStepsForControls: number; setInitialStepsForControls: (v: number) => void;
  currentSeed?: number; setCurrentSeed: (v?: number) => void;
  initialSeedForControls?: number; setInitialSeedForControls: (v?: number) => void;
  currentSampler?: string; setCurrentSampler: (s?: string) => void;
  initialSamplerForControls?: string; setInitialSamplerForControls: (s?: string) => void;
  currentStylePreset?: string; setCurrentStylePreset: (p?: string) => void;
  initialStylePresetForControls?: string; setInitialStylePresetForControls: (p?: string) => void;
  currentLeonardoPresetStyle?: string; setCurrentLeonardoPresetStyle: (p?: string) => void;
  initialLeonardoPresetStyleForControls?: string; setInitialLeonardoPresetStyleForControls: (p?: string) => void;
  currentUseAlchemy: boolean; setCurrentUseAlchemy: (b: boolean) => void;
  initialUseAlchemyForControls: boolean; setInitialUseAlchemyForControls: (b: boolean) => void;
  currentUsePhotoReal: boolean; setCurrentUsePhotoReal: (b: boolean) => void;
  initialUsePhotoRealForControls: boolean; setInitialUsePhotoRealForControls: (b: boolean) => void;

  // App status
  appIsLoading: boolean; setAppIsLoading: (loading: boolean) => void;
  isPlaying: boolean; setIsPlaying: (playing: boolean) => void;
  
  // User data
  userSavedConcepts: string[]; setUserSavedConcepts: React.Dispatch<React.SetStateAction<string[]>>;
  
  // Image Provider config
  imageProvidersConfig: ImageProviderSetting[]; setImageProvidersConfig: React.Dispatch<React.SetStateAction<ImageProviderSetting[]>>;
  selectedImageProvider: ImageProviderId; setSelectedImageProvider: (id: ImageProviderId) => void;
  selectedModelId: string; setSelectedModelId: (id: string) => void;
  userApiKeys: UserApiKeys; setUserApiKeys: React.Dispatch<React.SetStateAction<UserApiKeys>>;
  
  // Chat Provider config
  chatProvidersConfig: ChatProviderSetting[]; setChatProvidersConfig: React.Dispatch<React.SetStateAction<ChatProviderSetting[]>>;
  selectedChatProviderId: ChatProviderId; setSelectedChatProviderId: (id: ChatProviderId) => void;
  selectedChatModelId: string; setSelectedChatModelId: (id: string) => void;
  userChatApiKeys: UserChatApiKeys; setUserChatApiKeys: React.Dispatch<React.SetStateAction<UserChatApiKeys>>;
  currentChatSystemPromptBase: string; setCurrentChatSystemPromptBase: (prompt: string) => void;
  currentChatConfig: ChatConfig; setCurrentChatConfig: React.Dispatch<React.SetStateAction<ChatConfig>>;

  // Misc settings
  useSearchGrounding: boolean; setUseSearchGrounding: React.Dispatch<React.SetStateAction<boolean>>;
  driveSyncEnabled: boolean; setDriveSyncEnabled: (enabled: boolean) => void; 

  // Drive specific properties from useDriveSync
  isDriveAuthenticated: boolean;
  driveUserEmail: string | null;
  isDriveLoading: boolean;
  driveError: string | null;
  setDriveError: (error: string | null) => void;
  handleToggleDriveSync: () => void;
  handleDriveSignIn: () => Promise<void>;
  handleDriveSignOut: () => void;
  uploadImageToDrive: (
    imageUrl: string, 
    filename: string,
    prompt: string,
    concept: string,
    artStyle: string, 
    aspectRatio: string,
    originalId: string, 
    negativePrompt?: string,
    isUpscaled?: boolean,
    originalHistoryItemId?: string,
    seed?: number 
  ) => Promise<DriveFileMetadata>;

  // Utilities from hooks
  showToast: (message: string, duration?: number) => void;
  logAppEvent: (type: LogEntryType, message: string, details?: any) => void;
  appLogs: LogEntry[]; // Make logs available via context
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [currentConcept, setCurrentConcept] = useState<string>(PREDEFINED_CONCEPTS[0] || "Abstract flowing energy");
  const [initialThemeForControls, setInitialThemeForControls] = useState<string>(PREDEFINED_CONCEPTS[0] || "Abstract flowing energy");
  const [currentArtStyle, setCurrentArtStyle] = useState<string>(DEFAULT_ART_STYLE);
  const [initialArtStyleForControls, setInitialArtStyleForControls] = useState<string>(DEFAULT_ART_STYLE);
  const [currentAspectRatio, setCurrentAspectRatio] = useState<string>(DEFAULT_ASPECT_RATIO);
  const [initialAspectRatioForControls, setInitialAspectRatioForControls] = useState<string>(DEFAULT_ASPECT_RATIO);
  const [currentNegativePrompt, setCurrentNegativePrompt] = useState<string>("");
  const [initialNegativePromptForControls, setInitialNegativePromptForControls] = useState<string>("");

  const [currentCfgScale, setCurrentCfgScale] = useState<number>(DEFAULT_CFG_SCALE);
  const [initialCfgScaleForControls, setInitialCfgScaleForControls] = useState<number>(DEFAULT_CFG_SCALE);
  const [currentSteps, setCurrentSteps] = useState<number>(DEFAULT_STEPS);
  const [initialStepsForControls, setInitialStepsForControls] = useState<number>(DEFAULT_STEPS);
  const [currentSeed, setCurrentSeed] = useState<number | undefined>(DEFAULT_SEED);
  const [initialSeedForControls, setInitialSeedForControls] = useState<number | undefined>(DEFAULT_SEED);
  const [currentSampler, setCurrentSampler] = useState<string | undefined>(undefined);
  const [initialSamplerForControls, setInitialSamplerForControls] = useState<string | undefined>(undefined);
  const [currentStylePreset, setCurrentStylePreset] = useState<string | undefined>(undefined); 
  const [initialStylePresetForControls, setInitialStylePresetForControls] = useState<string | undefined>(undefined);
  const [currentLeonardoPresetStyle, setCurrentLeonardoPresetStyle] = useState<string | undefined>("NONE"); 
  const [initialLeonardoPresetStyleForControls, setInitialLeonardoPresetStyleForControls] = useState<string | undefined>("NONE");
  const [currentUseAlchemy, setCurrentUseAlchemy] = useState<boolean>(false); 
  const [initialUseAlchemyForControls, setInitialUseAlchemyForControls] = useState<boolean>(false);
  const [currentUsePhotoReal, setCurrentUsePhotoReal] = useState<boolean>(false); 
  const [initialUsePhotoRealForControls, setInitialUsePhotoRealForControls] = useState<boolean>(false);

  const [appIsLoading, setAppIsLoading] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [userSavedConcepts, setUserSavedConcepts] = useState<string[]>([]);
  
  const [imageProvidersConfig, setImageProvidersConfig] = useState<ImageProviderSetting[]>(() => JSON.parse(JSON.stringify(IMAGE_PROVIDERS_STATIC)));
  const [selectedImageProvider, setSelectedImageProvider] = useState<ImageProviderId>(DEFAULT_PROVIDER_ID_APPCONTEXT);
  const [selectedModelId, setSelectedModelId] = useState<string>(() => DEFAULT_MODEL_ID_FOR_PROVIDER_APPCONTEXT(DEFAULT_PROVIDER_ID_APPCONTEXT, IMAGE_PROVIDERS_STATIC));
  const [userApiKeys, setUserApiKeys] = useState<UserApiKeys>({});

  const [chatProvidersConfig, setChatProvidersConfig] = useState<ChatProviderSetting[]>(() => JSON.parse(JSON.stringify(CHAT_PROVIDERS_STATIC)));
  const [selectedChatProviderId, setSelectedChatProviderId] = useState<ChatProviderId>(DEFAULT_CHAT_PROVIDER_ID_APPCONTEXT);
  const [selectedChatModelId, setSelectedChatModelId] = useState<string>(() => DEFAULT_CHAT_MODEL_ID_FOR_PROVIDER_APPCONTEXT(DEFAULT_CHAT_PROVIDER_ID_APPCONTEXT, CHAT_PROVIDERS_STATIC));
  const [userChatApiKeys, setUserChatApiKeys] = useState<UserChatApiKeys>({});
  const [currentChatSystemPromptBase, setCurrentChatSystemPromptBase] = useState<string>(DEFAULT_CHAT_SYSTEM_PROMPT_BASE);
  const [currentChatConfig, setCurrentChatConfig] = useState<ChatConfig>(() => JSON.parse(JSON.stringify(DEFAULT_CHAT_CONFIG)));
  
  const [useSearchGrounding, setUseSearchGrounding] = useState<boolean>(false);
  const [driveSyncEnabled, setDriveSyncEnabled] = useState<boolean>(false);

  // Drive states and handlers - these will be overridden by useDriveSync in App.tsx, 
  // but we need placeholders here for AppContextType.
  const [isDriveAuthenticated, setIsDriveAuthenticated] = useState<boolean>(false);
  const [driveUserEmail, setDriveUserEmail] = useState<string | null>(null);
  const [isDriveLoading, setIsDriveLoading] = useState<boolean>(false);
  const [driveError, setDriveError] = useState<string | null>(null);
  const placeholderSetDriveError = (error: string | null) => setDriveError(error);
  const placeholderToggleDriveSync = () => console.warn("Drive sync toggle placeholder used");
  const placeholderDriveSignIn = async () => { console.warn("Drive sign-in placeholder used"); return Promise.resolve(); };
  const placeholderDriveSignOut = () => console.warn("Drive sign-out placeholder used");
  const placeholderUploadImageToDrive = async (): Promise<DriveFileMetadata> => {
    console.warn("Upload image to drive placeholder used");
    // Return a mock DriveFileMetadata object or throw an error
    return { id: 'mockId', name: 'mockFile', appProperties: {} };
  };


  const { toastMessage, showToast } = useAppToast(); 
  const { appLogs, logAppEvent } = useAppLogger();   

  const contextValue: AppContextType = {
    currentConcept, setCurrentConcept, initialThemeForControls, setInitialThemeForControls,
    currentArtStyle, setCurrentArtStyle, initialArtStyleForControls, setInitialArtStyleForControls,
    currentAspectRatio, setCurrentAspectRatio, initialAspectRatioForControls, setInitialAspectRatioForControls,
    currentNegativePrompt, setCurrentNegativePrompt, initialNegativePromptForControls, setInitialNegativePromptForControls,
    currentCfgScale, setCurrentCfgScale, initialCfgScaleForControls, setInitialCfgScaleForControls,
    currentSteps, setCurrentSteps, initialStepsForControls, setInitialStepsForControls,
    currentSeed, setCurrentSeed, initialSeedForControls, setInitialSeedForControls,
    currentSampler, setCurrentSampler, initialSamplerForControls, setInitialSamplerForControls,
    currentStylePreset, setCurrentStylePreset, initialStylePresetForControls, setInitialStylePresetForControls,
    currentLeonardoPresetStyle, setCurrentLeonardoPresetStyle, initialLeonardoPresetStyleForControls, setInitialLeonardoPresetStyleForControls,
    currentUseAlchemy, setCurrentUseAlchemy, initialUseAlchemyForControls, setInitialUseAlchemyForControls,
    currentUsePhotoReal, setCurrentUsePhotoReal, initialUsePhotoRealForControls, setInitialUsePhotoRealForControls,
    appIsLoading, setAppIsLoading, isPlaying, setIsPlaying,
    userSavedConcepts, setUserSavedConcepts,
    imageProvidersConfig, setImageProvidersConfig, selectedImageProvider, setSelectedImageProvider,
    selectedModelId, setSelectedModelId, userApiKeys, setUserApiKeys,
    chatProvidersConfig, setChatProvidersConfig, selectedChatProviderId, setSelectedChatProviderId,
    selectedChatModelId, setSelectedChatModelId, userChatApiKeys, setUserChatApiKeys,
    currentChatSystemPromptBase, setCurrentChatSystemPromptBase, currentChatConfig, setCurrentChatConfig,
    useSearchGrounding, setUseSearchGrounding, driveSyncEnabled, setDriveSyncEnabled,
    
    // Drive related values (will be properly supplied by App.tsx using useDriveSync)
    isDriveAuthenticated, driveUserEmail, isDriveLoading, driveError, 
    setDriveError: placeholderSetDriveError, 
    handleToggleDriveSync: placeholderToggleDriveSync, 
    handleDriveSignIn: placeholderDriveSignIn, 
    handleDriveSignOut: placeholderDriveSignOut,
    uploadImageToDrive: placeholderUploadImageToDrive,
    
    showToast, logAppEvent, appLogs,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
      {toastMessage && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-gray-700 text-white px-4 py-2 rounded-md shadow-lg z-[200] text-sm animate-fadeInOut">
          {toastMessage}
        </div>
      )}
      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translate(-50%, 10px); }
          15% { opacity: 1; transform: translate(-50%, 0); }
          85% { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, 10px); }
        }
        .animate-fadeInOut {
          animation: fadeInOut 3s ease-in-out forwards;
        }
      `}</style>
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
