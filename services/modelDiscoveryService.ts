
import { ModelSetting, ImageProviderId, StabilityEngineInfo, LeonardoPlatformModelsResponse, LeonardoModelInfo } from '../types';
import { FLEXIBLE_COMMON_ASPECT_RATIOS, WIDESCREEN_ULTRAWIDE_ASPECT_RATIOS, COMMON_ASPECT_RATIOS } from '../constants';

// Helper to determine aspect ratios and base dimension for Stability AI models
const getStabilityModelDetails = (engineId: string): Pick<ModelSetting, 'supportedAspectRatios' | 'baseDimension'> => {
  if (engineId.includes('xl')) { // Includes SDXL and potentially SD3 variants if they follow "xl"
    return { supportedAspectRatios: WIDESCREEN_ULTRAWIDE_ASPECT_RATIOS, baseDimension: 1024 };
  } else if (engineId.includes('v2.1') || engineId.includes('768')) { // SD 2.1 is often better at 768
    return { supportedAspectRatios: FLEXIBLE_COMMON_ASPECT_RATIOS, baseDimension: 768 };
  } else if (engineId.includes('v1')) { // SD 1.x models
    return { supportedAspectRatios: FLEXIBLE_COMMON_ASPECT_RATIOS, baseDimension: 512 };
  }
  // Fallback for unknown Stability models
  return { supportedAspectRatios: COMMON_ASPECT_RATIOS, baseDimension: 512 };
};


export const fetchStabilityAIModels = async (apiKey: string): Promise<ModelSetting[]> => {
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("Stability AI API Key is required to fetch models.");
  }
  try {
    const response = await fetch("https://api.stability.ai/v1/engines/list", {
      headers: {
        "Authorization": `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) throw new Error("Stability AI: Invalid API Key or authentication failed.");
      throw new Error(`Stability AI API Error: ${response.status} ${response.statusText}`);
    }

    const engines: StabilityEngineInfo[] = await response.json();
    
    return engines
      .filter(engine => engine.type === "PICTURE") // Filter for image generation models
      .map(engine => {
        const details = getStabilityModelDetails(engine.id);
        return {
          id: engine.id,
          displayName: engine.name,
          supportsNegativePrompt: true, // Most SD models support negative prompts
          supportedAspectRatios: details.supportedAspectRatios,
          baseDimension: details.baseDimension,
          type: 'image_generation' as const, // All "PICTURE" type engines are for generation
        };
      })
      .sort((a,b) => a.displayName.localeCompare(b.displayName)); // Sort for consistent display

  } catch (error) {
    console.error("Error fetching Stability AI models:", error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch Stability AI models: ${message}`);
  }
};

export const fetchLeonardoAIModels = async (apiKey: string): Promise<ModelSetting[]> => {
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("Leonardo.Ai API Key is required to fetch models.");
  }
  try {
    const response = await fetch("https://cloud.leonardo.ai/api/rest/v1/platformModels", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json",
      }
    });

    if (!response.ok) {
        if (response.status === 401) throw new Error("Leonardo.Ai: Invalid API Key or authentication failed.");
        let errorDetails = `Leonardo.Ai API Error: ${response.status} ${response.statusText}`;
        try {
            const errorJson = await response.json();
            errorDetails = `Leonardo.Ai API Error: ${errorJson.error || errorJson.message || response.statusText}`;
        } catch (e) {/* ignore */}
        throw new Error(errorDetails);
    }

    const data: LeonardoPlatformModelsResponse = await response.json();
    
    return data.custom_models.map((model: LeonardoModelInfo) => {
      // Leonardo models can vary, so we provide flexible ratios
      // Their API specifies modelHeight and modelWidth, which is the native/trained aspect ratio
      const nativeAspectRatio = `${model.modelWidth}:${model.modelHeight}`;
      // Let's create a list of supported ratios starting with native, then adding common ones
      const aspectRatios = Array.from(new Set([nativeAspectRatio, ...FLEXIBLE_COMMON_ASPECT_RATIOS]));

      return {
        id: model.id,
        displayName: model.name,
        supportsNegativePrompt: true, // Assume true for most Leonardo models
        // Use modelHeight as a reference for baseDimension, or average if very different
        baseDimension: model.modelHeight || 768, 
        supportedAspectRatios: aspectRatios,
        type: 'image_generation' as const, // These are platform generation models
      };
    })
    .sort((a,b) => a.displayName.localeCompare(b.displayName));

  } catch (error) {
    console.error("Error fetching Leonardo.Ai models:", error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch Leonardo.Ai models: ${message}`);
  }
};
