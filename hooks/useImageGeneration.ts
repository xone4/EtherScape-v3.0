
import { useState, useRef, useCallback, useEffect } from 'react';
import { 
    generateThemeAndPrompt 
} from '../services/geminiService'; 
import { generateImageFromProvider } from '../services/imageGenerationService'; 
import { useFalRealtime } from './useFalRealtime';
import { 
    ImageHistoryItem, DriveFileMetadata, LogEntryType, ImageProviderId, 
    UserApiKeys, ModelSetting, GenerationOptions, GroundingSource,
    ThemeAndPromptResponse, ImageProviderSetting, MediaType
} from '../types';
import { DEFAULT_ASPECT_RATIO, DEFAULT_CFG_SCALE, DEFAULT_STEPS, DEFAULT_SEED } from '../constants';

const GENERATION_INTERVAL = 10000; // Milliseconds

// Helper function to map aspect ratio string to width and height
const mapAspectRatioToDimensions = (aspectRatio: string, baseDimension: number = 1024): { width: number, height: number } => {
  const ratioParts = aspectRatio.split(':').map(Number);
  if (ratioParts.length !== 2 || isNaN(ratioParts[0]) || isNaN(ratioParts[1]) || ratioParts[0] <=0 || ratioParts[1] <=0) {
    console.warn(`Invalid aspect ratio string: "${aspectRatio}". Defaulting to square ${baseDimension}x${baseDimension}.`);
    return { width: baseDimension, height: baseDimension };
  }
  const [ratioW, ratioH] = ratioParts;

  // Specific resolutions for common ratios at 1024 base for better quality/consistency
  if (baseDimension === 1024) {
    if (aspectRatio === '1:1') return { width: 1024, height: 1024 };
    if (aspectRatio === '16:9') return { width: 1344, height: 768 }; // Adjusted for common multiples
    if (aspectRatio === '9:16') return { width: 768, height: 1344 };
    if (aspectRatio === '4:3') return { width: 1152, height: 896 };
    if (aspectRatio === '3:4') return { width: 896, height: 1152 };
    if (aspectRatio === '3:2') return { width: 1216, height: 832 };
    if (aspectRatio === '2:3') return { width: 832, height: 1216 };
    if (aspectRatio === '21:9') return { width: 1536, height: 640 }; // Wider, ensure it's sensible
    if (aspectRatio === '9:21') return { width: 640, height: 1536 };
    if (aspectRatio === '5:4') return { width: 1120, height: 896 };
    if (aspectRatio === '4:5') return { width: 896, height: 1120 };
  }
  
  let width, height;
  if (ratioW > ratioH) {
    width = baseDimension;
    height = Math.round((baseDimension * ratioH) / ratioW);
  } else {
    height = baseDimension;
    width = Math.round((baseDimension * ratioW) / ratioH);
  }
  // Ensure dimensions are multiples of 64 for SD models for better compatibility
  const roundToNearestMultiple = (num: number, multiple: number) => Math.max(multiple, Math.round(num / multiple) * multiple);
  if (baseDimension === 1024 || baseDimension === 768 || baseDimension === 512) { // Common Stable Diffusion bases
     width = roundToNearestMultiple(width, 64);
     height = roundToNearestMultiple(height, 64);
  }
  return { width: Math.max(128, width), height: Math.max(128, height) }; // Ensure minimum dimension
};


interface GenerationSettings {
  concept: string;
  artStyle: string;
  aspectRatio: string;
  mediaType: MediaType; // Added mediaType
  negativePrompt?: string;
  cfgScale?: number;
  steps?: number;
  seed?: number;
  sampler?: string;
  stylePreset?: string;
  leonardoPresetStyle?: string;
  useAlchemy?: boolean;
  usePhotoReal?: boolean;
  // Provider/Model info
  selectedImageProvider: ImageProviderId;
  selectedModelId: string;
  userApiKeys: UserApiKeys;
  imageProvidersConfig: ImageProviderSetting[];
  useSearchGrounding: boolean;
  // Drive info for upload
  driveSyncEnabled: boolean;
  isDriveAuthenticated: boolean;
  // For Img2Img specific case / overrides
  leonardoInitialImageDataUrl?: string;
  leonardoInitStrength?: number;
  sourceImageForImg2ImgId?: string;
  promptOverride?: string;
  // Internal fields for Fal.ai result processing
  _internalPromptUsed?: string;
  _internalNextTheme?: string;
  _internalGenerationConcept?: string; // To store the concept used for this specific generation
}

interface UseImageGenerationProps {
  showToast: (message: string, duration?: number) => void;
  logAppEvent: (type: LogEntryType, message: string, details?: any) => void;
  addImageToHistory: (
    imageUrl: string, 
    prompt: string, 
    concept: string, 
    mediaType: MediaType, // Added mediaType
    artStyle: string, 
    aspectRatio: string,
    providerId: ImageProviderId, 
    modelId: string, 
    negativePrompt?: string, 
    driveFileId?: string,
    isUpscaled?: boolean, 
    originalHistoryItemId?: string, 
    cfgScale?: number, 
    steps?: number,
    seed?: number, 
    sampler?: string, 
    stylePreset?: string, 
    leonardoPresetStyle?: string,
    useAlchemy?: boolean, 
    usePhotoReal?: boolean, 
    sourceImageForImg2ImgId?: string, 
    initStrengthForImg2Img?: number
  ) => ImageHistoryItem;
  uploadImageToDrive: (
    imageUrl: string, filename: string, prompt: string, concept: string, artStyle: string, 
    aspectRatio: string, originalId: string, negativePrompt?: string, isUpscaled?: boolean,
    originalHistoryItemId?: string, seed?: number
  ) => Promise<DriveFileMetadata>;
  setAppDriveError: (error: string | null) => void;
  setAppIsPlaying: (playing: boolean) => void;
  updateAppAdvancedSettingsForModel: (providerId: ImageProviderId, modelId: string) => void;
  
  setAppCurrentConcept: (concept: string) => void;
  setAppInitialThemeForControls: (theme: string) => void;
  setAppCurrentArtStyle: (style: string) => void;
  setAppInitialArtStyleForControls: (style: string) => void;
  setAppCurrentAspectRatio: (ratio: string) => void;
  setAppInitialAspectRatioForControls: (ratio: string) => void;
  setAppCurrentNegativePrompt: (prompt: string) => void;
  setAppInitialNegativePromptForControls: (prompt: string) => void;
  setAppCurrentCfgScale: (scale: number) => void;
  setAppInitialCfgScaleForControls: (scale: number) => void;
  setAppCurrentSteps: (steps: number) => void;
  setAppInitialStepsForControls: (steps: number) => void;
  setAppCurrentSeed: (seed?: number) => void;
  setAppInitialSeedForControls: (seed?: number) => void;
  setAppCurrentSampler: (sampler?: string) => void;
  setAppInitialSamplerForControls: (sampler?: string) => void;
  setAppCurrentStylePreset: (preset?: string) => void;
  setAppInitialStylePresetForControls: (preset?: string) => void;
  setAppCurrentLeonardoPresetStyle: (preset?: string) => void;
  setAppInitialLeonardoPresetStyleForControls: (preset?: string) => void;
  setAppCurrentUseAlchemy: (use: boolean) => void;
  setAppInitialUseAlchemyForControls: (use: boolean) => void;
  setAppCurrentUsePhotoReal: (use: boolean) => void;
  setAppInitialUsePhotoRealForControls: (use: boolean) => void;
}

export const useImageGeneration = (props: UseImageGenerationProps) => {
  const {
    showToast, logAppEvent, addImageToHistory, uploadImageToDrive, setAppDriveError,
    setAppIsPlaying, updateAppAdvancedSettingsForModel,
    setAppCurrentConcept, setAppInitialThemeForControls, setAppCurrentArtStyle, setAppInitialArtStyleForControls,
    setAppCurrentAspectRatio, setAppInitialAspectRatioForControls, setAppCurrentNegativePrompt, setAppInitialNegativePromptForControls,
    setAppCurrentCfgScale, setAppInitialCfgScaleForControls, setAppCurrentSteps, setAppInitialStepsForControls,
    setAppCurrentSeed, setAppInitialSeedForControls, setAppCurrentSampler, setAppInitialSamplerForControls,
    setAppCurrentStylePreset, setAppInitialStylePresetForControls, setAppCurrentLeonardoPresetStyle, setAppInitialLeonardoPresetStyleForControls,
    setAppCurrentUseAlchemy, setAppInitialUseAlchemyForControls, setAppCurrentUsePhotoReal, setAppInitialUsePhotoRealForControls
  } = props;

  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState<string>("");
  const [currentEvolvingConcept, setCurrentEvolvingConcept] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [currentGroundingSources, setCurrentGroundingSources] = useState<GroundingSource[] | undefined>(undefined);

  const evolutionTimerRef = useRef<number | undefined>(undefined);
  const currentEvolutionSettingsRef = useRef<GenerationSettings | null>(null);
  const isPlayingRef = useRef(false);

  const { 
    imageUrl: falRealtimeImageUrl, 
    isLoading: isFalRealtimeLoading, 
    error: falRealtimeError, 
    generate: generateWithFalRealtime,
    disconnect: disconnectFalRealtime 
  } = useFalRealtime();
  const [currentFalGenerationDetails, setCurrentFalGenerationDetails] = useState<GenerationSettings | null>(null);
  const [falGenerationCompletedInternally, setFalGenerationCompletedInternally] = useState(false);


  const _performGenerationStepLogic = useCallback(async (
    settings: GenerationSettings,
    isEvolutionStep: boolean = true
  ) => {
    if (isEvolutionStep && !isPlayingRef.current) {
      setIsLoading(false);
      logAppEvent('INFO', 'Generation step skipped: Not playing (internal check).');
      return;
    }

    setIsLoading(true); // General loading state on, Fal hook will manage its specific loading
    setGenerationError(null);
    setAppDriveError(null);
    if (!isEvolutionStep || settings.selectedImageProvider !== 'fal_ai') {
        setCurrentImageUrl(null); 
    }
    if (!isEvolutionStep) setCurrentGroundingSources(undefined);
    
    const generationConceptForTheme = isEvolutionStep ? currentEvolvingConcept : settings.concept;
    
    let themeResponse: ThemeAndPromptResponse;
    let actualImagePrompt = settings.promptOverride;

    if (!actualImagePrompt) {
      logAppEvent('API', 'Generating theme and prompt from Gemini text model.', { concept: generationConceptForTheme, artStyle: settings.artStyle, grounding: settings.useSearchGrounding });
      try {
        themeResponse = await generateThemeAndPrompt(generationConceptForTheme, settings.artStyle, settings.useSearchGrounding);
        actualImagePrompt = themeResponse.imagePrompt;
        logAppEvent('API', 'Theme and prompt received.', { prompt: actualImagePrompt.substring(0,30)+'...', nextTheme: themeResponse.nextTheme, sources: themeResponse.groundingSources?.length });
        if (themeResponse.groundingSources && themeResponse.groundingSources.length > 0) {
          setCurrentGroundingSources(themeResponse.groundingSources);
          showToast(`Theme grounded with ${themeResponse.groundingSources.length} web source(s).`, 3500);
        } else if (settings.useSearchGrounding) {
          setCurrentGroundingSources(undefined);
        }
      } catch (themeError: any) {
        logAppEvent('ERROR', 'Failed to generate theme and prompt.', { error: themeError.message });
        setGenerationError(`Theme/Prompt generation failed: ${themeError.message}`);
        if(isEvolutionStep) setAppIsPlaying(false); 
        setIsLoading(false);
        return;
      }
    } else {
      logAppEvent('INFO', 'Using overridden prompt.', { prompt: actualImagePrompt.substring(0,30)+'...' });
      themeResponse = { 
        imagePrompt: actualImagePrompt, 
        nextTheme: isEvolutionStep ? (generationConceptForTheme || settings.concept) : settings.concept // Ensure nextTheme is sensible
      };
      setCurrentGroundingSources(undefined);
    }
    setCurrentPrompt(actualImagePrompt);

    const fallbackOrder: ImageProviderId[] = ['gemini', 'fal_ai', 'stability_ai', 'black_forest', 'leonardo_ai', 'replicate'];
    let currentProviderAttemptIndex = fallbackOrder.indexOf(settings.selectedImageProvider);
    if (currentProviderAttemptIndex === -1) currentProviderAttemptIndex = 0;

    let success = false;
    let finalImageUrl: string | null = null;
    let finalProviderId: ImageProviderId = settings.selectedImageProvider;
    let finalModelId: string = settings.selectedModelId;
    
    for (let i = 0; i < fallbackOrder.length; i++) {
        const providerToTryId = fallbackOrder[currentProviderAttemptIndex % fallbackOrder.length];
        const providerConfig = settings.imageProvidersConfig.find(p => p.id === providerToTryId);
        
        if (!providerConfig || providerConfig.models.filter(m => m.type !== 'upscaling' && m.type !== 'inpainting').length === 0) {
             currentProviderAttemptIndex++; continue; 
        }
        
        let modelToTryId = providerConfig.models.find(m => m.type === 'image_generation' || m.type === 'image_to_image' || m.type === undefined)?.id || providerConfig.models[0].id;
        if (i === 0 && providerToTryId === settings.selectedImageProvider) {
            const userSelectedModelInCurrentProvider = providerConfig.models.find(m => m.id === settings.selectedModelId && (m.type === 'image_generation' || m.type === 'image_to_image' || m.type === undefined));
            if(userSelectedModelInCurrentProvider) modelToTryId = settings.selectedModelId;
        }
        const modelConfig = providerConfig.models.find(m => m.id === modelToTryId);
        if (!modelConfig || (modelConfig.type && modelConfig.type !== 'image_generation' && modelConfig.type !== 'image_to_image')) {
            currentProviderAttemptIndex++; continue;
        }
        if (settings.leonardoInitialImageDataUrl && providerToTryId === 'leonardo_ai' && !modelConfig.supportsImageToImage) {
            logAppEvent('WARNING', `Skipping ${providerConfig.displayName} (${modelConfig.displayName}) for Img2Img: model does not support it.`);
            currentProviderAttemptIndex++; continue;
        }
        const currentProviderApiKey = settings.userApiKeys[providerToTryId];
        if (providerConfig.requiresApiKey && (!currentProviderApiKey || currentProviderApiKey.trim() === '')) {
            logAppEvent('WARNING', `Skipping ${providerConfig.displayName}: API Key required but not found or empty.`);
            currentProviderAttemptIndex++; continue;
        }

        const dimensions = mapAspectRatioToDimensions(settings.aspectRatio, modelConfig?.baseDimension || 1024);
        const generationApiOptions: GenerationOptions & { width?: number; height?: number } = {
            prompt: actualImagePrompt, negativePrompt: settings.negativePrompt, aspectRatio: settings.aspectRatio,
            cfgScale: settings.cfgScale, steps: settings.steps, seed: settings.seed, sampler: settings.sampler, 
            stylePreset: settings.stylePreset, leonardoPresetStyle: settings.leonardoPresetStyle, 
            useAlchemy: settings.useAlchemy, usePhotoReal: settings.usePhotoReal,
            width: dimensions.width, height: dimensions.height,
            ...(settings.leonardoInitialImageDataUrl && { leonardoInitialImageDataUrl: settings.leonardoInitialImageDataUrl }),
            ...(settings.leonardoInitStrength !== undefined && { leonardoInitStrength: settings.leonardoInitStrength }),
        };

        if (providerToTryId === 'fal_ai') {
            logAppEvent('API', `Initiating real-time generation with Fal.ai (${modelToTryId}).`, { ...generationApiOptions, attempt: i + 1});
            setCurrentFalGenerationDetails({ 
                ...settings, 
                selectedImageProvider: providerToTryId, // Ensure these are set for this attempt
                selectedModelId: modelToTryId,
                _internalPromptUsed: actualImagePrompt,
                _internalNextTheme: themeResponse.nextTheme,
                _internalGenerationConcept: generationConceptForTheme // Store the concept used for this image
            });
            setFalGenerationCompletedInternally(false);
            generateWithFalRealtime(currentProviderApiKey!, modelToTryId, generationApiOptions);
            finalProviderId = providerToTryId; finalModelId = modelToTryId;
            success = true; 
            break; 
        } else {
            logAppEvent('API', `Attempting generation with ${providerConfig.displayName} (${modelConfig.displayName}).`, { ...generationApiOptions, attempt: i + 1});
            try {
                finalImageUrl = await generateImageFromProvider( providerToTryId, modelToTryId, currentProviderApiKey, generationApiOptions );
                logAppEvent('API', `Image generated successfully via ${providerConfig.displayName} (${modelConfig.displayName}).`);
                finalProviderId = providerToTryId; finalModelId = modelToTryId;
                if (finalProviderId !== settings.selectedImageProvider || finalModelId !== settings.selectedModelId) {
                    showToast(`Switched to ${providerConfig.displayName} (${modelConfig.displayName}) for generation.`, 4000);
                    updateAppAdvancedSettingsForModel(finalProviderId, finalModelId); 
                }
                success = true; break;
            } catch (err: any) {
                logAppEvent('ERROR', `Generation failed with ${providerConfig.displayName} (${modelConfig.displayName}): ${typeof err.message === 'string' ? err.message : String(err)}`, {details: err});
                const errorMsgLower = typeof err.message === 'string' ? err.message.toLowerCase() : "";
                if (errorMsgLower.includes('quota') || errorMsgLower.includes('429') || errorMsgLower.includes('billing') || errorMsgLower.includes('limit') || errorMsgLower.includes('failed to fetch') || errorMsgLower.includes('networkerror') || errorMsgLower.includes('cors issue') || errorMsgLower.includes('api key is required')) {      
                    showToast(`Issue with ${providerConfig.displayName}. Trying next...`, 3500);
                    currentProviderAttemptIndex++;
                } else {
                    setGenerationError(`Provider '${providerConfig.displayName} (${modelConfig.displayName})': ${typeof err.message === 'string' ? err.message : String(err)}`);
                    if(isEvolutionStep) setAppIsPlaying(false); success = false; break;
                }
            }
        }
    }

    if (finalProviderId !== 'fal_ai') { // Handle non-Fal.ai completions here
        if (success && finalImageUrl) {
            setCurrentImageUrl(finalImageUrl);
            if (!isEvolutionStep) {
                 setAppCurrentConcept(settings.concept); setAppInitialThemeForControls(settings.concept);
                 setAppCurrentArtStyle(settings.artStyle); setAppInitialArtStyleForControls(settings.artStyle);
                 setAppCurrentAspectRatio(settings.aspectRatio); setAppInitialAspectRatioForControls(settings.aspectRatio);
                 setAppCurrentNegativePrompt(settings.negativePrompt || ""); setAppInitialNegativePromptForControls(settings.negativePrompt || "");
                 setAppCurrentCfgScale(settings.cfgScale || DEFAULT_CFG_SCALE); setAppInitialCfgScaleForControls(settings.cfgScale || DEFAULT_CFG_SCALE);
                 setAppCurrentSteps(settings.steps || DEFAULT_STEPS); setAppInitialStepsForControls(settings.steps || DEFAULT_STEPS);
                 setAppCurrentSeed(settings.seed); setAppInitialSeedForControls(settings.seed);
            }
            const newHistoryItem = addImageToHistory(finalImageUrl, actualImagePrompt, generationConceptForTheme, settings.mediaType, settings.artStyle, settings.aspectRatio, finalProviderId, finalModelId, settings.negativePrompt, undefined, false, undefined, settings.cfgScale, settings.steps, settings.seed, settings.sampler, settings.stylePreset, settings.leonardoPresetStyle, settings.useAlchemy, settings.usePhotoReal, settings.sourceImageForImg2ImgId, settings.leonardoInitStrength);
            if (settings.driveSyncEnabled && settings.isDriveAuthenticated) { 
                try {
                    const safeConcept = generationConceptForTheme.replace(/[^a-z0-9_.-]/gi, '_').toLowerCase();
                    const safeArtStyle = (settings.artStyle || 'default').replace(/[^a-z0-9_.-]/gi, '_').toLowerCase();
                    const safeAspectRatio = settings.aspectRatio.replace(':','-');
                    const timestampSuffix = new Date().toISOString().slice(11,19).replace(/:/g,'');
                    const filename = `etherscape_${safeConcept}_${safeArtStyle}_${safeAspectRatio}_${timestampSuffix}.jpeg`;
                    const driveFile = await uploadImageToDrive( finalImageUrl, filename, actualImagePrompt, generationConceptForTheme, settings.artStyle, settings.aspectRatio, newHistoryItem.id, settings.negativePrompt, false, undefined, settings.seed );
                    logAppEvent('DRIVE', 'Image uploaded to Google Drive.', { fileId: driveFile.id, filename: driveFile.name });
                } catch (driveUploadError: any) {
                    logAppEvent('ERROR', 'Failed to upload image to Google Drive.', { error: driveUploadError.message });
                    setAppDriveError(`Drive Upload Failed: ${driveUploadError.message}`);
                }
            }
            
            if (isEvolutionStep && isPlayingRef.current) {
                if (themeResponse.nextTheme && themeResponse.nextTheme.trim() !== "" && themeResponse.nextTheme !== currentEvolvingConcept) {
                    setCurrentEvolvingConcept(themeResponse.nextTheme);
                    setAppCurrentConcept(themeResponse.nextTheme); setAppInitialThemeForControls(themeResponse.nextTheme);
                }
                if (themeResponse.groundingSources && themeResponse.groundingSources.length > 0) { setCurrentGroundingSources(themeResponse.groundingSources); } 
                else if (settings.useSearchGrounding) { setCurrentGroundingSources(undefined); }

                if (evolutionTimerRef.current) clearTimeout(evolutionTimerRef.current);
                evolutionTimerRef.current = window.setTimeout(() => {
                    if (currentEvolutionSettingsRef.current) _performGenerationStepLogic(currentEvolutionSettingsRef.current, true);
                }, GENERATION_INTERVAL);
            }
            setIsLoading(false);
        } else if (!success) {
            if(!generationError && !isPlayingRef.current) setGenerationError("All available image providers failed or no image was returned.");
            else if (!generationError && isPlayingRef.current) {
                logAppEvent('WARNING', "All available image providers failed during evolution. Stopping.", {concept: generationConceptForTheme});
                setGenerationError("Evolution stopped: All available image providers failed."); setAppIsPlaying(false);
            }
            setIsLoading(false);
        }
    }
  }, [
    currentEvolvingConcept, logAppEvent, showToast, addImageToHistory, uploadImageToDrive, setAppDriveError, 
    setAppIsPlaying, updateAppAdvancedSettingsForModel,
    setAppCurrentConcept, setAppInitialThemeForControls, setAppCurrentArtStyle, setAppInitialArtStyleForControls,
    setAppCurrentAspectRatio, setAppInitialAspectRatioForControls, setAppCurrentNegativePrompt, setAppInitialNegativePromptForControls,
    setAppCurrentCfgScale, setAppInitialCfgScaleForControls, setAppCurrentSteps, setAppInitialStepsForControls,
    setAppCurrentSeed, setAppInitialSeedForControls, setAppCurrentSampler, setAppInitialSamplerForControls,
    setAppCurrentStylePreset, setAppInitialStylePresetForControls, setAppCurrentLeonardoPresetStyle, setAppInitialLeonardoPresetStyleForControls,
    setAppCurrentUseAlchemy, setAppInitialUseAlchemyForControls, setAppCurrentUsePhotoReal, setAppInitialUsePhotoRealForControls,
    generateWithFalRealtime
  ]);

  // Effect for Fal.ai: Displaying intermediate images
  useEffect(() => {
    if (falRealtimeImageUrl && currentFalGenerationDetails && isFalRealtimeLoading) {
        setCurrentImageUrl(falRealtimeImageUrl); 
        logAppEvent('LIVE_QUERY', 'Fal.ai intermediate image received.', { url: falRealtimeImageUrl.substring(0,50) + "..."});
    }
  }, [falRealtimeImageUrl, currentFalGenerationDetails, isFalRealtimeLoading, logAppEvent]);


  // Effect for Fal.ai: Handling completion
  useEffect(() => {
    if (falRealtimeImageUrl && !isFalRealtimeLoading && !falRealtimeError && currentFalGenerationDetails && !falGenerationCompletedInternally) {
      setFalGenerationCompletedInternally(true); 
      setCurrentImageUrl(falRealtimeImageUrl); // Ensure final image is set
      
      const settings = currentFalGenerationDetails;
      const actualImagePrompt = settings._internalPromptUsed || "Prompt from Fal.ai (not captured)";
      const conceptUsedForGeneration = settings._internalGenerationConcept || settings.concept;
      const nextThemeForEvo = settings._internalNextTheme;

      logAppEvent('API', `Image generation completed via Fal.ai (${settings.selectedModelId}).`, { url: falRealtimeImageUrl.substring(0,50) + "..."});
      if (settings.selectedImageProvider !== 'fal_ai' || settings.selectedModelId !== currentFalGenerationDetails.selectedModelId) {
          showToast(`Switched to Fal.ai (${currentFalGenerationDetails.selectedModelId}) for generation.`, 4000);
          updateAppAdvancedSettingsForModel('fal_ai', currentFalGenerationDetails.selectedModelId);
      }
      
      const newHistoryItem = addImageToHistory(
          falRealtimeImageUrl, actualImagePrompt, conceptUsedForGeneration, settings.mediaType, settings.artStyle, settings.aspectRatio,
          'fal_ai', settings.selectedModelId, settings.negativePrompt, undefined, false, undefined,
          settings.cfgScale, settings.steps, settings.seed, settings.sampler, settings.stylePreset,
          settings.leonardoPresetStyle, settings.useAlchemy, settings.usePhotoReal,
          settings.sourceImageForImg2ImgId, settings.leonardoInitStrength
      );

      if (settings.driveSyncEnabled && settings.isDriveAuthenticated) {
          (async () => {
            try {
                const safeConcept = conceptUsedForGeneration.replace(/[^a-z0-9_.-]/gi, '_').toLowerCase();
                const safeArtStyle = (settings.artStyle || 'default').replace(/[^a-z0-9_.-]/gi, '_').toLowerCase();
                const safeAspectRatio = settings.aspectRatio.replace(':','-');
                const timestampSuffix = new Date().toISOString().slice(11,19).replace(/:/g,'');
                const filename = `etherscape_fal_${safeConcept}_${safeArtStyle}_${safeAspectRatio}_${timestampSuffix}.jpeg`;
                const driveFile = await uploadImageToDrive(falRealtimeImageUrl, filename, actualImagePrompt, conceptUsedForGeneration, settings.artStyle, settings.aspectRatio, newHistoryItem.id, settings.negativePrompt, false, undefined, settings.seed);
                logAppEvent('DRIVE', 'Fal.ai image uploaded to Google Drive.', { fileId: driveFile.id, filename: driveFile.name });
            } catch (e: any) {
                setAppDriveError(`Drive Upload (Fal.ai): ${e.message}`);
                showToast('Failed to save Fal.ai image to Drive.', 4000);
                logAppEvent('ERROR', 'Drive upload failed for Fal.ai image.', { error: e.message });
            }
          })();
      }

      if (isPlayingRef.current && currentEvolutionSettingsRef.current) {
        if (nextThemeForEvo && nextThemeForEvo.trim() !== "" && nextThemeForEvo !== currentEvolvingConcept) {
             setCurrentEvolvingConcept(nextThemeForEvo);
             setAppCurrentConcept(nextThemeForEvo); setAppInitialThemeForControls(nextThemeForEvo);
        }
        
        if (evolutionTimerRef.current) clearTimeout(evolutionTimerRef.current);
        evolutionTimerRef.current = window.setTimeout(() => {
          if (currentEvolutionSettingsRef.current && isPlayingRef.current) { // Check isPlayingRef again
            _performGenerationStepLogic(currentEvolutionSettingsRef.current, true);
          }
        }, GENERATION_INTERVAL);
      } else if (!isPlayingRef.current) { // Single generation completed
         setAppCurrentConcept(conceptUsedForGeneration); setAppInitialThemeForControls(conceptUsedForGeneration);
         setAppCurrentArtStyle(settings.artStyle); setAppInitialArtStyleForControls(settings.artStyle);
         // etc. for other settings if needed for single gen completion
      }
      setCurrentFalGenerationDetails(null); 
    }
  }, [
    falRealtimeImageUrl, isFalRealtimeLoading, falRealtimeError, currentFalGenerationDetails, falGenerationCompletedInternally,
    logAppEvent, addImageToHistory, uploadImageToDrive, showToast, updateAppAdvancedSettingsForModel,
    setAppDriveError, currentEvolvingConcept, _performGenerationStepLogic,
    setAppCurrentConcept, setAppInitialThemeForControls, setAppCurrentArtStyle, setAppInitialArtStyleForControls
  ]);

  // Effect for Fal.ai: Handling errors
  useEffect(() => {
    if (falRealtimeError && currentFalGenerationDetails) {
      logAppEvent('ERROR', `Fal.ai generation failed: ${falRealtimeError}`, {details: currentFalGenerationDetails});
      setGenerationError(`Fal.ai (${currentFalGenerationDetails.selectedModelId}): ${falRealtimeError}`);
      if(isPlayingRef.current) {
        setAppIsPlaying(false); 
        isPlayingRef.current = false;
      }
      setCurrentFalGenerationDetails(null); 
    }
  }, [falRealtimeError, currentFalGenerationDetails, logAppEvent, setGenerationError, setAppIsPlaying]);

  // Effect to sync overall isLoading state with Fal.ai loading state
  useEffect(() => {
    if (currentFalGenerationDetails) { 
      setIsLoading(isFalRealtimeLoading);
    }
    // If not a Fal.ai generation, setIsLoading is handled by _performGenerationStepLogic itself.
  }, [isFalRealtimeLoading, currentFalGenerationDetails]);


  const performSingleGeneration = useCallback((settings: GenerationSettings) => {
    isPlayingRef.current = false; 
    if (evolutionTimerRef.current) clearTimeout(evolutionTimerRef.current);
    disconnectFalRealtime();
    setCurrentFalGenerationDetails(null); 
    setFalGenerationCompletedInternally(false);
    setCurrentEvolvingConcept(settings.concept); // For consistency, even if not evolving
    _performGenerationStepLogic(settings, false);
  }, [_performGenerationStepLogic, disconnectFalRealtime]);

  const startEvolution = useCallback((initialSettings: GenerationSettings) => {
    setGenerationError(null);
    setAppDriveError(null);
    setCurrentGroundingSources(undefined);
    disconnectFalRealtime();
    setCurrentFalGenerationDetails(null);
    setFalGenerationCompletedInternally(false);
    
    setCurrentEvolvingConcept(initialSettings.concept); 
    currentEvolutionSettingsRef.current = initialSettings;
    isPlayingRef.current = true;
    _performGenerationStepLogic(initialSettings, true);
  }, [_performGenerationStepLogic, setAppDriveError, disconnectFalRealtime]);

  const stopEvolution = useCallback(() => {
    isPlayingRef.current = false;
    if (evolutionTimerRef.current) {
      clearTimeout(evolutionTimerRef.current);
      evolutionTimerRef.current = undefined;
    }
    disconnectFalRealtime(); 
    setCurrentFalGenerationDetails(null);
    // Set isLoading to false explicitly if we are stopping Fal, as its loading state might still be true
    if (currentFalGenerationDetails) setIsLoading(false); 
    logAppEvent('INFO', 'Evolution stop requested by user.');
  }, [logAppEvent, disconnectFalRealtime, currentFalGenerationDetails]);

  useEffect(() => {
    return () => { 
      if (evolutionTimerRef.current) clearTimeout(evolutionTimerRef.current);
      disconnectFalRealtime(); 
    };
  }, [disconnectFalRealtime]);

  return {
    currentImageUrl,
    currentPrompt,
    currentEvolvingConcept, 
    isLoading,
    generationError,
    currentGroundingSources,
    performSingleGeneration,
    startEvolution,
    stopEvolution,
  };
};
