import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { useAppContext, AppProvider } from './AppContext'; 
import { remixConcept, enhancePrompt, generateTextFromImageAndPrompt } from './services/geminiService'; 
import { upscaleImageWithReplicate, upscaleWithClipdrop, inpaintWithClipdrop } from './services/imageEditingService';
import { generateVideoWithSVD } from './services/falService'; 
import { generateSoundscapeWithFal } from './services/audioService'; 
import { fetchStabilityAIModels, fetchLeonardoAIModels } from './services/modelDiscoveryService';
import ImageDisplay from './components/ImageDisplay';
import Controls from './components/Controls';
import ImageHistory from './components/ImageHistory';
import ErrorBoundary from './components/ErrorBoundary'; 
import FullscreenModal from './components/FullscreenModal'; 
import AdvancedSettingsModal from './components/AdvancedSettingsModal'; 
import ImageEditorDrawer from './components/ImageEditorDrawer';
import CameraCaptureModal from './components/CameraCaptureModal'; 
import GroundingInfoDisplay from './components/GroundingInfoDisplay';
import ChatDrawer from './components/ChatDrawer'; 
import CompareViewModal from './components/CompareViewModal'; 
import VideoDisplayModal from './components/VideoDisplayModal';
import AudioPlayer from './components/AudioPlayer';
import DriveBrowserModal from './components/DriveBrowserModal';
import OnboardingTour from './components/OnboardingTour';
import { urlToFile } from './utils';
import { useAppStore } from './stores/appStore';
import { useImageEditorStore } from './stores/imageEditorStore';

// Custom Hooks
import { useImageGeneration } from './hooks/useImageGeneration'; 
import { useDriveSync } from './hooks/useDriveSync'; 
import { useImageHistory } from './hooks/useImageHistory'; 
import { useChat } from './hooks/useChat'; 

import { 
    ImageHistoryItem, FullscreenImage, DriveFileMetadata, 
    LogEntryType, DevPlanData, TroubleshootingGuideData,
    ImageProviderId, UserApiKeys, PresetItem, HistoryActionType, ModelSetting,
    EditingError, ImageProviderSetting, MediaType, ChatProviderId, ChatProviderSetting, 
    UserChatApiKeys, ChatConfig, MAX_COMPARE_ITEMS
} from './types';
import { 
    PREDEFINED_CONCEPTS, ART_STYLES, IMAGE_PROVIDERS_STATIC, DEFAULT_ASPECT_RATIO, 
    REPLICATE_UPSCALER_MODEL_ID, COMMON_ASPECT_RATIOS, 
    CHAT_PROVIDERS_STATIC, DEFAULT_CHAT_SYSTEM_PROMPT_BASE, DEFAULT_CHAT_CONFIG,
    CLIPDROP_MODEL_ID_UPSCALE, CLIPDROP_MODEL_ID_INPAINT,
    DEFAULT_CFG_SCALE, DEFAULT_STEPS, DEFAULT_SEED, DEFAULT_ART_STYLE
} from './constants';
import { developmentPlanData } from './developmentPlan';
import { troubleshootingGuideData } from './troubleshootingGuide';


const APP_HEADER_HEIGHT_PX = 56; 
const DEFAULT_PROVIDER_ID: ImageProviderId = 'gemini';
const DEFAULT_MODEL_ID_FOR_PROVIDER = (providerId: ImageProviderId, providersConfig: ImageProviderSetting[]): string => {
    const provider = providersConfig.find(p => p.id === providerId);
    return provider?.models[0]?.id || IMAGE_PROVIDERS_STATIC.find(p => p.id === DEFAULT_PROVIDER_ID)!.models[0].id;
};
const DEFAULT_CHAT_PROVIDER_ID: ChatProviderId = 'gemini';
const DEFAULT_CHAT_MODEL_ID_FOR_PROVIDER = (providerId: ChatProviderId, providersConfig: ChatProviderSetting[]): string => {
    const provider = providersConfig.find(p => p.id === providerId);
    return provider?.models[0]?.id || CHAT_PROVIDERS_STATIC.find(p => p.id === DEFAULT_CHAT_PROVIDER_ID)!.models[0].id;
};


const AppContent: React.FC = () => {
  const {
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
    appIsLoading, setAppIsLoading, 
    isPlaying, setIsPlaying,
    userSavedConcepts, setUserSavedConcepts,
    imageProvidersConfig, setImageProvidersConfig,
    selectedImageProvider, setSelectedImageProvider,
    selectedModelId, setSelectedModelId,
    userApiKeys, setUserApiKeys,
    chatProvidersConfig, 
    selectedChatProviderId, setSelectedChatProviderId,
    selectedChatModelId, setSelectedChatModelId,
    userChatApiKeys, setUserChatApiKeys,
    currentChatSystemPromptBase, setCurrentChatSystemPromptBase,
    currentChatConfig, setCurrentChatConfig,
    useSearchGrounding, setUseSearchGrounding,
    driveSyncEnabled, setDriveSyncEnabled, 
    showToast, logAppEvent, appLogs 
  } = useAppContext();


  const [appError, setAppError] = useState<string | null>(null); 
  const [fullscreenImage, setFullscreenImage] = useState<FullscreenImage | null>(null);
  const [isControlsDrawerOpen, setIsControlsDrawerOpen] = useState<boolean>(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState<boolean>(false);
  const [isEditorDrawerOpen, setIsEditorDrawerOpen] = useState<boolean>(false); 
  
  const [isEditingLoading, setIsEditingLoading] = useState<boolean>(false); 
  const [editingError, setEditingError] = useState<EditingError | null>(null);

  const { isAdvancedSettingsOpen, openAdvancedSettings, closeAdvancedSettings } = useAppStore();
  const [isDiscoveringModels, setIsDiscoveringModels] = useState<boolean>(false); 

  const [mainImageZoomLevel, setMainImageZoomLevel] = useState<number>(1);
  const [mainImageIsFitToScreen, setMainImageIsFitToScreen] = useState<boolean>(true); 

  const [isCameraModalOpen, setIsCameraModalOpen] = useState<boolean>(false);
  const [isProcessingLiveQuery, setIsProcessingLiveQuery] = useState<boolean>(false);
  
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState<boolean>(false);
  const [isChatFullscreen, setIsChatFullscreen] = useState<boolean>(false);
  
  const [isCompareModeActive, setIsCompareModeActive] = useState<boolean>(false);
  const [selectedHistoryItemIdsForCompare, setSelectedHistoryItemIdsForCompare] = useState<string[]>([]);
  const [showCompareViewModal, setShowCompareViewModal] = useState<boolean>(false);

  const [isGeneratingVideo, setIsGeneratingVideo] = useState<boolean>(false);
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null); 
  const [isVideoModalOpen, setIsVideoModalOpen] = useState<boolean>(false); 
  const [isGeneratingAudio, setIsGeneratingAudio] = useState<boolean>(false); 
  const [audioSrcForPlayer, setAudioSrcForPlayer] = useState<string | null>(null);
  const [isAudioPlayerVisible, setIsAudioPlayerVisible] = useState<boolean>(false);
  const [audioTitleForPlayer, setAudioTitleForPlayer] = useState<string | null>(null);
  const [isDriveBrowserOpen, setIsDriveBrowserOpen] = useState<boolean>(false);
  const [isTourOpen, setIsTourOpen] = useState<boolean>(false);
  
  const {
    isDriveAuthenticated, driveUserEmail, isDriveLoading, driveError, setDriveError, 
    handleToggleDriveSync, handleDriveSignIn, handleDriveSignOut, 
    uploadImageToDrive: driveUploadService,
  } = useAppContext(); 

  const { imageHistory, addImageToHistory, deleteHistoryItem } = useImageHistory({
    logAppEvent, imageProvidersConfig, showToast,
  });

  const appStateSettersForImageGen = {
    setAppCurrentConcept: setCurrentConcept, setAppInitialThemeForControls: setInitialThemeForControls,
    setAppCurrentArtStyle: setCurrentArtStyle, setAppInitialArtStyleForControls: setInitialArtStyleForControls,
    setAppCurrentAspectRatio: setCurrentAspectRatio, setAppInitialAspectRatioForControls: setInitialAspectRatioForControls,
    setAppCurrentNegativePrompt: setCurrentNegativePrompt, setAppInitialNegativePromptForControls: setInitialNegativePromptForControls,
    setAppCurrentCfgScale: setCurrentCfgScale, setAppInitialCfgScaleForControls: setInitialCfgScaleForControls,
    setAppCurrentSteps: setCurrentSteps, setAppInitialStepsForControls: setInitialStepsForControls,
    setAppCurrentSeed: setCurrentSeed, setAppInitialSeedForControls: setInitialSeedForControls,
    setAppCurrentSampler: setCurrentSampler, setAppInitialSamplerForControls: setInitialSamplerForControls,
    setAppCurrentStylePreset: setCurrentStylePreset, setAppInitialStylePresetForControls: setInitialStylePresetForControls,
    setAppCurrentLeonardoPresetStyle: setCurrentLeonardoPresetStyle, setAppInitialLeonardoPresetStyleForControls: setInitialLeonardoPresetStyleForControls,
    setAppCurrentUseAlchemy: setCurrentUseAlchemy, setAppInitialUseAlchemyForControls: setInitialUseAlchemyForControls,
    setAppCurrentUsePhotoReal: setCurrentUsePhotoReal, setAppInitialUsePhotoRealForControls: setInitialUsePhotoRealForControls,
  };

  const updateAdvancedSettingsForModel = useCallback((providerId: ImageProviderId, modelId: string, fromHook: boolean = false) => {
    const provider = imageProvidersConfig.find(p => p.id === providerId);
    const model = provider?.models.find(m => m.id === modelId);

    if (model) {
      const newCfg = model.defaultCfgScale ?? DEFAULT_CFG_SCALE;
      const newSteps = model.defaultSteps ?? DEFAULT_STEPS;
      const newSeed = model.defaultSeed ?? DEFAULT_SEED; 
      const newSampler = model.availableSamplers?.[0] ?? undefined; 
      const newStylePreset = model.availableStylePresets?.[0] ?? undefined;
      const newLeoPreset = model.availableLeonardoPresetStyles?.[0] ?? "NONE";

      setCurrentCfgScale(newCfg); setInitialCfgScaleForControls(newCfg);
      setCurrentSteps(newSteps); setInitialStepsForControls(newSteps);
      setCurrentSeed(newSeed); setInitialSeedForControls(newSeed);
      setCurrentSampler(newSampler); setInitialSamplerForControls(newSampler);
      setCurrentStylePreset(newStylePreset); setInitialStylePresetForControls(newStylePreset);
      setCurrentLeonardoPresetStyle(newLeoPreset); setInitialLeonardoPresetStyleForControls(newLeoPreset);
      setCurrentUseAlchemy(model.supportsAlchemy ?? false); setInitialUseAlchemyForControls(model.supportsAlchemy ?? false);
      setCurrentUsePhotoReal(model.supportsPhotoReal ?? false); setInitialUsePhotoRealForControls(model.supportsPhotoReal ?? false);
      
      if (!fromHook) logAppEvent('SYSTEM', `Advanced settings updated for model ${model.displayName}`, { cfg: newCfg, steps: newSteps, seed: newSeed, sampler: newSampler, stylePreset: newStylePreset, leoPreset: newLeoPreset });
    }
  }, [imageProvidersConfig, logAppEvent, setCurrentCfgScale, setInitialCfgScaleForControls, setCurrentSteps, setInitialStepsForControls, setCurrentSeed, setInitialSeedForControls, setCurrentSampler, setInitialSamplerForControls, setCurrentStylePreset, setInitialStylePresetForControls, setCurrentLeonardoPresetStyle, setInitialLeonardoPresetStyleForControls, setCurrentUseAlchemy, setInitialUseAlchemyForControls, setCurrentUsePhotoReal, setInitialUsePhotoRealForControls]);


  const {
    currentImageUrl, currentPrompt, currentEvolvingConcept, 
    isLoading: isGenerationLoading, generationError, currentGroundingSources, 
    performSingleGeneration, startEvolution, stopEvolution,
  } = useImageGeneration({
    showToast, logAppEvent, addImageToHistory, uploadImageToDrive: driveUploadService, 
    setAppDriveError: setDriveError, setAppIsPlaying: setIsPlaying, 
    updateAppAdvancedSettingsForModel: updateAdvancedSettingsForModel, 
    ...appStateSettersForImageGen 
  });
  
  const handleToggleSearchGrounding = () => { setUseSearchGrounding(!useSearchGrounding); logAppEvent('SYSTEM', `Search Grounding toggled ${!useSearchGrounding ? 'ON' : 'OFF'}.`); };
  
  const handleRandomizeSettings = useCallback(() => {
    logAppEvent('INFO', 'Randomizing settings.');
    const randomConcept = PREDEFINED_CONCEPTS[Math.floor(Math.random() * PREDEFINED_CONCEPTS.length)];
    const allArtStyles: string[] = [];
    ART_STYLES.forEach(category => category.styles.forEach(style => allArtStyles.push(style)));
    const randomArtStyle = allArtStyles[Math.floor(Math.random() * allArtStyles.length)] || DEFAULT_ART_STYLE;

    setCurrentConcept(randomConcept); setInitialThemeForControls(randomConcept);
    setCurrentArtStyle(randomArtStyle); setInitialArtStyleForControls(randomArtStyle);
    
    // Reset advanced params to model defaults or app defaults
    const currentProvider = imageProvidersConfig.find(p => p.id === selectedImageProvider);
    const currentModel = currentProvider?.models.find(m => m.id === selectedModelId);
    
    const newCfg = currentModel?.defaultCfgScale ?? DEFAULT_CFG_SCALE;
    const newSteps = currentModel?.defaultSteps ?? DEFAULT_STEPS;
    const newSeed = DEFAULT_SEED; // Randomize seed by setting to undefined
    const newSampler = currentModel?.availableSamplers?.[0] ?? undefined;
    const newStylePreset = currentModel?.availableStylePresets?.[0] ?? undefined;
    const newLeoPreset = currentModel?.availableLeonardoPresetStyles?.[0] ?? "NONE";
    const newAlchemy = currentModel?.supportsAlchemy ?? false;
    const newPhotoReal = currentModel?.supportsPhotoReal ?? false;

    setCurrentCfgScale(newCfg); setInitialCfgScaleForControls(newCfg);
    setCurrentSteps(newSteps); setInitialStepsForControls(newSteps);
    setCurrentSeed(newSeed); setInitialSeedForControls(newSeed);
    setCurrentSampler(newSampler); setInitialSamplerForControls(newSampler);
    setCurrentStylePreset(newStylePreset); setInitialStylePresetForControls(newStylePreset);
    setCurrentLeonardoPresetStyle(newLeoPreset); setInitialLeonardoPresetStyleForControls(newLeoPreset);
    setCurrentUseAlchemy(newAlchemy); setInitialUseAlchemyForControls(newAlchemy);
    setCurrentUsePhotoReal(newPhotoReal); setInitialUsePhotoRealForControls(newPhotoReal);
    showToast("Concept, Art Style & Advanced Settings Randomized/Reset!", 2500);
  }, [selectedImageProvider, selectedModelId, imageProvidersConfig, logAppEvent, showToast, 
      setCurrentConcept, setInitialThemeForControls, setCurrentArtStyle, setInitialArtStyleForControls, 
      setCurrentCfgScale, setInitialCfgScaleForControls, setCurrentSteps, setInitialStepsForControls, 
      setCurrentSeed, setInitialSeedForControls, setCurrentSampler, setInitialSamplerForControls, 
      setCurrentStylePreset, setInitialStylePresetForControls, setCurrentLeonardoPresetStyle, setInitialLeonardoPresetStyleForControls, 
      setCurrentUseAlchemy, setInitialUseAlchemyForControls, setCurrentUsePhotoReal, setInitialUsePhotoRealForControls]); 


  const functionCallHandlers = {
    onUpdateArtStyle: (newStyle: string) => { setCurrentArtStyle(newStyle); setInitialArtStyleForControls(newStyle); logAppEvent('INFO', 'Art style changed via chat.', { newStyle }); },
    onUpdateNegativePrompt: (newNegativePrompt: string) => { setCurrentNegativePrompt(newNegativePrompt); setInitialNegativePromptForControls(newNegativePrompt); logAppEvent('INFO', 'Negative prompt changed via chat.', { newNegativePrompt }); },
    onUpdateTheme: (newTheme: string) => { setCurrentConcept(newTheme); setInitialThemeForControls(newTheme); logAppEvent('INFO', 'Theme changed via chat.', { newTheme }); },
    onSetSeed: (value?: number) => { setCurrentSeed(value); setInitialSeedForControls(value); logAppEvent('INFO', 'Seed changed via chat.', { value: value === undefined ? 'Random' : value }); },
    onSetCfgScale: (value: number) => { setCurrentCfgScale(value); setInitialCfgScaleForControls(value); logAppEvent('INFO', 'CFG Scale changed via chat.', { value }); },
    onSetAspectRatio: (newRatio: string) => { setCurrentAspectRatio(newRatio); setInitialAspectRatioForControls(newRatio); logAppEvent('INFO', 'Aspect ratio changed via chat.', { newRatio }); },
    onSelectRandomConcept: handleRandomizeSettings,
    onGenerateImageNow: () => {
      handleGenerateSingle( // Use current values from context
        currentConcept, currentArtStyle, currentAspectRatio, currentNegativePrompt,
        currentCfgScale, currentSteps, currentSeed, currentSampler, currentStylePreset,
        currentLeonardoPresetStyle, currentUseAlchemy, currentUsePhotoReal
      );
    }
  };

  const {
    chatMessages, isChatLoading, initializeChatSession, sendChatMessage, clearChatSessionData
  } = useChat({
    appCurrentConcept: currentConcept, appCurrentArtStyle: currentArtStyle, appImageHistory: imageHistory,
    appSelectedImageProviderId: selectedImageProvider, appSelectedImageModelId: selectedModelId,
    chatSelectedProviderId: selectedChatProviderId, 
    chatSelectedModelId: selectedChatModelId, 
    chatProvidersConfig, 
    chatUserChatApiKeys: userChatApiKeys,
    chatCurrentSystemPromptBase: currentChatSystemPromptBase, 
    chatCurrentConfig: currentChatConfig,
    showToast, logAppEvent,
    functionCallHandlers
  });
  
  useEffect(() => {
    if (generationError) {
      setAppError(generationError);
    }
  }, [generationError]);

  useEffect(() => {
    setAppIsLoading(isGenerationLoading || isDriveLoading || isGeneratingVideo || isGeneratingAudio); 
  }, [isGenerationLoading, isDriveLoading, isGeneratingVideo, isGeneratingAudio, setAppIsLoading]);


  const updateModelsForProvider = useCallback((providerId: ImageProviderId, newModels: ModelSetting[]) => {
    setImageProvidersConfig(
        prevConfig => prevConfig.map(provider => { 
            if (provider.id === providerId) {
                if (newModels.length === 0) {
                    const staticProvider = IMAGE_PROVIDERS_STATIC.find(p => p.id === providerId);
                    logAppEvent('MODEL_DISCOVERY', `No models returned dynamically for ${providerId}. Reverting to static definition.`, { providerId });
                    return { ...provider, models: staticProvider ? staticProvider.models : [] };
                }
                logAppEvent('MODEL_DISCOVERY', `Successfully updated models for ${providerId}. Found ${newModels.length} models.`, { providerId, models: newModels.map(m=>m.displayName) });
                return { ...provider, models: newModels };
            }
            return provider;
        })
    );
  }, [logAppEvent, setImageProvidersConfig]);

  const fetchDynamicModels = useCallback(async (providerId: ImageProviderId, apiKey: string) => {
    if (!apiKey) return;
    logAppEvent('MODEL_DISCOVERY', `Fetching dynamic models for ${providerId}...`);
    try {
      let models: ModelSetting[] = [];
      if (providerId === 'stability_ai') {
        models = await fetchStabilityAIModels(apiKey);
      } else if (providerId === 'leonardo_ai') {
        models = await fetchLeonardoAIModels(apiKey);
      }
      
      if (models.length > 0) {
        updateModelsForProvider(providerId, models);
      } else {
         logAppEvent('MODEL_DISCOVERY', `No models discovered dynamically for ${providerId}. Using fallback/static list.`, { providerId });
         const staticProvider = IMAGE_PROVIDERS_STATIC.find(p => p.id === providerId);
         if(staticProvider) updateModelsForProvider(providerId, staticProvider.models);
      }
    } catch (error: any) {
      logAppEvent('ERROR', `Failed to fetch dynamic models for ${providerId}: ${error.message}`, { providerId, error });
      const staticProvider = IMAGE_PROVIDERS_STATIC.find(p => p.id === providerId);
      if (staticProvider) {
        updateModelsForProvider(providerId, staticProvider.models);
      }
    }
  }, [logAppEvent, updateModelsForProvider]);


  useEffect(() => {
    logAppEvent('SYSTEM', 'App component mounted. Loading initial state from localStorage.');
    try {
      const savedDriveSync = localStorage.getItem('driveSyncEnabled');
      if (savedDriveSync) setDriveSyncEnabled(savedDriveSync === 'true');
      const savedConcepts = localStorage.getItem('userSavedConcepts');
      if (savedConcepts) setUserSavedConcepts(JSON.parse(savedConcepts));

      const savedNegativePrompt = localStorage.getItem('currentNegativePrompt');
      if (savedNegativePrompt) { setCurrentNegativePrompt(savedNegativePrompt); setInitialNegativePromptForControls(savedNegativePrompt); }
      const savedAspectRatio = localStorage.getItem('currentAspectRatio');
      if (savedAspectRatio) { setCurrentAspectRatio(savedAspectRatio); setInitialAspectRatioForControls(savedAspectRatio); }

      const savedCfgScale = localStorage.getItem('currentCfgScale');
      if (savedCfgScale) { const val = parseFloat(savedCfgScale); setCurrentCfgScale(val); setInitialCfgScaleForControls(val); }
      const savedSteps = localStorage.getItem('currentSteps');
      if (savedSteps) { const val = parseInt(savedSteps, 10); setCurrentSteps(val); setInitialStepsForControls(val); }
      
      const savedSeed = localStorage.getItem('currentSeed');
      if (savedSeed) { 
        const val = parseInt(savedSeed, 10); 
        if(!isNaN(val)) {
          setCurrentSeed(val); 
          setInitialSeedForControls(val);
        } else { 
          setCurrentSeed(DEFAULT_SEED); 
          setInitialSeedForControls(DEFAULT_SEED);
        }
      } else { 
        setCurrentSeed(DEFAULT_SEED); 
        setInitialSeedForControls(DEFAULT_SEED);
      }

      const savedSampler = localStorage.getItem('currentSampler');
      if (savedSampler) { setCurrentSampler(savedSampler); setInitialSamplerForControls(savedSampler); }
      const savedStylePreset = localStorage.getItem('currentStylePreset');
      if (savedStylePreset) { setCurrentStylePreset(savedStylePreset); setInitialStylePresetForControls(savedStylePreset); }
      const savedLeoPreset = localStorage.getItem('currentLeonardoPresetStyle');
      if (savedLeoPreset) { setCurrentLeonardoPresetStyle(savedLeoPreset); setInitialLeonardoPresetStyleForControls(savedLeoPreset); }
      const savedUseAlchemy = localStorage.getItem('currentUseAlchemy');
      if (savedUseAlchemy) { const val = savedUseAlchemy === 'true'; setCurrentUseAlchemy(val); setInitialUseAlchemyForControls(val); }
      const savedUsePhotoReal = localStorage.getItem('currentUsePhotoReal');
      if (savedUsePhotoReal) { const val = savedUsePhotoReal === 'true'; setCurrentUsePhotoReal(val); setInitialUsePhotoRealForControls(val); }

      const tempImageProvidersConfig = JSON.parse(JSON.stringify(IMAGE_PROVIDERS_STATIC));
      const savedProviderId = localStorage.getItem('selectedImageProvider') as ImageProviderId | null;
      const providerExists = tempImageProvidersConfig.find(p => p.id === savedProviderId);
      let effectiveProviderId: ImageProviderId = DEFAULT_PROVIDER_ID;
      if (savedProviderId && providerExists) effectiveProviderId = savedProviderId;
      setSelectedImageProvider(effectiveProviderId);

      const savedModelId = localStorage.getItem('selectedModelId');
      const currentProviderForSavedModel = tempImageProvidersConfig.find(p => p.id === effectiveProviderId);
      const modelExistsInProvider = currentProviderForSavedModel?.models.find(m => m.id === savedModelId);
      if (savedModelId && modelExistsInProvider) {
        setSelectedModelId(savedModelId);
      } else {
        setSelectedModelId(DEFAULT_MODEL_ID_FOR_PROVIDER(effectiveProviderId, tempImageProvidersConfig));
      }
      
      const savedUserKeys = localStorage.getItem('userApiKeys');
      if (savedUserKeys) {
          const parsedKeys: UserApiKeys = JSON.parse(savedUserKeys);
          setUserApiKeys(parsedKeys);
          IMAGE_PROVIDERS_STATIC.forEach(providerConf => {
              if (providerConf.isDynamic && parsedKeys[providerConf.id]) {
                  fetchDynamicModels(providerConf.id, parsedKeys[providerConf.id] as string);
              }
          });
      }
      const loadedPresets = localStorage.getItem('etherscapePresets'); 
      if (loadedPresets) setSavedPresets(JSON.parse(loadedPresets));
      const savedMainImageFit = localStorage.getItem('mainImageIsFitToScreen');
      if (savedMainImageFit !== null) setMainImageIsFitToScreen(savedMainImageFit === 'true');
      const savedMainImageZoom = localStorage.getItem('mainImageZoomLevel');
      if (savedMainImageZoom !== null) setMainImageZoomLevel(parseFloat(savedMainImageZoom));
      
      const savedUseSearchGrounding = localStorage.getItem('useSearchGrounding');
      if (savedUseSearchGrounding) setUseSearchGrounding(savedUseSearchGrounding === 'true');

      const savedChatProviderId = localStorage.getItem('selectedChatProviderId') as ChatProviderId | null;
      const chatProviderExists = CHAT_PROVIDERS_STATIC.find(p => p.id === savedChatProviderId);
      let effectiveChatProviderId: ChatProviderId = DEFAULT_CHAT_PROVIDER_ID;
      if (savedChatProviderId && chatProviderExists) effectiveChatProviderId = savedChatProviderId;
      setSelectedChatProviderId(effectiveChatProviderId);

      const savedChatModelId = localStorage.getItem('selectedChatModelId');
      const currentChatProviderForSavedModel = CHAT_PROVIDERS_STATIC.find(p => p.id === effectiveChatProviderId);
      const chatModelExistsInProvider = currentChatProviderForSavedModel?.models.find(m => m.id === savedChatModelId);
      if (savedChatModelId && chatModelExistsInProvider) {
          setSelectedChatModelId(savedChatModelId);
      } else {
          setSelectedChatModelId(DEFAULT_CHAT_MODEL_ID_FOR_PROVIDER(effectiveChatProviderId, CHAT_PROVIDERS_STATIC));
      }

      const savedUserChatKeys = localStorage.getItem('userChatApiKeys');
      if (savedUserChatKeys) setUserChatApiKeys(JSON.parse(savedUserChatKeys));
      const savedChatSystemPrompt = localStorage.getItem('currentChatSystemPromptBase');
      if (savedChatSystemPrompt) setCurrentChatSystemPromptBase(savedChatSystemPrompt);
      const savedChatConfig = localStorage.getItem('currentChatConfig');
      if (savedChatConfig) setCurrentChatConfig(JSON.parse(savedChatConfig));

      logAppEvent('SYSTEM', 'Initial state loaded successfully.');
    } catch (e: any) {
      console.error("Failed to load one or more items from localStorage", e);
      logAppEvent('ERROR', 'Failed to load initial state from localStorage', { error: e.message });
    }
  }, [ logAppEvent, fetchDynamicModels, setDriveSyncEnabled, setUserSavedConcepts, setCurrentNegativePrompt, setInitialNegativePromptForControls, setCurrentAspectRatio, setInitialAspectRatioForControls, setCurrentCfgScale, setInitialCfgScaleForControls, setCurrentSteps, setInitialStepsForControls, setCurrentSeed, setInitialSeedForControls, setCurrentSampler, setInitialSamplerForControls, setCurrentStylePreset, setInitialStylePresetForControls, setCurrentLeonardoPresetStyle, setInitialLeonardoPresetStyleForControls, setCurrentUseAlchemy, setInitialUseAlchemyForControls, setCurrentUsePhotoReal, setInitialUsePhotoRealForControls, setSelectedImageProvider, setSelectedModelId, setUserApiKeys, setUseSearchGrounding, setSelectedChatProviderId, setSelectedChatModelId, setUserChatApiKeys, setCurrentChatSystemPromptBase, setCurrentChatConfig ]); 

  useEffect(() => { localStorage.setItem('driveSyncEnabled', String(driveSyncEnabled)); }, [driveSyncEnabled]);
  useEffect(() => { localStorage.setItem('userSavedConcepts', JSON.stringify(userSavedConcepts)); }, [userSavedConcepts]);
  useEffect(() => { localStorage.setItem('selectedImageProvider', selectedImageProvider); }, [selectedImageProvider]);
  useEffect(() => { localStorage.setItem('selectedModelId', selectedModelId); }, [selectedModelId]);
  useEffect(() => { localStorage.setItem('userApiKeys', JSON.stringify(userApiKeys)); }, [userApiKeys]);
  useEffect(() => { localStorage.setItem('currentNegativePrompt', currentNegativePrompt); }, [currentNegativePrompt]);
  useEffect(() => { localStorage.setItem('currentAspectRatio', currentAspectRatio); }, [currentAspectRatio]);
  useEffect(() => { localStorage.setItem('etherscapePresets', JSON.stringify(savedPresets));}, [savedPresets]); 
  useEffect(() => { localStorage.setItem('mainImageIsFitToScreen', String(mainImageIsFitToScreen)); }, [mainImageIsFitToScreen]);
  useEffect(() => { localStorage.setItem('mainImageZoomLevel', String(mainImageZoomLevel)); }, [mainImageZoomLevel]);
  useEffect(() => { localStorage.setItem('currentCfgScale', String(currentCfgScale)); }, [currentCfgScale]);
  useEffect(() => { localStorage.setItem('currentSteps', String(currentSteps)); }, [currentSteps]);
  useEffect(() => { 
    if(currentSeed !== undefined) localStorage.setItem('currentSeed', String(currentSeed)); 
    else localStorage.removeItem('currentSeed'); 
  }, [currentSeed]);
  useEffect(() => { if(currentSampler) localStorage.setItem('currentSampler', currentSampler); else localStorage.removeItem('currentSampler'); }, [currentSampler]);
  useEffect(() => { if(currentStylePreset) localStorage.setItem('currentStylePreset', currentStylePreset); else localStorage.removeItem('currentStylePreset'); }, [currentStylePreset]);
  useEffect(() => { if(currentLeonardoPresetStyle) localStorage.setItem('currentLeonardoPresetStyle', currentLeonardoPresetStyle); else localStorage.removeItem('currentLeonardoPresetStyle'); }, [currentLeonardoPresetStyle]);
  useEffect(() => { localStorage.setItem('currentUseAlchemy', String(currentUseAlchemy)); }, [currentUseAlchemy]);
  useEffect(() => { localStorage.setItem('currentUsePhotoReal', String(currentUsePhotoReal)); }, [currentUsePhotoReal]);
  useEffect(() => { localStorage.setItem('useSearchGrounding', String(useSearchGrounding)); }, [useSearchGrounding]);
  
  useEffect(() => { localStorage.setItem('selectedChatProviderId', selectedChatProviderId); }, [selectedChatProviderId]);
  useEffect(() => { localStorage.setItem('selectedChatModelId', selectedChatModelId); }, [selectedChatModelId]);
  useEffect(() => { localStorage.setItem('userChatApiKeys', JSON.stringify(userChatApiKeys)); }, [userChatApiKeys]);
  useEffect(() => { localStorage.setItem('currentChatSystemPromptBase', currentChatSystemPromptBase); }, [currentChatSystemPromptBase]);
  useEffect(() => { localStorage.setItem('currentChatConfig', JSON.stringify(currentChatConfig)); }, [currentChatConfig]);


  useEffect(() => {
    if (!isPlaying) {
      stopEvolution();
    }
  }, [isPlaying, stopEvolution]);


  const handleStart = (
    theme: string, artStyle: string, aspectRatio: string, negativePrompt?: string,
    cfgScaleNum?: number, stepsNum?: number, seedNum?: number, samplerStr?: string, stylePresetStr?: string, 
    leonardoPresetStyleStr?: string, useAlchemyBool?: boolean, usePhotoRealBool?: boolean
  ) => {
    setAppError(null); setDriveError(null); 

    // Update main context states based on values from Controls.tsx
    setCurrentConcept(theme); setInitialThemeForControls(theme);
    setCurrentArtStyle(artStyle); setInitialArtStyleForControls(artStyle); 
    setCurrentAspectRatio(aspectRatio); setInitialAspectRatioForControls(aspectRatio);
    setCurrentNegativePrompt(negativePrompt || ""); setInitialNegativePromptForControls(negativePrompt || "");
    
    setCurrentCfgScale(cfgScaleNum ?? DEFAULT_CFG_SCALE); setInitialCfgScaleForControls(cfgScaleNum ?? DEFAULT_CFG_SCALE);
    setCurrentSteps(stepsNum ?? DEFAULT_STEPS); setInitialStepsForControls(stepsNum ?? DEFAULT_STEPS);
    setCurrentSeed(seedNum); setInitialSeedForControls(seedNum); // undefined is fine for random
    setCurrentSampler(samplerStr); setInitialSamplerForControls(samplerStr); 
    setCurrentStylePreset(stylePresetStr); setInitialStylePresetForControls(stylePresetStr);
    setCurrentLeonardoPresetStyle(leonardoPresetStyleStr); setInitialLeonardoPresetStyleForControls(leonardoPresetStyleStr);
    setCurrentUseAlchemy(useAlchemyBool ?? false); setInitialUseAlchemyForControls(useAlchemyBool ?? false);
    setCurrentUsePhotoReal(usePhotoRealBool ?? false); setInitialUsePhotoRealForControls(usePhotoRealBool ?? false);

    setIsPlaying(true); 
    const generationSettings = {
      concept: theme, artStyle, aspectRatio, negativePrompt,
      cfgScale: cfgScaleNum ?? DEFAULT_CFG_SCALE, 
      steps: stepsNum ?? DEFAULT_STEPS, 
      seed: seedNum, sampler: samplerStr, stylePreset: stylePresetStr,
      leonardoPresetStyle: leonardoPresetStyleStr, 
      useAlchemy: useAlchemyBool ?? false, 
      usePhotoReal: usePhotoRealBool ?? false,
      selectedImageProvider, selectedModelId, userApiKeys, imageProvidersConfig, useSearchGrounding,
      driveSyncEnabled, isDriveAuthenticated,
      mediaType: 'image' as MediaType
    };
    logAppEvent('INFO', 'Evolution started.', { ...generationSettings });
    startEvolution(generationSettings);
  };

  const handleStop = () => { setIsPlaying(false); stopEvolution(); logAppEvent('INFO', 'Evolution stopped by App.'); };

  const handleGenerateSingle = (
    theme: string, artStyle: string, aspectRatio: string, negativePrompt?: string,
    cfgScaleNum?: number, stepsNum?: number, seedNum?:number, samplerStr?: string, stylePresetStr?: string, 
    leonardoPresetStyleStr?: string, useAlchemyBool?: boolean, usePhotoRealBool?: boolean
  ) => {
    setAppError(null); setDriveError(null); 
    
    // Update main context states based on values from Controls.tsx
    setCurrentConcept(theme); setInitialThemeForControls(theme);
    setCurrentArtStyle(artStyle); setInitialArtStyleForControls(artStyle);
    setCurrentAspectRatio(aspectRatio); setInitialAspectRatioForControls(aspectRatio);
    setCurrentNegativePrompt(negativePrompt || ""); setInitialNegativePromptForControls(negativePrompt || "");
    
    setCurrentCfgScale(cfgScaleNum ?? DEFAULT_CFG_SCALE); setInitialCfgScaleForControls(cfgScaleNum ?? DEFAULT_CFG_SCALE);
    setCurrentSteps(stepsNum ?? DEFAULT_STEPS); setInitialStepsForControls(stepsNum ?? DEFAULT_STEPS);
    setCurrentSeed(seedNum); setInitialSeedForControls(seedNum);
    setCurrentSampler(samplerStr); setInitialSamplerForControls(samplerStr);
    setCurrentStylePreset(stylePresetStr); setInitialStylePresetForControls(stylePresetStr);
    setCurrentLeonardoPresetStyle(leonardoPresetStyleStr); setInitialLeonardoPresetStyleForControls(leonardoPresetStyleStr);
    setCurrentUseAlchemy(useAlchemyBool ?? false); setInitialUseAlchemyForControls(useAlchemyBool ?? false);
    setCurrentUsePhotoReal(usePhotoRealBool ?? false); setInitialUsePhotoRealForControls(usePhotoRealBool ?? false);

    setIsPlaying(false); 
    stopEvolution(); 
    
    const generationSettings = {
        concept: theme, artStyle, aspectRatio, negativePrompt,
        cfgScale: cfgScaleNum ?? DEFAULT_CFG_SCALE, 
        steps: stepsNum ?? DEFAULT_STEPS, 
        seed: seedNum, sampler: samplerStr, stylePreset: stylePresetStr,
        leonardoPresetStyle: leonardoPresetStyleStr, 
        useAlchemy: useAlchemyBool ?? false, 
        usePhotoReal: usePhotoRealBool ?? false,
        selectedImageProvider, selectedModelId, userApiKeys, imageProvidersConfig, useSearchGrounding,
        driveSyncEnabled, isDriveAuthenticated,
        mediaType: 'image' as MediaType
    };
    logAppEvent('INFO', 'Single image generation requested.', { ...generationSettings });
    performSingleGeneration(generationSettings);
  };
  
  const handleGenerateWithLeonardoImg2Img = (
    baseImageDataUrl: string, strength: number, sourceHistoryId?: string
  ) => {
    setAppError(null); setDriveError(null); 
    setIsPlaying(false); stopEvolution();

    const generationSettings = { // Uses current settings from context for Img2Img
        concept: currentConcept, artStyle: currentArtStyle, aspectRatio: currentAspectRatio, 
        negativePrompt: currentNegativePrompt, cfgScale: currentCfgScale, steps: currentSteps, seed: currentSeed, 
        sampler: currentSampler, stylePreset: currentStylePreset, leonardoPresetStyle: currentLeonardoPresetStyle,
        useAlchemy: currentUseAlchemy, usePhotoReal: currentUsePhotoReal,
        selectedImageProvider, selectedModelId, userApiKeys, imageProvidersConfig, useSearchGrounding,
        driveSyncEnabled, isDriveAuthenticated,
        leonardoInitialImageDataUrl: baseImageDataUrl, leonardoInitStrength: strength, sourceImageForImg2ImgId: sourceHistoryId,
        mediaType: 'image' as MediaType
    };
    logAppEvent('INFO', 'Leonardo.Ai Image-to-Image generation requested.', { 
        provider: 'leonardo_ai', model: selectedModelId, concept: generationSettings.concept,
        strength: generationSettings.leonardoInitStrength, baseImageProvided: !!baseImageDataUrl 
    });
    if (selectedImageProvider !== 'leonardo_ai') {
        showToast("Switching to Leonardo.Ai for Image-to-Image generation.", 3000);
        setSelectedImageProvider('leonardo_ai');
        const leoProviderConf = imageProvidersConfig.find(p => p.id === 'leonardo_ai');
        const currentLeoModelConf = leoProviderConf?.models.find(m => m.id === selectedModelId);
        if (!currentLeoModelConf || !currentLeoModelConf.supportsImageToImage) {
            const defaultLeoImg2ImgModel = leoProviderConf?.models.find(m => m.supportsImageToImage);
            if (defaultLeoImg2ImgModel) {
                setSelectedModelId(defaultLeoImg2ImgModel.id);
                updateAdvancedSettingsForModel('leonardo_ai', defaultLeoImg2ImgModel.id, true);
                 performSingleGeneration({...generationSettings, selectedImageProvider: 'leonardo_ai', selectedModelId: defaultLeoImg2ImgModel.id });
            } else {
                 showToast("No Leonardo.Ai model supporting Image-to-Image found. Please select one in Advanced Settings.", 4000);
                 logAppEvent('ERROR', "Cannot perform Leonardo Img2Img: No suitable model found after switching provider.", { currentModel: selectedModelId });
                 return; 
            }
        } else {
            performSingleGeneration({...generationSettings, selectedImageProvider: 'leonardo_ai' });
        }
    } else {
         performSingleGeneration(generationSettings);
    }
  };

  const handleSaveConcept = (conceptToSave: string) => {
    if (!userSavedConcepts.includes(conceptToSave)) {
      setUserSavedConcepts([conceptToSave, ...userSavedConcepts]);
      showToast(`Concept "${conceptToSave}" saved!`, 2000);
      logAppEvent('INFO', 'User concept saved.', { concept: conceptToSave });
    } else {
      showToast(`Concept "${conceptToSave}" is already saved.`, 2000);
    }
  };
  
  const handleAnimateWithSVD = async (item: ImageHistoryItem) => {
    logAppEvent('VIDEO', `SVD Animation requested for image item: ${item.id} - ${item.concept}`);
    if (isGeneratingVideo || isGeneratingAudio) {
        showToast("Another multimedia generation (video/audio) is already in progress.", 3000);
        return;
    }
    const falAuthToken = userApiKeys.fal_ai;
    if (!falAuthToken || falAuthToken.trim() === '') {
        showToast("Fal.ai Auth Token required for SVD animation. Please set it in Advanced Settings.", 4000);
        logAppEvent('WARNING', 'SVD Animation attempt failed: Fal.ai Auth Token missing.');
        return;
    }
    
    setIsGeneratingVideo(true);
    showToast(`Initiating SVD animation for "${item.concept.substring(0,30)}..."`, 3500);
    
    try {
        const imageFile = await urlToFile(item.imageUrl, `svd_input_${item.id}.png`);
        const svdSeed = undefined; 
        const svdMotionBucketId = 127;
        const svdNoiseAugStrength = 0.02;

        const videoUrl = await generateVideoWithSVD(
            falAuthToken, 
            imageFile, 
            svdSeed, 
            svdMotionBucketId, 
            svdNoiseAugStrength
        );
        
        logAppEvent('VIDEO', `SVD animation successful. Video URL: ${videoUrl}`, { historyItemId: item.id });
        showToast(`SVD animation successful! Opening video...`, 5000);
        
        if (videoUrl.startsWith('http')) {
            setVideoModalUrl(videoUrl);
            setIsVideoModalOpen(true);
            const videoConcept = `Animation of: ${item.concept}`;
            const videoPrompt = `SVD animation based on prompt: ${item.prompt}`;
            const videoHistoryItem = addImageToHistory(
                videoUrl, videoPrompt, videoConcept, 'video', item.artStyle || "N/A", item.aspectRatio, 
                'fal_ai', 'stable-video-diffusion', 
                undefined, undefined, false, item.id, undefined, undefined, svdSeed
            );
            logAppEvent('VIDEO', 'SVD Video added to history.', { videoId: videoHistoryItem.id, sourceImageId: item.id });
        }

    } catch (error: any) {
        logAppEvent('ERROR', `SVD Animation failed for item ${item.id}: ${error.message}`, { error });
        showToast(`SVD Animation failed: ${error.message}`, 4000);
    } finally {
        setIsGeneratingVideo(false);
        if (fullscreenImage?.id === item.id && fullscreenImage.mediaType === 'image') { 
            setFullscreenImage(null);
        }
    }
  };

  const handleGenerateSoundscape = async (item: ImageHistoryItem) => {
    logAppEvent('AUDIO', `Soundscape generation requested for image item: ${item.id} - "${item.concept}" (using prompt: "${item.prompt}")`);
     if (isGeneratingAudio || isGeneratingVideo) {
        showToast("Another multimedia generation (audio/video) is already in progress.", 3000);
        return;
    }
    const falAuthToken = userApiKeys.fal_ai;
    if (!falAuthToken || falAuthToken.trim() === '') { 
        showToast("Fal.ai Auth Token required for AudioGen. Please set it in Advanced Settings.", 4000);
        logAppEvent('WARNING', 'AudioGen attempt failed: Fal.ai Auth Token missing.');
        return;
    }

    setIsGeneratingAudio(true);
    setIsAudioPlayerVisible(false); 
    setAudioSrcForPlayer(null);
    showToast(`Generating soundscape for "${item.concept.substring(0, 30)}..."`, 3500);

    try {
        const audioUrl = await generateSoundscapeWithFal(
            falAuthToken,
            item.prompt, 
            15 
        );
        logAppEvent('AUDIO', `Soundscape generation successful for "${item.concept}". Audio URL: ${audioUrl}`);
        
        const audioConcept = `Soundscape for: ${item.concept}`;
        const audioPrompt = `AudioGen based on prompt: ${item.prompt}`;
        const audioHistoryItem = addImageToHistory(
            audioUrl, audioPrompt, audioConcept, 'audio', item.artStyle || "N/A", 'N/A', 
            'fal_ai', 'audiogen', 
            undefined, undefined, false, item.id
        );
        logAppEvent('AUDIO', 'AudioGen soundscape added to history.', { audioId: audioHistoryItem.id, sourceImageId: item.id });
        
        setAudioSrcForPlayer(audioUrl);
        setAudioTitleForPlayer(audioConcept);
        setIsAudioPlayerVisible(true);
        showToast(`Soundscape for "${item.concept}" ready!`, 4000);

    } catch (error: any) {
        logAppEvent('ERROR', `AudioGen failed for item ${item.id}: ${error.message}`, { error });
        showToast(`Soundscape generation failed: ${error.message}`, 4000);
    } finally {
        setIsGeneratingAudio(false);
         if (fullscreenImage?.id === item.id && fullscreenImage.mediaType === 'image') { 
            setFullscreenImage(null); 
        }
    }
  };

  const handleHistoryItemAction = async (action: HistoryActionType, item: ImageHistoryItem) => {
    setIsPlaying(false); stopEvolution();
    setDriveError(null); 

    const itemArtStyle = item.artStyle || DEFAULT_ART_STYLE; 
    const itemAspectRatio = item.aspectRatio || DEFAULT_ASPECT_RATIO;
    const itemProviderId = item.provider || DEFAULT_PROVIDER_ID;
    
    let itemModelId = item.modelId;
    const providerConfigForHistoryItem = imageProvidersConfig.find(p => p.id === itemProviderId);
    if (!providerConfigForHistoryItem?.models.find(m => m.id === itemModelId)) {
        itemModelId = DEFAULT_MODEL_ID_FOR_PROVIDER(itemProviderId, imageProvidersConfig);
        logAppEvent('WARNING', `Model ${item.modelId} not found for provider ${itemProviderId} on history action. Using default: ${itemModelId}`, { originalModelId: item.modelId });
    }
    const itemNegativePrompt = item.negativePrompt || "";

    const modelCfgForHistory = providerConfigForHistoryItem?.models.find(m=>m.id === itemModelId);
    const itemCfgScale = item.cfgScale ?? modelCfgForHistory?.defaultCfgScale ?? DEFAULT_CFG_SCALE;
    const itemSteps = item.steps ?? modelCfgForHistory?.defaultSteps ?? DEFAULT_STEPS;
    const itemSeed = item.seed ?? modelCfgForHistory?.defaultSeed ?? DEFAULT_SEED; 
    const itemSampler = item.sampler; 
    const itemStylePreset = item.stylePreset; 
    const itemLeonardoPresetStyle = item.leonardoPresetStyle;
    const itemUseAlchemy = item.useAlchemy ?? false; 
    const itemUsePhotoReal = item.usePhotoReal ?? false;

    logAppEvent('INFO', `History action: ${action} on item '${item.concept.substring(0,20)}...' (Type: ${item.mediaType})`);
    
    const updateCurrentSettingsFromHistoryItem = () => {
        setCurrentConcept(item.concept); setCurrentArtStyle(itemArtStyle); setCurrentAspectRatio(itemAspectRatio); setCurrentNegativePrompt(itemNegativePrompt);
        setInitialThemeForControls(item.concept); setInitialArtStyleForControls(itemArtStyle); setInitialAspectRatioForControls(itemAspectRatio); setInitialNegativePromptForControls(itemNegativePrompt);
        setSelectedImageProvider(itemProviderId); setSelectedModelId(itemModelId || DEFAULT_MODEL_ID_FOR_PROVIDER(itemProviderId, imageProvidersConfig) );
        
        // Also update advanced generation parameters in context
        setCurrentCfgScale(itemCfgScale); setInitialCfgScaleForControls(itemCfgScale);
        setCurrentSteps(itemSteps); setInitialStepsForControls(itemSteps);
        setCurrentSeed(itemSeed); setInitialSeedForControls(itemSeed); // itemSeed can be undefined
        setCurrentSampler(itemSampler); setInitialSamplerForControls(itemSampler);
        setCurrentStylePreset(itemStylePreset); setInitialStylePresetForControls(itemStylePreset);
        setCurrentLeonardoPresetStyle(itemLeonardoPresetStyle); setInitialLeonardoPresetStyleForControls(itemLeonardoPresetStyle);
        setCurrentUseAlchemy(itemUseAlchemy); setInitialUseAlchemyForControls(itemUseAlchemy);
        setCurrentUsePhotoReal(itemUsePhotoReal); setInitialUsePhotoRealForControls(itemUsePhotoReal);
    };

    switch (action) {
      case 'fullscreen': 
        if (item.mediaType === 'video') {
            setVideoModalUrl(item.imageUrl);
            setIsVideoModalOpen(true);
        } else if (item.mediaType === 'audio') {
            setAudioSrcForPlayer(item.imageUrl);
            setAudioTitleForPlayer(item.concept);
            setIsAudioPlayerVisible(true);
        } else { 
            setFullscreenImage(item); 
        }
        break;
      case 'edit':
        {
            const { resetEditor, addLayer } = useImageEditorStore.getState();
            resetEditor();
            const newLayer = {
                id: item.id, // Use existing ID
                type: 'image',
                name: item.concept,
                imageUrl: item.imageUrl,
                opacity: 1,
                isVisible: true,
                blendingMode: 'normal' as const,
                ...item
            };
            addLayer(newLayer);
            setIsEditorDrawerOpen(true); 
            setFullscreenImage(null);
            logAppEvent('EDITING', 'Image loaded into editor from history.', { concept: item.concept });
        }
        break;
      case 'delete': 
        deleteHistoryItem(item.id); 
        if (selectedHistoryItemIdsForCompare.includes(item.id)) {
            setSelectedHistoryItemIdsForCompare(prev => prev.filter(id => id !== item.id));
        }
        break;
      case 'enhance': 
      case 'regenerate':
        if (item.mediaType !== 'image') {
          showToast(`${action} action is only for images.`, 3000); return;
        }
        showToast(`${action === 'enhance' ? 'Enhancing' : 'Re-generating'}...`);
        updateCurrentSettingsFromHistoryItem();
        const promptForAction = action === 'enhance' ? await enhancePrompt(item.prompt) : item.prompt;
        if (action === 'enhance' && promptForAction === `${item.prompt} (enhancement failed)`) {
            showToast("AI prompt enhancement failed. Using original prompt.", 3000);
        }
        const generationSettings = {
            concept: item.concept, artStyle: itemArtStyle, aspectRatio: itemAspectRatio, negativePrompt: itemNegativePrompt,
            cfgScale: itemCfgScale, steps: itemSteps, seed: itemSeed, sampler: itemSampler, stylePreset: itemStylePreset,
            leonardoPresetStyle: itemLeonardoPresetStyle, useAlchemy: itemUseAlchemy, usePhotoReal: itemUsePhotoReal,
            selectedImageProvider: itemProviderId, selectedModelId: itemModelId || DEFAULT_MODEL_ID_FOR_PROVIDER(itemProviderId, imageProvidersConfig),
            userApiKeys, imageProvidersConfig, useSearchGrounding, driveSyncEnabled, isDriveAuthenticated,
            promptOverride: promptForAction, mediaType: 'image' as MediaType
        };
        performSingleGeneration(generationSettings);
        break;
      case 'use_concept':
        if (item.mediaType !== 'image') {
          showToast(`'Use Settings' action is primarily for images. Basic concept set.`, 3000);
        }
        updateCurrentSettingsFromHistoryItem();
        // appStateSettersForImageGen.setAppCurrentConcept(item.concept); appStateSettersForImageGen.setAppInitialThemeForControls(item.concept); // Already done by updateCurrentSettingsFromHistoryItem
        showToast(`Settings set from history. Modify and Start or Generate.`);
        break;
      case 'branch':
        if (item.mediaType !== 'image') {
          showToast(`'Branch' action is primarily for images. Basic concept set for branching.`, 3000);
        }
        updateCurrentSettingsFromHistoryItem();
        showToast(`Branched from: "${item.concept}". Modify settings and Start or Generate.`, 4000);
        setIsControlsDrawerOpen(true); 
        break;
      case 'copy_prompt': 
        navigator.clipboard.writeText(item.prompt)
            .then(() => showToast("Prompt copied to clipboard!", 2000))
            .catch(err => {
                showToast("Failed to copy prompt.", 2000); console.error('Failed to copy prompt: ', err);
                logAppEvent('ERROR', 'Failed to copy prompt to clipboard.', { error: err });
            });
        break;
      case 'download': logAppEvent('INFO', 'User initiated download from history.', { concept: item.concept, mediaType: item.mediaType }); break;
      case 'animate_svd':
        if (item.mediaType !== 'image') {
          showToast("SVD Animation can only be applied to images.", 3000); return;
        }
        handleAnimateWithSVD(item);
        break;
      case 'generate_soundscape':
        if (item.mediaType !== 'image') {
          showToast("Soundscape generation is based on images.", 3000); return;
        }
        handleGenerateSoundscape(item);
        break;
      case 'play_media':
        if (item.mediaType === 'video') {
            setVideoModalUrl(item.imageUrl);
            setIsVideoModalOpen(true);
        } else if (item.mediaType === 'audio') {
            setAudioSrcForPlayer(item.imageUrl);
            setAudioTitleForPlayer(item.concept);
            setIsAudioPlayerVisible(true);
        } else {
            showToast("No playable media for this item.", 2000);
        }
        break;
    }
  };

  const handleRemixConcept = async () => {
    if (!currentConcept || isRemixingConcept || appIsLoading || isPlaying) return;
    setIsRemixingConcept(true); setAppError(null); 
    logAppEvent('API', 'Remixing concept from Gemini text model.', { concept: currentConcept });
    try {
      const variations = await remixConcept(currentConcept);
      setSuggestedConcepts(variations);
      logAppEvent('API', 'Remixed concepts received.', { variations });
    } catch (err: any) {
      setAppError(err.message); logAppEvent('ERROR', 'Failed to remix concept.', { error: err.message });
      showToast("Failed to get concept remixes.", 3000);
    } finally { setIsRemixingConcept(false); }
  };
  const handleEnhancePrompt = async (themeToEnhance: string) => {
    if (!themeToEnhance || isEnhancingPrompt || appIsLoading || isPlaying) return;
    setIsEnhancingPrompt(true); setAppError(null); 
    logAppEvent('API', 'Enhancing theme/prompt with Gemini text model.', { theme: themeToEnhance });
    try {
        const enhanced = await enhancePrompt(themeToEnhance); 
        if (enhanced && enhanced !== `${themeToEnhance} (enhancement failed)`) {
            setCurrentConcept(enhanced); setInitialThemeForControls(enhanced); 
            showToast("Concept enhanced! Ready to generate.", 3000);
            logAppEvent('API', 'Concept enhanced successfully.', { original: themeToEnhance, enhanced });
        } else {
            showToast("AI prompt enhancement failed or returned no change.", 3000);
            logAppEvent('WARNING', 'AI prompt enhancement failed or no change.', { theme: themeToEnhance });
        }
    } catch (err: any) {
        setAppError(err.message); logAppEvent('ERROR', 'Failed to enhance concept/prompt.', { error: err.message });
        showToast("Failed to enhance concept.", 3000);
    } finally { setIsEnhancingPrompt(false); }
  };
  const handleSelectSuggestedConcept = (concept: string) => {
    setCurrentConcept(concept); setInitialThemeForControls(concept);
    setSuggestedConcepts(null); 
    logAppEvent('INFO', 'User selected a suggested concept.', { concept });
  };
  const handleDownloadLogs = useCallback(() => {
    const logData = JSON.stringify(appLogs, null, 2);
    const blob = new Blob([logData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url;
    const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
    link.download = `etherscape_logs_${timestamp}.json`; 
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    URL.revokeObjectURL(url);
    logAppEvent('SYSTEM', 'User downloaded application logs.');
  }, [appLogs, logAppEvent]);

  const handleChangeImageProvider = (newProviderId: ImageProviderId) => {
    setSelectedImageProvider(newProviderId);
    const providerConfig = imageProvidersConfig.find(p => p.id === newProviderId);
    if (providerConfig && providerConfig.models.length > 0) {
        const newModelId = providerConfig.models[0].id;
        setSelectedModelId(newModelId);
        logAppEvent('SYSTEM', `User changed provider to: ${newProviderId}, model to: ${newModelId}`);
        updateAdvancedSettingsForModel(newProviderId, newModelId);
        showToast(`Provider set to: ${providerConfig.displayName || newProviderId}`, 2000);
        const newModelConfig = providerConfig.models.find(m => m.id === newModelId);
        const newModelSupportedRatios = newModelConfig?.supportedAspectRatios || COMMON_ASPECT_RATIOS;
        if (!newModelSupportedRatios.includes(currentAspectRatio)) {
            const newValidRatio = newModelSupportedRatios[0] || DEFAULT_ASPECT_RATIO;
            setCurrentAspectRatio(newValidRatio); setInitialAspectRatioForControls(newValidRatio);
            logAppEvent('SYSTEM', `Aspect ratio updated to ${newValidRatio} due to model change.`);
        }
    } else {
        logAppEvent('ERROR', `No models found for selected provider: ${newProviderId}. Cannot set model.`, { providerId: newProviderId });
        showToast(`Error: No models available for ${providerConfig?.displayName || newProviderId}. Check API key or try updating models.`, 3500);
    }
  };
  
  const handleSetSelectedModelId = (newModelId: string) => {
    setSelectedModelId(newModelId);
    logAppEvent('SYSTEM', `User changed model to: ${newModelId}`);
    updateAdvancedSettingsForModel(selectedImageProvider, newModelId);
    const providerConfig = imageProvidersConfig.find(p => p.id === selectedImageProvider);
    const modelConfig = providerConfig?.models.find(m => m.id === newModelId);
    showToast(`Model set to: ${modelConfig?.displayName || newModelId}`, 2000);
    const newModelSupportedRatios = modelConfig?.supportedAspectRatios || COMMON_ASPECT_RATIOS;
     if (!newModelSupportedRatios.includes(currentAspectRatio)) {
        const newValidRatio = newModelSupportedRatios[0] || DEFAULT_ASPECT_RATIO;
        setCurrentAspectRatio(newValidRatio); setInitialAspectRatioForControls(newValidRatio);
        logAppEvent('SYSTEM', `Aspect ratio updated to ${newValidRatio} due to model change.`);
    }
  };

  const handleConfirmCurrentAsDefault = () => {
    logAppEvent('SYSTEM', `User confirmed default generator settings: Provider: ${selectedImageProvider}, Model: ${selectedModelId}, Aspect Ratio: ${currentAspectRatio}, NegativePrompt: ${currentNegativePrompt}, Cfg: ${currentCfgScale}, Steps: ${currentSteps}, Seed: ${currentSeed === undefined ? 'Random' : currentSeed}, Sampler: ${currentSampler}, StylePreset: ${currentStylePreset}, LeoPreset: ${currentLeonardoPresetStyle}, Alchemy: ${currentUseAlchemy}, PhotoReal: ${currentUsePhotoReal}, Grounding: ${useSearchGrounding}`);
    showToast('Current generation settings saved as default for next session.', 3500);
  };
  const handleSaveUserApiKey = (providerId: ImageProviderId, apiKey: string) => {
    const trimmedApiKey = apiKey.trim();
    setUserApiKeys({ ...userApiKeys, [providerId]: trimmedApiKey });
    const providerConf = IMAGE_PROVIDERS_STATIC.find(p => p.id === providerId);
    if (providerConf?.isDynamic && trimmedApiKey) fetchDynamicModels(providerId, trimmedApiKey);
    showToast(`${providerConf?.displayName || providerId} API Key saved.`, 2000);
    logAppEvent('SYSTEM', `API Key saved for provider: ${providerId}`);
  };

  const handleSavePreset = (presetData: Omit<PresetItem, 'id' | 'name'>) => {
    const presetName = window.prompt("Enter a name for this preset:", presetData.concept.substring(0, 30));
    if (presetName && presetName.trim() !== "") {
      const newPreset: PresetItem = {
        id: `${Date.now()}`,
        name: presetName.trim(),
        ...presetData
      };
      setSavedPresets(prev => [...prev, newPreset]);
      showToast(`Preset "${newPreset.name}" saved!`, 2500);
      logAppEvent('SYSTEM', 'Preset saved.', { presetName: newPreset.name });
    }
  };


  const handleLoadPreset = (preset: PresetItem) => {
    setCurrentConcept(preset.concept); setInitialThemeForControls(preset.concept);
    setCurrentArtStyle(preset.artStyle); setInitialArtStyleForControls(preset.artStyle);
    setCurrentAspectRatio(preset.aspectRatio); setInitialAspectRatioForControls(preset.aspectRatio);
    setSelectedImageProvider(preset.providerId); setSelectedModelId(preset.modelId);
    setCurrentNegativePrompt(preset.negativePrompt || ""); setInitialNegativePromptForControls(preset.negativePrompt || "");
    
    const modelCfg = imageProvidersConfig.find(p=>p.id === preset.providerId)?.models.find(m=>m.id === preset.modelId);
    setCurrentCfgScale(preset.cfgScale ?? modelCfg?.defaultCfgScale ?? DEFAULT_CFG_SCALE); setInitialCfgScaleForControls(preset.cfgScale ?? modelCfg?.defaultCfgScale ?? DEFAULT_CFG_SCALE);
    setCurrentSteps(preset.steps ?? modelCfg?.defaultSteps ?? DEFAULT_STEPS); setInitialStepsForControls(preset.steps ?? modelCfg?.defaultSteps ?? DEFAULT_STEPS);
    setCurrentSeed(preset.seed ?? modelCfg?.defaultSeed ?? DEFAULT_SEED); setInitialSeedForControls(preset.seed ?? modelCfg?.defaultSeed ?? DEFAULT_SEED);
    setCurrentSampler(preset.sampler); setInitialSamplerForControls(preset.sampler);
    setCurrentStylePreset(preset.stylePreset); setInitialStylePresetForControls(preset.stylePreset);
    setCurrentLeonardoPresetStyle(preset.leonardoPresetStyle); setInitialLeonardoPresetStyleForControls(preset.leonardoPresetStyle);
    setCurrentUseAlchemy(preset.useAlchemy ?? false); setInitialUseAlchemyForControls(preset.useAlchemy ?? false);
    setCurrentUsePhotoReal(preset.usePhotoReal ?? false); setInitialUsePhotoRealForControls(preset.usePhotoReal ?? false);
    
    showToast(`Preset "${preset.name}" loaded.`, 2500);
    logAppEvent('SYSTEM', 'Preset loaded.', { presetName: preset.name });
  };

  const handleDeletePreset = (presetId: string) => {
    setSavedPresets(prev => prev.filter(p => p.id !== presetId));
    showToast("Preset deleted.", 2000);
    logAppEvent('SYSTEM', 'Preset deleted.', { presetId });
  };

  const handleReplicateUpscaleImage = async (originalImage: ImageHistoryItem, scaleFactor: 2 | 4) => {
    if (!userApiKeys.replicate || userApiKeys.replicate.trim() === '') {
        setEditingError({ tool: 'upscale', message: 'Replicate API Key is required for upscaling. Please add it in Advanced Settings.' });
        logAppEvent('ERROR', 'Replicate Upscale failed: API key missing.', { concept: originalImage.concept}); return;
    }
    if (originalImage.isUpscaled) { setEditingError({ tool: 'upscale', message: 'This image has already been upscaled.' }); return; }
    setIsEditingLoading(true); setEditingError(null);
    logAppEvent('EDITING', `Upscaling image ${scaleFactor}x with Replicate: ${originalImage.concept}`);
    try {
        const upscaledImageUrl = await upscaleImageWithReplicate(originalImage.imageUrl, scaleFactor, userApiKeys.replicate);
        const upscaledPrompt = `Upscaled (${scaleFactor}x via Replicate): ${originalImage.prompt}`;
        const newHistoryItem = addImageToHistory(
            upscaledImageUrl, upscaledPrompt, originalImage.concept, 'image',
            originalImage.artStyle || DEFAULT_ART_STYLE, originalImage.aspectRatio,
            'replicate', REPLICATE_UPSCALER_MODEL_ID, undefined, undefined, true, originalImage.id, 
            originalImage.cfgScale, originalImage.steps, originalImage.seed, originalImage.sampler, 
            originalImage.stylePreset, originalImage.leonardoPresetStyle, originalImage.useAlchemy, originalImage.usePhotoReal 
        );
        appStateSettersForImageGen.setAppCurrentConcept(originalImage.concept); 
        
        setEditingImage(newHistoryItem); 
        showToast(`Image upscaled ${scaleFactor}x (Replicate) successfully!`, 3000);
        logAppEvent('EDITING', `Image upscaled ${scaleFactor}x (Replicate) successfully.`, { concept: originalImage.concept, newId: newHistoryItem.id });
        if (driveSyncEnabled && isDriveAuthenticated) {
            const safeConcept = originalImage.concept.replace(/[^a-z0-9_.-]/gi, '_').toLowerCase();
            const safeArtStyle = (originalImage.artStyle || 'default').replace(/[^a-z0-9_.-]/gi, '_').toLowerCase();
            const safeAspectRatio = originalImage.aspectRatio.replace(':','-');
            const timestampSuffix = new Date().toISOString().slice(11,19).replace(/:/g,'');
            const filename = `etherscape_${safeConcept}_${safeArtStyle}_${safeAspectRatio}_upscaled${scaleFactor}x_replicate_${timestampSuffix}.jpeg`;
            try {
                const driveFile = await driveUploadService( upscaledImageUrl, filename, upscaledPrompt, originalImage.concept, originalImage.artStyle || DEFAULT_ART_STYLE, originalImage.aspectRatio, newHistoryItem.id, originalImage.negativePrompt, true, originalImage.id, originalImage.seed );
                logAppEvent('DRIVE', 'Upscaled image (Replicate) uploaded to Google Drive.', { fileId: driveFile.id, filename: driveFile.name });
            } catch (driveUploadError: any) {
                logAppEvent('ERROR', 'Failed to upload upscaled image (Replicate) to Google Drive.', { error: driveUploadError.message });
                setDriveError(`Drive Upload Failed (Replicate Upscaled): ${driveUploadError.message}`);
            }
        }
    } catch (error: any) {
        setEditingError({ tool: 'upscale', message: error.message });
        logAppEvent('ERROR', `Replicate Upscale ${scaleFactor}x failed: ${error.message}`, { concept: originalImage.concept });
    } finally { setIsEditingLoading(false); }
  };

  const handleClipdropUpscale = async (originalImage: ImageHistoryItem) => {
    if (!userApiKeys.clipdrop || userApiKeys.clipdrop.trim() === '') {
        setEditingError({ tool: 'clipdrop_upscale', message: 'Clipdrop API Key is required for upscaling. Please add it in Advanced Settings.' });
        logAppEvent('ERROR', 'Clipdrop Upscale failed: API key missing.', { concept: originalImage.concept }); return;
    }
    if (originalImage.isUpscaled) { setEditingError({ tool: 'clipdrop_upscale', message: 'This image has already been upscaled.' }); return; }
    setIsEditingLoading(true); setEditingError(null);
    logAppEvent('EDITING', `Upscaling image with Clipdrop: ${originalImage.concept}`);
    try {
        const upscaledImageUrl = await upscaleWithClipdrop(originalImage.imageUrl, userApiKeys.clipdrop);
        const upscaledPrompt = `Upscaled (Auto via Clipdrop): ${originalImage.prompt}`;
        const newHistoryItem = addImageToHistory(
            upscaledImageUrl, upscaledPrompt, originalImage.concept, 'image', 
            originalImage.artStyle || DEFAULT_ART_STYLE, originalImage.aspectRatio,
            'clipdrop', CLIPDROP_MODEL_ID_UPSCALE, undefined, undefined, true, originalImage.id,
            originalImage.cfgScale, originalImage.steps, originalImage.seed, originalImage.sampler,
            originalImage.stylePreset, originalImage.leonardoPresetStyle, originalImage.useAlchemy, originalImage.usePhotoReal
        );
        appStateSettersForImageGen.setAppCurrentConcept(originalImage.concept);

        setEditingImage(newHistoryItem); 
        showToast(`Image upscaled (Clipdrop) successfully!`, 3000);
        logAppEvent('EDITING', `Image upscaled (Clipdrop) successfully.`, { concept: originalImage.concept, newId: newHistoryItem.id });
        if (driveSyncEnabled && isDriveAuthenticated) {
            const safeConcept = originalImage.concept.replace(/[^a-z0-9_.-]/gi, '_').toLowerCase();
            const safeArtStyle = (originalImage.artStyle || 'default').replace(/[^a-z0-9_.-]/gi, '_').toLowerCase();
            const safeAspectRatio = originalImage.aspectRatio.replace(':', '-');
            const timestampSuffix = new Date().toISOString().slice(11, 19).replace(/:/g, '');
            const filename = `etherscape_${safeConcept}_${safeArtStyle}_${safeAspectRatio}_upscaled_clipdrop_${timestampSuffix}.jpeg`;
            try {
                const driveFile = await driveUploadService( upscaledImageUrl, filename, upscaledPrompt, originalImage.concept, originalImage.artStyle || DEFAULT_ART_STYLE, originalImage.aspectRatio, newHistoryItem.id, originalImage.negativePrompt, true, originalImage.id, originalImage.seed );
                logAppEvent('DRIVE', 'Upscaled image (Clipdrop) uploaded to Google Drive.', { fileId: driveFile.id, filename: driveFile.name });
            } catch (driveUploadError: any) {
                logAppEvent('ERROR', 'Failed to upload upscaled image (Clipdrop) to Google Drive.', { error: driveUploadError.message });
                setDriveError(`Drive Upload Failed (Clipdrop Upscaled): ${driveUploadError.message}`);
            }
        }
    } catch (error: any) {
        setEditingError({ tool: 'clipdrop_upscale', message: error.message });
        logAppEvent('ERROR', `Clipdrop Upscale failed: ${error.message}`, { concept: originalImage.concept });
    } finally { setIsEditingLoading(false); }
  };
  
  const handleClipdropInpaint = async (originalImage: ImageHistoryItem, maskFile: File, inpaintPrompt: string) => {
    if (!userApiKeys.clipdrop || userApiKeys.clipdrop.trim() === '') {
        setEditingError({ tool: 'clipdrop_inpaint', message: 'Clipdrop API Key is required for inpainting. Please add it in Advanced Settings.'});
        logAppEvent('ERROR', 'Clipdrop Inpaint failed: API key missing.', { concept: originalImage.concept }); return;
    }
    setIsEditingLoading(true); setEditingError(null);
    logAppEvent('EDITING', `Inpainting image with Clipdrop: ${originalImage.concept}, Prompt: ${inpaintPrompt}`);
    try {
        const originalImageFile = await urlToFile(originalImage.imageUrl, `inpaint_base_${originalImage.id}.png`);
        const inpaintedImageUrl = await inpaintWithClipdrop(userApiKeys.clipdrop, originalImageFile, maskFile, inpaintPrompt);
        
        const newPrompt = `Inpainted "${inpaintPrompt}" on: ${originalImage.prompt}`;
        const newHistoryItem = addImageToHistory(
            inpaintedImageUrl, newPrompt, originalImage.concept, 'image',
            originalImage.artStyle || DEFAULT_ART_STYLE, originalImage.aspectRatio,
            'clipdrop', CLIPDROP_MODEL_ID_INPAINT, 
            originalImage.negativePrompt, undefined, false, originalImage.id, 
            originalImage.cfgScale, originalImage.steps, originalImage.seed
        );
        setEditingImage(newHistoryItem);
        showToast('Clipdrop Inpainting successful!', 3000);
        logAppEvent('EDITING', 'Clipdrop Inpainting successful.', { concept: originalImage.concept, newId: newHistoryItem.id });

    } catch (error: any) {
        setEditingError({ tool: 'clipdrop_inpaint', message: error.message });
        logAppEvent('ERROR', `Clipdrop Inpaint failed: ${error.message}`, { concept: originalImage.concept });
    } finally {
        setIsEditingLoading(false);
    }
  };

  const handleImageUploadForEditing = (file: File) => {
    logAppEvent('SYSTEM', 'ImageEditorDrawer.onImageUpload was called from App.tsx - This is a conceptual pass-through. Actual file handling is within ImageEditorDrawer.', { filename: file.name });
  };
  const toggleEditorDrawer = () => {
    setIsEditorDrawerOpen(prev => !prev);
    logAppEvent('SYSTEM', `Image editor drawer ${!isEditorDrawerOpen ? 'opened' : 'closed'}.`);
  };
  const handleManualModelUpdate = async () => {
    setIsDiscoveringModels(true);
    logAppEvent('MODEL_DISCOVERY', 'Manual model update process started by user.');
    let successCount = 0;
    for (const provider of IMAGE_PROVIDERS_STATIC) {
      if (provider.isDynamic && userApiKeys[provider.id]) {
        try {
          await fetchDynamicModels(provider.id, userApiKeys[provider.id] as string); successCount++;
        } catch (error) { logAppEvent('ERROR', `Manual update for ${provider.displayName} failed.`, { error }); }
      }
    }
    setIsDiscoveringModels(false);
    if (successCount > 0) showToast("Dynamic models updated where API keys are present.", 3000);
    else showToast("No dynamic models could be updated. Ensure API keys are set for relevant providers.", 3500);
    logAppEvent('MODEL_DISCOVERY', `Manual model update process finished. ${successCount} providers attempted.`);
  };

  const currentProviderConfigForControls = imageProvidersConfig.find(p => p.id === selectedImageProvider);
  const currentModelConfigForControls = currentProviderConfigForControls?.models.find(m => m.id === selectedModelId);
  
  const currentChatProviderDetails = chatProvidersConfig.find(p => p.id === selectedChatProviderId);
  const currentChatModelDetails = currentChatProviderDetails?.models.find(m => m.id === selectedChatModelId);

  const modalErrorFallback = (
    <div className="fixed inset-0 bg-red-900/90 text-white flex flex-col items-center justify-center z-[200] p-4 text-center">
      <h2 className="text-2xl font-bold mb-3">Oops! Something went wrong.</h2>
      <p className="mb-2">An unexpected error occurred within a modal component.</p>
      <p className="mb-4 text-sm text-red-200">Try closing this message and the modal. If the issue persists, refreshing the page might help.</p>
      <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-700 hover:bg-red-600 rounded-md font-semibold">Refresh Page</button>
    </div>
  );

  const handleMainZoomChange = (newLevel: number) => {
    setMainImageZoomLevel(newLevel);
    if (mainImageIsFitToScreen) setMainImageIsFitToScreen(false); // If slider is used, assume not fitting to screen
    logAppEvent('SYSTEM', 'Main image zoom level changed via slider.', { newLevel });
  };

  const handleToggleMainFitActual = () => { 
    const newFitState = !mainImageIsFitToScreen;
    setMainImageIsFitToScreen(newFitState);
    if (!newFitState) { // Switched to Actual Size
        setMainImageZoomLevel(1); // Set zoom to 100%
    } 
    // If switching to Fit, zoomLevel is effectively ignored for rendering
    logAppEvent('SYSTEM', `Main image view toggled to ${newFitState ? 'fit to screen' : 'actual size'}. Zoom: ${newFitState ? 'Fit' : '1.0'}`);
  };


  const handleLiveQueryStart = () => {
    if (appIsLoading || isPlaying || isProcessingLiveQuery) return;
    setAppError(null); 
    setIsCameraModalOpen(true);
    logAppEvent('LIVE_QUERY', 'Live Query started, opening camera modal.');
  };

  const handleLiveQueryCancel = () => {
    setIsCameraModalOpen(false);
    logAppEvent('LIVE_QUERY', 'Live Query cancelled by user from camera modal.');
  };

  const handleCaptureAndProcessImage = async (base64ImageData: string, mimeType: 'image/jpeg' | 'image/png') => {
    setIsCameraModalOpen(false); setIsProcessingLiveQuery(true);
    setAppError(null); 
    const etherscapeThemeForQuery = currentConcept; 
    logAppEvent('LIVE_QUERY', 'Image captured. Processing for editor and Gemini text query.', { queryTheme: etherscapeThemeForQuery });
    const capturedImageUrl = `data:${mimeType};base64,${base64ImageData}`;
    const newCapturedConcept = "Live Camera Input";
    const newCapturedPrompt = `Live Capture - ${new Date().toLocaleTimeString()}`;
    const newEditingItem: ImageHistoryItem = {
        id: `live-${Date.now()}`, imageUrl: capturedImageUrl, prompt: newCapturedPrompt, concept: newCapturedConcept,
        mediaType: 'image', artStyle: currentArtStyle, aspectRatio: "source", provider: selectedImageProvider, 
        modelId: selectedModelId,
        modelDisplayName: imageProvidersConfig.find(p => p.id === selectedImageProvider)?.models.find(m => m.id === selectedModelId)?.displayName || selectedModelId,
        negativePrompt: currentNegativePrompt, isUpscaled: false, cfgScale: currentCfgScale,
        steps: currentSteps, seed: currentSeed, sampler: currentSampler,
        stylePreset: currentStylePreset, leonardoPresetStyle: currentLeonardoPresetStyle,
        useAlchemy: currentUseAlchemy, usePhotoReal: currentUsePhotoReal,
    };
    const { resetEditor, addLayer } = useImageEditorStore.getState();
    resetEditor();
    addLayer({
        id: newEditingItem.id,
        type: 'image',
        name: newEditingItem.concept,
        imageUrl: newEditingItem.imageUrl,
        opacity: 1,
        isVisible: true,
        blendingMode: 'normal' as const,
        ...newEditingItem
    });
    setIsEditorDrawerOpen(true);
    setCurrentConcept(newEditingItem.concept); setInitialThemeForControls(newEditingItem.concept); 
    setCurrentArtStyle(newEditingItem.artStyle); setInitialArtStyleForControls(newEditingItem.artStyle);
    setCurrentAspectRatio(newEditingItem.aspectRatio); setInitialAspectRatioForControls(newEditingItem.aspectRatio); 
    setCurrentNegativePrompt(newEditingItem.negativePrompt || ""); setInitialNegativePromptForControls(newEditingItem.negativePrompt || "");
    if (newEditingItem.cfgScale !== undefined) { setCurrentCfgScale(newEditingItem.cfgScale); setInitialCfgScaleForControls(newEditingItem.cfgScale); }
    if (newEditingItem.steps !== undefined) { setCurrentSteps(newEditingItem.steps); setInitialStepsForControls(newEditingItem.steps); }
    if (newEditingItem.seed !== undefined) { setCurrentSeed(newEditingItem.seed); setInitialSeedForControls(newEditingItem.seed); } else { setCurrentSeed(undefined); setInitialSeedForControls(undefined); }
    showToast(`"${newEditingItem.concept}" loaded into editor. Querying Gemini about connection to "${etherscapeThemeForQuery}"...`, 4000);
    logAppEvent('EDITING', 'Live captured image loaded into editor.', { concept: newEditingItem.concept });
    try {
      const liveResponse = await generateTextFromImageAndPrompt(base64ImageData, mimeType, etherscapeThemeForQuery);
      showToast(`Gemini (${etherscapeThemeForQuery}): ${liveResponse}`, 10000); 
      logAppEvent('LIVE_QUERY', 'Live query (text part) successful (editor context).', { queryTheme: etherscapeThemeForQuery, response: liveResponse });
    } catch (err: any) {
      const errorMessage = err.message || "Failed to process live text query with Gemini.";
      showToast(`Live Query (Text) Error: ${errorMessage}`, 5000);
      logAppEvent('ERROR', 'Live query (text part) failed (editor context).', { queryTheme: etherscapeThemeForQuery, error: errorMessage });
    } finally { setIsProcessingLiveQuery(false); }
  };

  const handleToggleChatDrawer = async () => {
    const newDrawerState = !isChatDrawerOpen;
    setIsChatDrawerOpen(newDrawerState);
    if (!newDrawerState) setIsChatFullscreen(false); 
    logAppEvent('CHAT', `Chat drawer ${newDrawerState ? 'opened' : 'closed'}.`);
    if (newDrawerState) {
      initializeChatSession(newDrawerState);
    }
  };

  const handleToggleChatFullscreen = () => { setIsChatFullscreen(prev => !prev); logAppEvent('CHAT', `Chat fullscreen toggled ${!isChatFullscreen ? 'ON' : 'OFF'}.`); };
  
  const handleSetSelectedChatProviderId = (providerId: ChatProviderId) => {
    setSelectedChatProviderId(providerId);
    const providerConf = chatProvidersConfig.find(p => p.id === providerId);
    if (providerConf && providerConf.models.length > 0) {
        setSelectedChatModelId(providerConf.models[0].id);
    } else {
        setSelectedChatModelId(DEFAULT_CHAT_MODEL_ID_FOR_PROVIDER(DEFAULT_CHAT_PROVIDER_ID, chatProvidersConfig)); 
    }
    logAppEvent('SYSTEM', `Chat provider changed to: ${providerId}, model to: ${selectedChatModelId}`);
    showToast(`Chat provider set to ${providerConf?.displayName || providerId}. Chat will re-initialize on next open if settings changed.`, 3500);
    clearChatSessionData(); 
  };

  const handleSaveUserChatApiKey = (providerId: ChatProviderId, apiKey: string) => {
    const trimmedApiKey = apiKey.trim();
    setUserChatApiKeys({ ...userChatApiKeys, [providerId]: trimmedApiKey });
    const providerConf = chatProvidersConfig.find(p => p.id === providerId);
    showToast(`${providerConf?.displayName || providerId} Chat API Key saved.`, 2000);
    logAppEvent('SYSTEM', `Chat API Key saved for provider: ${providerId}`);
  };
  const handleSetCurrentChatSystemPromptBase = (prompt: string) => {
    setCurrentChatSystemPromptBase(prompt); logAppEvent('SYSTEM', `Chat system prompt base updated. Length: ${prompt.length}`);
    clearChatSessionData(); 
  };
  const handleSetCurrentChatConfig = (newConfig: Partial<ChatConfig>) => {
    setCurrentChatConfig({ ...currentChatConfig, ...newConfig });
    logAppEvent('SYSTEM', 'Chat config updated.', { newConfig });
    clearChatSessionData(); 
  };
  const handleConfirmChatSettingsAsDefault = () => {
    logAppEvent('SYSTEM', `User confirmed default chat settings: Provider: ${selectedChatProviderId}, Model: ${selectedChatModelId}, SystemPromptBase: ${currentChatSystemPromptBase.substring(0,30)}..., Config: ${JSON.stringify(currentChatConfig)}`);
    showToast('Current chat settings saved as default for next session.', 3500);
  };

  const handleToggleCompareMode = () => {
    const newCompareModeState = !isCompareModeActive;
    setIsCompareModeActive(newCompareModeState);
    if (!newCompareModeState) {
      setSelectedHistoryItemIdsForCompare([]); 
    }
    logAppEvent('SYSTEM', `Image Compare Mode ${newCompareModeState ? 'activated' : 'deactivated'}.`);
  };

  const handleToggleHistoryItemForCompare = (itemId: string) => {
    setSelectedHistoryItemIdsForCompare(prevSelectedIds => {
      if (prevSelectedIds.includes(itemId)) {
        return prevSelectedIds.filter(id => id !== itemId);
      } else {
        if (prevSelectedIds.length < MAX_COMPARE_ITEMS) {
          return [...prevSelectedIds, itemId];
        }
        showToast(`Maximum ${MAX_COMPARE_ITEMS} images can be selected for comparison.`, 2500);
        return prevSelectedIds;
      }
    });
  };
  
  const handleClearCompareSelection = () => {
    setSelectedHistoryItemIdsForCompare([]);
    logAppEvent('SYSTEM', 'Compare selection cleared.');
  };

  const handleStartComparison = () => {
    if (selectedHistoryItemIdsForCompare.length >= 2) {
      setShowCompareViewModal(true);
      logAppEvent('SYSTEM', `Starting comparison for ${selectedHistoryItemIdsForCompare.length} items.`);
    } else {
      showToast("Select at least two images to compare.", 2500);
    }
  };

  const handleCloseCompareViewModal = () => {
    setShowCompareViewModal(false);
    logAppEvent('SYSTEM', 'Compare view modal closed.');
  };

  const handleCloseAudioPlayer = () => {
    setIsAudioPlayerVisible(false);
    setAudioSrcForPlayer(null);
    setAudioTitleForPlayer(null);
    logAppEvent('AUDIO', 'Audio player closed by user.');
  };

  const handleDriveImageSelect = (image: ImageHistoryItem) => {
    addImageToHistory(
      image.imageUrl,
      image.prompt,
      image.concept,
      image.mediaType,
      image.artStyle,
      image.aspectRatio,
      image.provider,
      image.modelId,
      image.negativePrompt,
      image.driveFileId,
      image.isUpscaled,
      image.originalHistoryItemId,
      image.cfgScale,
      image.steps,
      image.seed
    );
    showToast(`Image "${image.concept}" loaded from Google Drive.`, 2500);
    logAppEvent('DRIVE', 'Image loaded from Drive Browser.', { concept: image.concept });
  };

  const handleCloseAndClearEditor = () => {
    const { resetEditor } = useImageEditorStore.getState();
    resetEditor();
    setIsEditorDrawerOpen(false);
    setEditingError(null);
    logAppEvent('EDITING', 'Image editor closed and current editing image cleared.');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-gray-100 overflow-hidden relative">
      <header className="flex items-center justify-between p-3 bg-gray-800/70 backdrop-blur-md shadow-lg sticky top-0 z-30" style={{ height: `${APP_HEADER_HEIGHT_PX}px` }}>
        <div className="flex items-center space-x-2 sm:space-x-3">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-gray-300">Etherscape</h1>
            {isDriveAuthenticated && (
                <button onClick={() => setIsDriveBrowserOpen(true)} className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-md" title="Browse Google Drive">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                </button>
            )}
        </div>
        <span className="text-xs text-gray-400 font-normal">xone_4.inc</span>
      </header>
      
      <div className="flex-grow flex overflow-hidden"> 
        <ChatDrawer
            isOpen={isChatDrawerOpen} onClose={() => { setIsChatDrawerOpen(false); setIsChatFullscreen(false); }}
            messages={chatMessages} onSendMessage={sendChatMessage} isLoading={isChatLoading}
            isChatFullscreen={isChatFullscreen} onToggleFullscreen={handleToggleChatFullscreen}
            chatProviderDisplayName={currentChatProviderDetails?.displayName || selectedChatProviderId}
            chatModelDisplayName={currentChatModelDetails?.displayName || selectedChatModelId}
            selectedChatProviderId={selectedChatProviderId}
        />
        <button
          onClick={toggleEditorDrawer}
          className="fixed top-1/3 left-0 transform -translate-y-1/2 bg-gray-700/70 hover:bg-gray-600/80 backdrop-blur-sm text-white p-3 rounded-r-md shadow-lg z-40 transition-all flex items-center space-x-1"
          aria-label={isEditorDrawerOpen ? "Close Image Editor" : "Open Image Editor"}
          title={isEditorDrawerOpen ? "Close Image Editor" : "Open Image Editor"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828zM5 12V7.828l5-5H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2.172l-5 5H5z" /></svg>
          {isEditorDrawerOpen ? ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg> ) 
                             : ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg> )}
        </button>
         <ImageEditorDrawer
            isOpen={isEditorDrawerOpen}
            onCloseAndClear={handleCloseAndClearEditor}
            onUpscale={handleReplicateUpscaleImage}
            onClipdropUpscale={handleClipdropUpscale}
            isLoading={appIsLoading || isEditingLoading || isProcessingLiveQuery}
            userApiKeys={userApiKeys}
            editingError={editingError}
            clearEditingError={() => setEditingError(null)}
            setEditingError={setEditingError}
            onImageUpload={handleImageUploadForEditing}
            onLiveQueryStart={handleLiveQueryStart}
            isProcessingLiveQuery={isProcessingLiveQuery}
            selectedImageProviderId={selectedImageProvider}
            selectedModelConfig={currentModelConfigForControls}
            onGenerateWithLeonardoImg2Img={handleGenerateWithLeonardoImg2Img}
            addImageToHistory={addImageToHistory}
            showToast={showToast}
            logAppEvent={logAppEvent}
            currentMainPrompt={currentPrompt || currentConcept}
            onClipdropInpaint={handleClipdropInpaint}
        />
        <main className="flex-grow flex flex-col items-center justify-center p-2 md:p-4 overflow-hidden relative">
            <ImageDisplay 
              imageUrl={currentImageUrl} prompt={currentPrompt} 
              concept={isPlaying ? currentEvolvingConcept : currentConcept} 
              isLoading={appIsLoading || isEditingLoading || isProcessingLiveQuery} 
              loadingMessageOverride={isProcessingLiveQuery ? "Processing Live Query with Gemini..." : (isGeneratingVideo ? "Generating video animation..." : (isGeneratingAudio ? "Generating soundscape..." : undefined) )}
              providerDisplayName={currentProviderConfigForControls?.displayName} modelDisplayName={currentModelConfigForControls?.displayName}
              zoomLevel={mainImageZoomLevel} isFitToScreen={mainImageIsFitToScreen}
              onZoomChange={handleMainZoomChange} onToggleFitActual={handleToggleMainFitActual}
            />
            <GroundingInfoDisplay sources={currentGroundingSources} />
        </main>
        {!isControlsDrawerOpen && (
            <button onClick={() => setIsControlsDrawerOpen(true)}
              className="fixed top-1/3 right-0 transform -translate-y-1/2 bg-gray-700/70 hover:bg-gray-600/80 backdrop-blur-sm text-white p-3 rounded-l-md shadow-lg z-40 transition-all flex items-center space-x-1"
              aria-label="Open Controls" title="Open Controls" >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0 3.35a1.724 1.724 0 001.066 2.573c-.94-1.543.826 3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
        )}
        <aside 
            className={`fixed top-0 right-0 h-full w-full max-w-[300px] bg-gray-800/70 backdrop-blur-md shadow-xl z-40 transform transition-transform duration-300 ease-[cubic-bezier(0.37,0,0.63,1)] flex flex-col ${isControlsDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
            aria-hidden={!isControlsDrawerOpen} >
          <div className="flex items-center justify-between p-3 border-b border-gray-700/50">
            <h2 className="text-xl font-semibold text-gray-300">Controls</h2>
            <button onClick={() => setIsControlsDrawerOpen(false)} className="text-gray-400 hover:text-white" aria-label="Close Controls">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="p-3 overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700/50 controls-drawer-content">
              {appError && ( <div className="mb-3 p-3 bg-red-700/80 text-white rounded-md text-sm shadow-lg backdrop-blur-sm break-words"><p><strong>Error:</strong> {appError}</p></div> )}
              <div className="text-sm text-gray-300 mb-3 p-2.5 bg-gray-700/60 rounded backdrop-blur-sm">
                 <p><strong className="text-gray-400">Concept:</strong> {isPlaying ? currentEvolvingConcept : currentConcept}</p>
                 <p><strong className="text-gray-400">Art Style:</strong> {currentArtStyle}</p>
                 <p><strong className="text-gray-400">Aspect Ratio:</strong> {currentAspectRatio}</p>
                 {currentNegativePrompt && <p><strong className="text-gray-400">Negative:</strong> {currentNegativePrompt}</p>}
                 <p><strong className="text-gray-400">Provider:</strong> {currentProviderConfigForControls?.displayName || selectedImageProvider}</p>
                 <p><strong className="text-gray-400">Model:</strong> {currentModelConfigForControls?.displayName || selectedModelId}</p>
                 
                 {/* Display advanced params from context if they are relevant */}
                 {currentModelConfigForControls?.defaultCfgScale !== undefined && initialCfgScaleForControls !== undefined && <p><strong className="text-gray-400">CFG:</strong> {initialCfgScaleForControls.toFixed(1)}</p>}
                 {currentModelConfigForControls?.defaultSteps !== undefined && initialStepsForControls !== undefined && <p><strong className="text-gray-400">Steps:</strong> {initialStepsForControls}</p>}
                 {initialSeedForControls !== undefined && <p><strong className="text-gray-400">Seed:</strong> {initialSeedForControls}</p>}
                 {currentModelConfigForControls?.availableSamplers && initialSamplerForControls && <p><strong className="text-gray-400">Sampler:</strong> {initialSamplerForControls}</p>}
                 {currentModelConfigForControls?.availableStylePresets && initialStylePresetForControls && <p><strong className="text-gray-400">Style Preset:</strong> {initialStylePresetForControls}</p>}
                 {currentModelConfigForControls?.availableLeonardoPresetStyles && initialLeonardoPresetStyleForControls && initialLeonardoPresetStyleForControls !== "NONE" && <p><strong className="text-gray-400">Leo Preset:</strong> {initialLeonardoPresetStyleForControls}</p>}
                 {currentModelConfigForControls?.supportsAlchemy && <p><strong className="text-gray-400">Alchemy:</strong> {initialUseAlchemyForControls ? 'On' : 'Off'}</p>}
                 {currentModelConfigForControls?.supportsPhotoReal && <p><strong className="text-gray-400">PhotoReal:</strong> {initialUsePhotoRealForControls ? 'On' : 'Off'}</p>}

                {currentPrompt && <p className="italic text-gray-400 mt-1 text-xs"><strong className="text-gray-500">Last Prompt:</strong> "{currentPrompt}"</p>}
                <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-600/50">To change Provider/Model or other defaults, use <button onClick={() => { setIsControlsDrawerOpen(false); openAdvancedSettings(); }} className="underline text-gray-300 hover:text-white">Advanced Settings</button>.</p>
              </div>
              <Controls 
                onStart={handleStart} onStop={handleStop} onGenerateSingle={handleGenerateSingle}
                onSaveConcept={handleSaveConcept} 
                onRandomize={handleRandomizeSettings} predefinedConcepts={PREDEFINED_CONCEPTS} userSavedConcepts={userSavedConcepts}
                onOpenAdvancedSettings={openAdvancedSettings}
                onLiveQueryStart={handleLiveQueryStart} isProcessingLiveQuery={isProcessingLiveQuery}
              />
          </div>
        </aside>
      </div> 
      <div className="fixed bottom-0 left-0 right-0 flex justify-center items-end p-1.5 space-x-1.5 z-20 pointer-events-none">
        {!isHistoryDrawerOpen && (
            <button onClick={() => setIsHistoryDrawerOpen(true)}
              className="bg-gray-700/80 hover:bg-gray-600/90 backdrop-blur-sm text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-t-md shadow-lg transition-all flex items-center pointer-events-auto text-xs sm:text-sm"
              aria-label="Open History" title="Open History" >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1 inline-block" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" /></svg>
            History {imageHistory.length > 0 && <span className="ml-1.5 bg-gray-500 text-xs font-semibold px-1.5 py-0.5 rounded-full">{imageHistory.length}</span>}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 ml-1 sm:ml-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
            </button>
        )}
        {!isChatDrawerOpen && (
            <button onClick={handleToggleChatDrawer}
                className="bg-gray-700/80 hover:bg-gray-600/90 backdrop-blur-sm text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-t-md shadow-lg transition-all flex items-center pointer-events-auto text-xs sm:text-sm"
                aria-label="Open AI Creative Chat" title="AI Creative Chat" >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zm-4 0H9v2h2V9z" clipRule="evenodd" /></svg>
                AI Co-pilot
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 ml-1 sm:ml-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
            </button>
        )}
      </div>
      <footer className={`fixed bottom-0 left-0 right-0 w-full bg-gray-800/80 backdrop-blur-md shadow-top z-30 transform transition-transform duration-300 ease-[cubic-bezier(0.37,0,0.63,1)] max-h-[40vh] overflow-y-hidden flex flex-col ${isHistoryDrawerOpen ? 'translate-y-0' : 'translate-y-full'} history-drawer`}
        aria-hidden={!isHistoryDrawerOpen} >
        <ImageHistory 
            history={imageHistory} 
            isGenerating={isGenerationLoading}
            onSelectItemAction={handleHistoryItemAction} 
            isVisible={isHistoryDrawerOpen} 
            isCompareModeActive={isCompareModeActive}
            selectedItemIdsForCompare={selectedHistoryItemIdsForCompare}
            onToggleCompareMode={handleToggleCompareMode}
            onToggleItemForCompare={handleToggleHistoryItemForCompare}
            onStartComparison={handleStartComparison}
            onClearCompareSelection={handleClearCompareSelection}
            isGeneratingVideo={isGeneratingVideo}
            isGeneratingAudio={isGeneratingAudio}
            onCloseDrawer={() => setIsHistoryDrawerOpen(false)}
        />
      </footer>
      <ErrorBoundary fallback={modalErrorFallback} onError={(error, errorInfo) => { logAppEvent('ERROR', `ErrorBoundary caught: ${error.message}`, { componentStack: errorInfo.componentStack }); }} >
        {fullscreenImage && ( <FullscreenModal image={fullscreenImage} onClose={() => setFullscreenImage(null)} onAction={handleHistoryItemAction} isGeneratingVideo={isGeneratingVideo} isGeneratingAudio={isGeneratingAudio} /> )}
        {isAdvancedSettingsOpen && (
          <AdvancedSettingsModal
            isOpen={isAdvancedSettingsOpen} onClose={closeAdvancedSettings} logs={appLogs}
            devPlan={developmentPlanData} troubleshooting={troubleshootingGuideData} onDownloadLogs={handleDownloadLogs}
            imageProvidersConfig={imageProvidersConfig} currentImageProviderId={selectedImageProvider} onSetImageProvider={handleChangeImageProvider}
            currentModelId={selectedModelId} onSetModelId={handleSetSelectedModelId}
            currentAspectRatio={currentAspectRatio} onSetAspectRatio={(newRatio) => { setCurrentAspectRatio(newRatio); setInitialAspectRatioForControls(newRatio);}} 
            userApiKeys={userApiKeys} onSaveUserApiKey={handleSaveUserApiKey}
            onConfirmCurrentAsDefault={handleConfirmCurrentAsDefault}
            onManualModelUpdate={handleManualModelUpdate} isUpdatingModels={isDiscoveringModels}
            chatProvidersConfig={chatProvidersConfig} currentChatProviderId={selectedChatProviderId}
            onSetChatProvider={handleSetSelectedChatProviderId} userChatApiKeys={userChatApiKeys}
            onSaveUserChatApiKey={handleSaveUserChatApiKey} currentChatSystemPromptBase={currentChatSystemPromptBase}
            onSetChatSystemPromptBase={handleSetCurrentChatSystemPromptBase} currentChatConfig={currentChatConfig}
            onSetChatConfig={handleSetCurrentChatConfig} onConfirmChatSettingsAsDefault={handleConfirmChatSettingsAsDefault}
            currentChatModelId={selectedChatModelId} onSetChatModelId={setSelectedChatModelId}
            onStartTour={() => setIsTourOpen(true)}
          />
        )}
        <OnboardingTour run={isTourOpen} onClose={() => setIsTourOpen(false)} />
        {isCameraModalOpen && (
          <CameraCaptureModal
            isOpen={isCameraModalOpen} onClose={handleLiveQueryCancel} onCapture={handleCaptureAndProcessImage}
            onError={(errMsg) => { showToast(`Camera Error: ${errMsg}`, 4000); logAppEvent('ERROR', 'Camera capture error.', { error: errMsg }); setIsCameraModalOpen(false); }}
          />
        )}
        {showCompareViewModal && (
          <CompareViewModal
            items={imageHistory.filter(item => selectedHistoryItemIdsForCompare.includes(item.id))}
            onClose={handleCloseCompareViewModal}
          />
        )}
        {isVideoModalOpen && videoModalUrl && (
          <VideoDisplayModal
            videoUrl={videoModalUrl}
            onClose={() => {
              setIsVideoModalOpen(false);
              setVideoModalUrl(null);
              logAppEvent('VIDEO', 'Video display modal closed.');
            }}
          />
        )}
         {isAudioPlayerVisible && audioSrcForPlayer && (
          <AudioPlayer 
            src={audioSrcForPlayer}
            title={audioTitleForPlayer || "Generated Soundscape"}
            onClose={handleCloseAudioPlayer}
            isVisible={isAudioPlayerVisible}
          />
        )}
        {isDriveBrowserOpen && (
            <DriveBrowserModal
                isOpen={isDriveBrowserOpen}
                onClose={() => setIsDriveBrowserOpen(false)}
                onImageSelect={handleDriveImageSelect}
                showToast={showToast}
            />
        )}
      </ErrorBoundary>
       <style>{`
        .scrollbar-thin { scrollbar-width: thin; scrollbar-color: #4A5568 #2D3748; }
        .scrollbar-thin::-webkit-scrollbar { width: 8px; height: 8px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: #2D3748; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background-color: #4A5568; border-radius: 10px; border: 2px solid #2D3748; }
        .controls-drawer-content::-webkit-scrollbar, .editor-drawer-content::-webkit-scrollbar, .chat-drawer-content::-webkit-scrollbar { width: 8px; }
        .controls-drawer-content::-webkit-scrollbar-track, .editor-drawer-content::-webkit-scrollbar-track, .chat-drawer-content::-webkit-scrollbar-track { background: #374151; }
        .controls-drawer-content::-webkit-scrollbar-thumb, .editor-drawer-content::-webkit-scrollbar-thumb, .chat-drawer-content::-webkit-scrollbar-thumb { background-color: #4b5563; border-radius: 10px; border: 2px solid #374151; }
        .controls-drawer-content, .editor-drawer-content, .chat-drawer-content { scrollbar-width: thin; scrollbar-color: #4b5563 #374151; }
        .shadow-top { box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06); }
      `}</style>
    </div>
  );
};

const AppContentWithDriveOverrides: React.FC<Partial<ReturnType<typeof useDriveSync>>> = (driveProps) => {
  const context = useAppContext(); 
  Object.assign(context, driveProps); 
  return <AppContent />;
};

const AppInitializer: React.FC = () => {
  const {
    driveSyncEnabled, setDriveSyncEnabled, showToast, logAppEvent
  } = useAppContext(); 

  const driveSyncHookProps = useDriveSync({
    driveSyncEnabled, setDriveSyncEnabled, showToast, logAppEvent
  });

  return <AppContentWithDriveOverrides {...driveSyncHookProps} />;
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppInitializer />
    </AppProvider>
  );
};

export default App;
