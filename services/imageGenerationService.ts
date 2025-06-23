
import { GoogleGenAI } from "@google/genai";
import { GeminiImageGenerationResponse, UserApiKeys, ImageProviderId, ModelSetting, GenerationOptions } from '../types';
import { IMAGE_PROVIDERS_STATIC, STABILITY_SD3_STYLE_PRESETS, LEONARDO_PRESET_STYLES, STABILITY_SAMPLERS } from "../constants";

// This is the Gemini AI instance, initialized with the primary API key from environment variables.
// It's used ONLY for the 'gemini' provider.
const primaryAi = process.env.API_KEY ? new GoogleGenAI({ apiKey: process.env.API_KEY }) : null;

// Helper function to convert data URL to Blob
const dataUrlToBlob = (dataUrl: string): { blob: Blob, extension: string } => {
  const parts = dataUrl.split(',');
  const mimeTypeMatch = parts[0].match(/:(.*?);/);
  if (!mimeTypeMatch || mimeTypeMatch.length < 2) {
    throw new Error("Invalid data URL: MIME type not found.");
  }
  const mimeType = mimeTypeMatch[1];
  const extension = mimeType.split('/')[1] || 'png'; // Default to png if subtype is missing
  
  const byteCharacters = atob(parts[1]);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return { blob: new Blob([byteArray], { type: mimeType }), extension };
};


const generateImageWithGemini = async (
  modelId: string = "imagen-3.0-generate-002",
  options: GenerationOptions
): Promise<string> => {
  if (!primaryAi) {
    throw new Error("Primary Gemini AI client (for default Imagen) is not initialized. API_KEY might be missing.");
  }
  try {
    const actualGeminiModel = modelId || "imagen-3.0-generate-002";
    const imageConfig: any = { numberOfImages: 1, outputMimeType: 'image/jpeg' };

    if (options.aspectRatio && options.aspectRatio !== '1:1') {
        console.warn(`Gemini (Imagen 3 via generateImages): Aspect ratio "${options.aspectRatio}" requested, but may not be supported. Model will use default.`);
    }
    if (options.seed !== undefined) {
      console.warn(`Gemini (Imagen 3 via generateImages): Seed parameter is not directly supported by this API endpoint. Seed was: ${options.seed}`);
    }

    let combinedPrompt = options.prompt;
    if (options.negativePrompt) {
      combinedPrompt = `${options.prompt}### Omit or avoid: ${options.negativePrompt}`;
      console.info("Gemini (Imagen 3): Negative prompt incorporated into main prompt.");
    }

    const response: GeminiImageGenerationResponse = await primaryAi.models.generateImages({
        model: actualGeminiModel,
        prompt: combinedPrompt,
        config: imageConfig,
    });

    const firstImageItem = response.generatedImages?.[0];
    if (firstImageItem?.image?.imageBytes) {
      return `data:image/jpeg;base64,${firstImageItem.image.imageBytes}`;
    } else {
      let detailedError = "No image data received from Gemini image generation API.";
      console.error("Problematic Gemini image item content:", JSON.stringify(firstImageItem || response));
      throw new Error(detailedError);
    }
  } catch (error) {
    console.error("Error in generateImageWithGemini:", error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Gemini image generation failed: ${message}`);
  }
};

const generateImageWithBlackForest = async (
  apiKey: string,
  modelId: string,
  options: GenerationOptions & { width?: number; height?: number } // Expect width/height from caller
): Promise<string> => {
  try {
    const payload: any = {
      prompt: options.prompt,
      model_id: modelId,
      width: options.width, // Use pre-calculated width
      height: options.height, // Use pre-calculated height
    };
    if (options.negativePrompt) payload.negative_prompt = options.negativePrompt;
    if (options.seed !== undefined) payload.seed = options.seed;

    const initialResponse = await fetch("https://api.blackforestlabs.ai/v1/flux/generate", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify(payload)
    });

    if (!initialResponse.ok) {
      const errorData = await initialResponse.json().catch(() => ({ detail: initialResponse.statusText, message: `Status: ${initialResponse.status}` }));
      throw new Error(`BFL API Error (initial): ${errorData.message || errorData.detail}`);
    }
    const initialResult = await initialResponse.json();

    if (initialResult.image_url) return initialResult.image_url;
    if (initialResult.image_base64) return `data:image/jpeg;base64,${initialResult.image_base64}`;

    const jobId = initialResult.id || initialResult.job_id;
    const jobStatusInitial = initialResult.status ? String(initialResult.status).toUpperCase() : null;

    if (jobId && jobStatusInitial && ["QUEUED", "PENDING", "PROCESSING"].includes(jobStatusInitial)) {
      console.log(`BFL: Job ${jobId} (${jobStatusInitial}). Polling...`);
      let pollAttempts = 0;
      const maxPollAttempts = 45;
      const pollDelay = 2000;

      while (pollAttempts < maxPollAttempts) {
        await new Promise(resolve => setTimeout(resolve, pollDelay));
        const pollResponse = await fetch(`https://api.blackforestlabs.ai/v1/utility/get-result/${jobId}`, {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (!pollResponse.ok) {
          const errorData = await pollResponse.json().catch(() => ({ detail: pollResponse.statusText, message: `Status: ${pollResponse.status}` }));
          throw new Error(`BFL API Error (polling job ${jobId}): ${errorData.message || errorData.detail}`);
        }
        const pollResult = await pollResponse.json();
        const currentPollStatus = pollResult.status ? String(pollResult.status).toUpperCase() : null;

        if (currentPollStatus === "COMPLETED") {
          if (pollResult.result?.image_url) return pollResult.result.image_url;
          if (pollResult.result?.image_base64) return `data:image/jpeg;base64,${pollResult.result.image_base64}`;
          throw new Error("BFL: Job completed but no image data.");
        } else if (currentPollStatus === "FAILED") {
          throw new Error(`BFL: Job ${jobId} failed. Reason: ${pollResult.error?.message || pollResult.error?.detail || "Unknown"}`);
        }
        console.log(`BFL: Job ${jobId} status: ${currentPollStatus}, progress: ${pollResult.progress || 'N/A'}`);
        pollAttempts++;
      }
      throw new Error(`BFL: Job ${jobId} timed out.`);
    }
    throw new Error("BFL: Invalid response. No image or job ID.");
  } catch (error) {
    console.error("Error in generateImageWithBlackForest:", error);
    const message = error instanceof Error ? error.message : String(error); 
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('failed to fetch') || lowerMessage.includes('load failed')) {
        throw new Error(`BFL: Network connection, CORS, DNS issue, or ad-blocker interference. Original: ${message}`);
    }
    throw new Error(`BFL image generation failed: ${message}`);
  }
};

const generateImageWithStability = async (
  apiKey: string,
  modelId: string,
  options: GenerationOptions & { width?: number; height?: number } // Expect width/height
): Promise<string> => {
  try {
    if (modelId.includes('sd3')) { 
      const payload: any = {
        prompt: options.prompt,
        aspect_ratio: options.aspectRatio,
        output_format: 'jpeg', 
      };
      if (options.negativePrompt) payload.negative_prompt = options.negativePrompt;
      if (options.stylePreset && options.stylePreset.trim() !== "" && STABILITY_SD3_STYLE_PRESETS.includes(options.stylePreset)) {
        payload.style_preset = options.stylePreset;
      }
      if (options.seed !== undefined) payload.seed = options.seed;

      const response = await fetch("https://api.stability.ai/v2beta/stable-image/generate/sd3", {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${apiKey}`, 
            'Content-Type': 'application/json',
            'Accept': 'application/json' 
        },
        body: JSON.stringify(payload),
      });

       if (!response.ok) {
        let errorDetails = `Stability AI API Error (SD3 endpoint): ${response.status} ${response.statusText}`;
        try {
          const errorJson = await response.json();
          if (errorJson && (errorJson.message || (errorJson.errors && errorJson.errors.length > 0) )) {
            errorDetails = `Stability AI API Error (SD3 endpoint): ${errorJson.message || errorJson.errors.join(', ')}`;
          }
        } catch (e) {
          const errorText = await response.text().catch(()=>"");
          if (errorText) errorDetails = `Stability AI API Error (SD3 endpoint): ${errorText}`;
        }
        throw new Error(errorDetails);
      }
      const result = await response.json();
      if (result.image && typeof result.image === 'string') {
        return `data:image/jpeg;base64,${result.image}`;
      } else {
        console.error("Stability AI (SD3 endpoint) response missing image data:", result);
        throw new Error("Stability AI (SD3 endpoint): No base64 image data received.");
      }
    } else {
      const textPrompts = [{ text: options.prompt, weight: 1.0 }];
      if (options.negativePrompt) {
        textPrompts.push({ text: options.negativePrompt, weight: -1.0 });
      }

      const payload: any = {
        text_prompts: textPrompts,
        width: options.width, // Use pre-calculated width
        height: options.height, // Use pre-calculated height
        samples: 1,
        cfg_scale: options.cfgScale,
        steps: options.steps,
      };
      if (options.sampler && STABILITY_SAMPLERS.includes(options.sampler)) payload.sampler = options.sampler;
      if (options.seed !== undefined) payload.seed = options.seed;

      const response = await fetch(`https://api.stability.ai/v1/generation/${modelId}/text-to-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
      });

       if (!response.ok) {
        let errorDetails = `Stability AI API Error (engine: ${modelId}): ${response.status} ${response.statusText}`;
        try {
          const errorJson = await response.json();
          if (errorJson && errorJson.message) {
               errorDetails = `Stability AI API Error (engine: ${modelId}): ${errorJson.message}`;
          } else if (errorJson && errorJson.errors && errorJson.errors.length > 0) {
               errorDetails = `Stability AI API Error (engine: ${modelId}): ${errorJson.errors.join(', ')}`;
          } else {
             const errorText = await response.text().catch(() => "");
             if(errorText) errorDetails = `Stability AI API Error (engine: ${modelId}): ${errorText}`;
          }
        } catch (e) {
          const errorText = await response.text().catch(()=>"");
          if (errorText) errorDetails = `Stability AI API Error (engine: ${modelId}): ${errorText}`;
        }
        throw new Error(errorDetails);
      }
      const result = await response.json();
      if (result.artifacts && result.artifacts.length > 0 && result.artifacts[0].base64) {
        return `data:image/jpeg;base64,${result.artifacts[0].base64}`;
      } else {
        console.error("Stability AI (v1 engine) response missing image data:", result);
        throw new Error("Stability AI (v1 engine): No image data received.");
      }
    }
  } catch (error) {
    console.error(`Error in generateImageWithStability (modelId: ${modelId}):`, error);
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes('failed to fetch')) {
        throw new Error(`Stability AI: Network/CORS issue (model ${modelId}). Original: ${message}`);
    }
    throw new Error(`Stability AI (model: ${modelId}) generation failed: ${message}`);
  }
};

const generateImageWithReplicate = async (
  apiKey: string,
  modelVersionIdWithAuthor: string,
  options: GenerationOptions & { width?: number; height?: number } // Expect width/height
): Promise<string> => {
  try {
    const versionId = modelVersionIdWithAuthor.split(':')[1] || modelVersionIdWithAuthor;
    const inputPayload: any = {
      prompt: options.prompt,
      width: options.width, // Use pre-calculated width
      height: options.height, // Use pre-calculated height
      num_inference_steps: options.steps,
      guidance_scale: options.cfgScale,
    };
    if (options.negativePrompt) inputPayload.negative_prompt = options.negativePrompt;
    if (options.seed !== undefined) inputPayload.seed = options.seed;

    const startResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: { "Authorization": `Token ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ version: versionId, input: inputPayload }),
    });

    let prediction = await startResponse.json();
    if (startResponse.status !== 201) {
      throw new Error(`Replicate API Error (start): ${prediction.detail || startResponse.statusText}`);
    }

    const predictionUrl = prediction.urls.get;
    while (prediction.status !== "succeeded" && prediction.status !== "failed") {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const pollResponse = await fetch(predictionUrl, {
        headers: { "Authorization": `Token ${apiKey}`, "Content-Type": "application/json" }
      });
      prediction = await pollResponse.json();
      if (!pollResponse.ok) {
          throw new Error(`Replicate API Error (polling): ${prediction.detail || pollResponse.statusText}`);
      }
    }
    if (prediction.status === "failed") {
      throw new Error(`Replicate generation failed (model version: ${versionId}): ${prediction.error || 'Unknown error'}`);
    }
    if (prediction.output && Array.isArray(prediction.output) && prediction.output.length > 0 && typeof prediction.output[0] === 'string') {
      return prediction.output[0];
    } else {
      console.error("Replicate response missing output URL:", prediction);
      throw new Error("Replicate: No image URL received.");
    }
  } catch (error) {
    console.error("Error in generateImageWithReplicate:", error);
    const message = error instanceof Error ? error.message : String(error);
     if (message.toLowerCase().includes('failed to fetch')) {
        throw new Error(`Replicate: Network/CORS issue (model ${modelVersionIdWithAuthor}). Original: ${message}`);
    }
    throw new Error(`Replicate generation failed (model ${modelVersionIdWithAuthor}): ${message}`);
  }
};

const generateImageWithLeonardo = async (
  apiKey: string,
  modelId: string,
  options: GenerationOptions & { width?: number; height?: number } // Expect width/height
): Promise<string> => {
  try {
    const payload: any = {
      prompt: options.prompt,
      modelId: modelId, 
      height: options.height, // Use pre-calculated height
      width: options.width, // Use pre-calculated width
      num_images: 1,
      guidance_scale: options.cfgScale,
      alchemy: options.useAlchemy,
      photoReal: options.usePhotoReal,
      num_inference_steps: options.steps,
    };
    if (options.negativePrompt) payload.negative_prompt = options.negativePrompt;
    if (options.leonardoPresetStyle && LEONARDO_PRESET_STYLES.includes(options.leonardoPresetStyle) && options.leonardoPresetStyle !== "NONE") {
      payload.presetStyle = options.leonardoPresetStyle;
    }
    if (options.seed !== undefined) payload.seed = options.seed;

    if (options.leonardoInitialImageDataUrl && options.leonardoInitStrength !== undefined) {
      console.log("Leonardo.Ai: Preparing for Image-to-Image.");
      const { blob: imageBlob, extension } = dataUrlToBlob(options.leonardoInitialImageDataUrl);
      
      const initImageFormData = new FormData();
      initImageFormData.append('extension', extension);
      initImageFormData.append('image', imageBlob, `init_image.${extension}`);

      const initImageResponse = await fetch("https://cloud.leonardo.ai/api/rest/v1/init-image", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Accept": "application/json" },
        body: initImageFormData,
      });

      const initImageData = await initImageResponse.json();
      if (!initImageResponse.ok || !initImageData.uploadInitImage?.id) {
        throw new Error(`Leonardo.Ai API Error (init-image): ${initImageData?.error || initImageData?.message || initImageResponse.statusText}`);
      }
      payload.init_image_id = initImageData.uploadInitImage.id;
      payload.init_strength = options.leonardoInitStrength;
      console.log(`Leonardo.Ai: Initial image uploaded, ID: ${payload.init_image_id}, Strength: ${payload.init_strength}`);
    }


    const startResponse = await fetch("https://cloud.leonardo.ai/api/rest/v1/generations", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload),
    });

    const startData = await startResponse.json();
    if (!startResponse.ok || !startData.sdGenerationJob?.generationId) {
      throw new Error(`Leonardo.Ai API Error (start, model: ${modelId}): ${startData?.error || startData?.message || startResponse.statusText}`);
    }
    const generationId = startData.sdGenerationJob.generationId;
    let pollAttempts = 0;
    const maxPollAttempts = 45; 
    while (pollAttempts < maxPollAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const pollResponse = await fetch(`https://cloud.leonardo.ai/api/rest/v1/generations/${generationId}`, {
        headers: { "Authorization": `Bearer ${apiKey}`, "Accept": "application/json" }
      });
      const pollData = await pollResponse.json();
      if (!pollResponse.ok) {
           throw new Error(`Leonardo.Ai API Error (polling, model: ${modelId}): ${pollData?.error || pollData?.message || pollResponse.statusText}`);
      }
      const generation = pollData.generations_by_pk;
      if (generation && generation.status === 'COMPLETE') {
        if (generation.generated_images && generation.generated_images.length > 0 && generation.generated_images[0].url) {
          return generation.generated_images[0].url;
        } else {
          console.error("Leonardo.Ai generation complete but no image URL:", generation);
          throw new Error('Leonardo.Ai: Generation complete but no image URL.');
        }
      } else if (generation && generation.status === 'FAILED') {
        console.error("Leonardo.Ai generation failed:", generation);
        throw new Error(`Leonardo.Ai generation failed (model: ${modelId}).`);
      }
      pollAttempts++;
    }
    throw new Error(`Leonardo.Ai: Generation timed out (model: ${modelId}).`);
  } catch (error) {
    console.error("Error in generateImageWithLeonardo:", error);
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes('failed to fetch')) {
        throw new Error(`Leonardo.Ai: Network/CORS issue (model ${modelId}). Original: ${message}`);
    }
    throw new Error(`Leonardo.Ai generation failed (model: ${modelId}): ${message}`);
  }
};


export const generateImageFromProvider = async (
  providerId: ImageProviderId,
  modelId: string,
  apiKey: string | undefined, 
  options: GenerationOptions & { width?: number; height?: number } // Expect options to include pre-calculated width/height
): Promise<string> => {
  switch (providerId) {
    case 'gemini':
      return generateImageWithGemini(modelId, options);
    case 'fal_ai':
      // Fal.ai real-time generation is handled directly by the useImageGeneration hook
      // This path should ideally not be reached if the logic in useImageGeneration is correct.
      throw new Error("Fal.ai real-time generation is handled by the useImageGeneration hook. This service function path should not be reached for Fal.ai.");
    case 'black_forest':
      if (!apiKey || apiKey.trim() === "") throw new Error("Black Forest Labs API Key is required.");
      return generateImageWithBlackForest(apiKey, modelId, options);
    case 'stability_ai':
      if (!apiKey || apiKey.trim() === "") throw new Error("Stability AI API Key is required.");
      return generateImageWithStability(apiKey, modelId, options);
    case 'replicate':
      if (!apiKey || apiKey.trim() === "") throw new Error("Replicate API Key is required.");
      return generateImageWithReplicate(apiKey, modelId, options);
    case 'leonardo_ai':
      if (!apiKey || apiKey.trim() === "") throw new Error("Leonardo.Ai API Key is required.");
      return generateImageWithLeonardo(apiKey, modelId, options);
    case 'clipdrop':
      throw new Error(`Clipdrop provider (model: ${modelId}) is not supported for general image generation in this service. It is used for specific editing tasks like upscaling.`);
    default:
      // This ensures that if a new ImageProviderId is added, TypeScript will complain if it's not handled here.
      const _exhaustiveCheck: never = providerId;
      console.error(`Unsupported image provider: ${_exhaustiveCheck}`);
      throw new Error(`Image generation for provider '${_exhaustiveCheck}' is not supported.`);
  }
};
