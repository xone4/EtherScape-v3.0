// Basic Tool and FunctionDeclaration structures (simplified, actual from @google/genai are more complex)
// These are illustrative; we'll use the SDK's implicit types where possible.
export interface GeminiParameterSchema {
  type: string; // e.g., "STRING", "NUMBER", "BOOLEAN", "OBJECT"
  description?: string;
  properties?: Record<string, GeminiParameterSchema>;
  required?: string[];
  // Add other schema fields like 'enum' if needed later
}

export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters?: GeminiParameterSchema;
}

export interface GeminiTool {
  functionDeclarations?: GeminiFunctionDeclaration[];
  // Potentially other tool types here in future (e.g. codeInterpreterTool)
}

// Parts for chat messages, especially for function calling
export interface GeminiFunctionCallPart {
  functionCall: {
    name: string;
    args?: Record<string, any>; // Made args optional
  };
}

export interface GeminiFunctionResponsePart {
  functionResponse: {
    name: string;
    response: Record<string, any>; // Contains the result of the function execution
  };
}

export interface GeminiTextPart {
    text: string;
}

export type GeminiChatContentPart = GeminiTextPart | GeminiFunctionCallPart | GeminiFunctionResponsePart;


export interface GroundingSource {
  web: {
    uri: string;
    title: string;
  };
}

export interface ThemeAndPromptResponse {
  imagePrompt: string;
  nextTheme: string;
  groundingSources?: GroundingSource[];
}

export interface GeminiImagePayload {
  imageBytes?: string; 
}

export interface GeneratedImageItem {
  image?: GeminiImagePayload;
}

export interface GeminiImageGenerationResponse {
  generatedImages?: GeneratedImageItem[]; 
}

export interface ModelSetting {
  id: string;          
  displayName: string; 
  supportsNegativePrompt?: boolean;
  supportedAspectRatios?: string[]; 
  baseDimension?: number; 
  type?: 'image_generation' | 'upscaling' | 'inpainting' | 'image_to_image' | 'video' | 'audio'; // Added video and audio
  supportsImageToImage?: boolean; 

  availableSamplers?: string[]; 
  defaultCfgScale?: number;
  defaultSteps?: number;
  defaultSeed?: number; 
  availableStylePresets?: string[]; 
  
  supportsAlchemy?: boolean;
  supportsPhotoReal?: boolean;
  availableLeonardoPresetStyles?: string[];
}

export interface ImageProviderSetting {
  id: ImageProviderId;
  displayName: string;
  requiresApiKey?: boolean; 
  apiKeyStored?: boolean; 
  apiKeyLabel?: string; 
  apiKeyManagementUrl?: string; 
  models: ModelSetting[]; 
  isDynamic?: boolean; 
}

export type MediaType = 'image' | 'video' | 'audio';

export interface ImageHistoryItem {
  id: string; 
  imageUrl: string; // For images, this is the direct image URL. For video/audio, it's the media file URL.
  prompt: string; // For images, the generation prompt. For video/audio, the prompt used to generate them.
  concept: string; // Thematic concept.
  mediaType: MediaType; // Type of media.
  artStyle?: string; // Applicable mainly to images.
  aspectRatio: string; // Applicable mainly to images and videos.
  driveFileId?: string; 
  provider?: ImageProviderId; // Provider used for generation.
  modelId?: string; 
  modelDisplayName?: string;
  negativePrompt?: string; 
  isUpscaled?: boolean; // Image-specific.
  originalHistoryItemId?: string; // For upscaled images or derived media.

  // Image-specific generation parameters
  cfgScale?: number;
  steps?: number;
  seed?: number; 
  sampler?: string;
  stylePreset?: string; 
  leonardoPresetStyle?: string; 
  useAlchemy?: boolean; 
  usePhotoReal?: boolean; 
  
  // Image-to-image specific
  sourceImageForImg2ImgId?: string; 
  initStrengthForImg2Img?: number;

  // Future: Add duration for video/audio if needed
  // duration?: number; // in seconds
}

export interface FullscreenImage extends ImageHistoryItem {} // May need to rename if it can show video/audio details

export interface DriveFileMetadata {
  id: string;
  name: string;
  mimeType?: string;
  description?: string; 
  appProperties?: { 
    concept?: string;
    artStyle?: string; 
    prompt?: string; 
    originalId?: string; 
    negativePrompt?: string;
    aspectRatio?: string; 
    isUpscaled?: string; 
    originalHistoryItemId?: string;
    seed?: string; 
    mediaType?: MediaType; // Store mediaType in Drive as well
  };
  webViewLink?: string; 
  webContentLink?: string; 
}

export type LogEntryType = 'INFO' | 'ERROR' | 'WARNING' | 'DRIVE' | 'SYSTEM' | 'API' | 'EDITING' | 'MODEL_DISCOVERY' | 'LIVE_QUERY' | 'GROUNDING' | 'CHAT' | 'AUDIO' | 'VIDEO';

export interface LogEntry {
  timestamp: string;
  type: LogEntryType;
  message: string;
  details?: any; 
}

export interface DevPlanData {
  completed: string[];
  inProgress: string[];
  future: string[];
}

export interface TroubleshootingItem {
  problem: string;
  solution: string;
}
export type TroubleshootingGuideData = TroubleshootingItem[];

export type ImageProviderId = 
  | 'gemini'
  | 'fal_ai'
  | 'black_forest'
  | 'stability_ai'
  | 'replicate'
  | 'leonardo_ai'
  | 'clipdrop'; 

export type UserApiKeys = {
  [key in ImageProviderId]?: string; 
};

export interface EnhancedPromptResponse { 
  enhancedPrompt: string;
}

export interface PresetItem {
  id: string; 
  name: string; 
  concept: string;
  artStyle: string;
  aspectRatio: string; 
  providerId: ImageProviderId;
  modelId: string;
  negativePrompt?: string;

  cfgScale?: number;
  steps?: number;
  seed?: number; 
  sampler?: string;
  stylePreset?: string; 
  leonardoPresetStyle?: string; 
  useAlchemy?: boolean; 
  usePhotoReal?: boolean; 
}

export type HistoryActionType = 'fullscreen' | 'delete' | 'enhance' | 'regenerate' | 'use_concept' | 'copy_prompt' | 'download' | 'branch' | 'edit' | 'upscale' | 'animate_svd' | 'generate_soundscape' | 'play_media';

export interface ArtStyleCategory {
  categoryName: string;
  styles: string[];
}

export interface UpscaleRequest {
  imageUrl: string;
  scaleFactor: 2 | 4; 
}

export interface EditingError {
  tool: 'upscale' | 'clipdrop_upscale' | 'clipdrop_inpaint' | 'inpaint' | 'img2img'; 
  message: string;
}

export interface StabilityEngineInfo {
  id: string;
  name: string;
  description: string;
  type: "AUDIO" | "CLASSIFICATION" | "PICTURE" | "STORAGE" | "TEXT" | "VIDEO";
}

export interface LeonardoModelInfo {
  id: string;
  name: string;
  description?: string | null;
  instance_prompt?: string | null;
  modelHeight: number;
  modelWidth: number;
}
export interface LeonardoPlatformModelsResponse {
    custom_models: LeonardoModelInfo[]; 
}

export interface GenerationOptions {
  prompt: string;
  negativePrompt?: string;
  aspectRatio: string;
  cfgScale?: number;
  steps?: number;
  seed?: number;
  sampler?: string; 
  stylePreset?: string; 
  leonardoPresetStyle?: string; 
  useAlchemy?: boolean; 
  usePhotoReal?: boolean; 
  leonardoInitialImageDataUrl?: string;
  leonardoInitStrength?: number;
}

// Chat feature types
export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system' | 'function'; // Added 'function' role for function responses
  // `text` is for simple text messages. For function calls/responses, content might be more structured.
  // However, for display purposes, we'll aim to have a string representation.
  text: string; 
  timestamp: string;
  // Optional: if the message involves function interaction
  functionCall?: GeminiFunctionCallPart['functionCall'];
  functionResponse?: GeminiFunctionResponsePart['functionResponse'];
  // We can also store the raw parts if needed for more complex rendering later.
  // parts?: GeminiChatContentPart[];
}


export type ChatProviderId = 'gemini' | 'deepseek' | 'mistral' | 'cohere' | 'anthropic' | 'groq';

export interface ChatModelSetting {
  id: string;
  displayName: string;
  contextWindow?: number; 
  defaultTemperature?: number;
}

export interface ChatProviderSetting {
  id: ChatProviderId;
  displayName: string;
  requiresApiKey?: boolean;
  apiKeyLabel?: string;
  apiKeyManagementUrl?: string;
  models: ChatModelSetting[];
  isPlaceholder?: boolean; 
}

export type UserChatApiKeys = {
  [key in ChatProviderId]?: string;
};

export interface ChatConfig {
  temperature?: number;
  topK?: number;
  topP?: number;
  maxOutputTokens?: number;
  seed?: number;
  stopSequences?: string[];
}

export const MAX_COMPARE_ITEMS = 4;