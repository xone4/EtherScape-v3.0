import { UserApiKeys } from '../types';
import { REPLICATE_UPSCALER_MODEL_ID, REPLICATE_UPSCALER_VERSION_ID } from '../constants';

// Upscale image using Replicate (e.g., Real-ESRGAN model)
export const upscaleImageWithReplicate = async (
  imageUrl: string,
  scaleFactor: 2 | 4,
  apiKey: string,
): Promise<string> => {
  try {
    if (!apiKey || apiKey.trim() === "") {
      throw new Error("Replicate API Key is required for upscaling.");
    }

    const startResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: REPLICATE_UPSCALER_VERSION_ID,
        input: {
          image: imageUrl,
          scale: scaleFactor,
        },
      }),
    });

    let prediction = await startResponse.json();
    if (startResponse.status !== 201) {
      throw new Error(`Replicate Upscale API Error (start): ${prediction.detail || startResponse.statusText}`);
    }

    const predictionUrl = prediction.urls.get;
    let pollAttempts = 0;
    const maxPollAttempts = 45; 

    while (prediction.status !== "succeeded" && prediction.status !== "failed") {
      pollAttempts++;
      if (pollAttempts > maxPollAttempts) {
        throw new Error("Replicate upscaling prediction timed out.");
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
      const pollResponse = await fetch(predictionUrl, {
        headers: { "Authorization": `Token ${apiKey}`, "Content-Type": "application/json" }
      });
      prediction = await pollResponse.json();
      if (!pollResponse.ok) {
          throw new Error(`Replicate Upscale API Error (polling): ${prediction.detail || pollResponse.statusText}`);
      }
    }

    if (prediction.status === "failed") {
      throw new Error(`Replicate upscaling failed: ${prediction.error || 'Unknown error'}`);
    }

    if (prediction.output && typeof prediction.output === 'string') {
      return prediction.output; 
    } else if (Array.isArray(prediction.output) && prediction.output.length > 0 && typeof prediction.output[0] === 'string') {
      return prediction.output[0];
    } else {
      console.error("Replicate upscale response missing output URL:", prediction);
      throw new Error("Replicate Upscaler: No image URL received in the final output.");
    }
  } catch (error) {
    console.error("Error in upscaleImageWithReplicate:", error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Replicate upscaling failed: ${message}`);
  }
};

// Upscale image using Clipdrop
export const upscaleWithClipdrop = async (imageUrl: string, apiKey: string): Promise<string> => {
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("Clipdrop API Key is required for upscaling.");
  }

  const formData = new FormData();
  try {
    const imageBlob = await fetch(imageUrl).then(res => {
      if (!res.ok) throw new Error(`Failed to fetch image for Clipdrop upscale: ${res.status} ${res.statusText}`);
      return res.blob();
    });
    formData.append('image_file', imageBlob);
  } catch (fetchError) {
    console.error("Error fetching image to prepare for Clipdrop upload:", fetchError);
    const message = fetchError instanceof Error ? fetchError.message : String(fetchError);
    throw new Error(`Failed to fetch source image for Clipdrop: ${message}`);
  }
  
  try {
    const response = await fetch("https://clipdrop-api.co/image-upscaling/v1/upscale", {
      method: 'POST',
      headers: { 'x-api-key': apiKey },
      body: formData,
    });

    if (!response.ok) {
      let errorBody = "Unknown error";
      try {
        errorBody = await response.text(); 
      } catch (e) { /* ignore if text() fails */ }
      throw new Error(`Clipdrop API Error: ${response.status} ${response.statusText}. Details: ${errorBody}`);
    }

    const resultBlob = await response.blob();
    if (!resultBlob || resultBlob.size === 0) {
        throw new Error("Clipdrop API returned an empty blob for upscaled image.");
    }
    if (!resultBlob.type.startsWith('image/')) {
        // Attempt to read as text to see if it's an error message
        const errorText = await resultBlob.text().catch(() => "Received non-image blob from Clipdrop.");
        throw new Error(`Clipdrop API returned non-image data: ${errorText.substring(0,100)}...`);
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(new Error(`FileReader error for Clipdrop result: ${error}`));
      reader.readAsDataURL(resultBlob);
    });
  } catch (error) {
    console.error("Error during Clipdrop upscale request or processing:", error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Clipdrop upscaling failed: ${message}`);
  }
};

// Inpaint image using Clipdrop
export const inpaintWithClipdrop = async (
  apiKey: string,
  imageFile: File,
  maskFile: File,
  prompt: string
): Promise<string> => {
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("Clipdrop API Key is required for inpainting.");
  }

  const formData = new FormData();
  formData.append('image_file', imageFile);
  formData.append('mask_file', maskFile);
  formData.append('prompt', prompt);

  try {
    const response = await fetch("https://clipdrop-api.co/v1/inpainting", {
      method: 'POST',
      headers: { 'x-api-key': apiKey },
      body: formData,
    });

    if (!response.ok) {
      let errorBody = "Unknown error";
      try {
        // Try to parse as JSON first, as Clipdrop errors are often JSON
        const errorJson = await response.json();
        errorBody = errorJson.error || JSON.stringify(errorJson);
      } catch (e) {
        // Fallback to text if JSON parsing fails
        errorBody = await response.text().catch(() => `Clipdrop Inpainting API Error: ${response.status} ${response.statusText}`);
      }
      throw new Error(`Clipdrop Inpainting API Error: ${response.status} ${response.statusText}. Details: ${errorBody}`);
    }

    const resultBlob = await response.blob();
    if (!resultBlob || resultBlob.size === 0) {
        throw new Error("Clipdrop API returned an empty blob for inpainted image.");
    }
    if (!resultBlob.type.startsWith('image/')) {
        const errorText = await resultBlob.text().catch(() => "Received non-image blob from Clipdrop Inpainting.");
        throw new Error(`Clipdrop Inpainting API returned non-image data: ${errorText.substring(0,100)}...`);
    }
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(new Error(`FileReader error for Clipdrop Inpainting result: ${error}`));
      reader.readAsDataURL(resultBlob);
    });
  } catch (error) {
    console.error("Error during Clipdrop inpainting request or processing:", error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Clipdrop inpainting failed: ${message}`);
  }
};
