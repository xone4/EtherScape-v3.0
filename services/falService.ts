
// services/falService.ts

// Using placeholder URLs as actual Fal.ai direct model URLs can vary or require specific /run endpoints.
// The key is the structure: FormData for file uploads, Authorization header.
const FAL_AI_IP_ADAPTER_ENDPOINT = "https://fal.run/fal-ai/ip-adapter"; // Example placeholder
const FAL_AI_CONTROLNET_ENDPOINT_BASE = "https://fal.run/fal-ai/controlnet"; // Example placeholder
const FAL_AI_LLAVA_ENDPOINT = "https://fal.run/fal-ai/llava-next"; // Example placeholder
const FAL_AI_SVD_ENDPOINT = "https://fal.run/fal-ai/stable-video-diffusion"; // Example placeholder


/**
 * Applies Style Transfer using IP-Adapter via Fal.ai.
 */
export const applyIPAdapter = async (
  authToken: string,
  baseImage: File,
  styleImage: File,
  ipAdapterScale: number
): Promise<string> => {
  const formData = new FormData();
  formData.append('image_file', baseImage); 
  formData.append('style_image_file', styleImage);
  formData.append('ip_adapter_scale', ipAdapterScale.toString());
  // Add other parameters Fal.ai might expect for IP-Adapter, e.g. 'prompt'
  // formData.append('prompt', "A stunning artistic image");


  console.log("FalService: applyIPAdapter calling actual fetch", { 
    baseImageName: baseImage.name, 
    styleImageName: styleImage.name, 
    scale: ipAdapterScale,
    endpoint: FAL_AI_IP_ADAPTER_ENDPOINT
  });

  const response = await fetch(FAL_AI_IP_ADAPTER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${authToken}`, // Fal.ai typically uses "Key <token>"
      'Accept': 'application/json', 
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => `Fal.ai IP-Adapter request failed with status ${response.status}`);
    let errorData;
    try {
        errorData = JSON.parse(errorText);
    } catch (e) {
        errorData = { message: errorText };
    }
    console.error("Fal.ai IP-Adapter Error:", errorData);
    throw new Error(errorData.message || errorData.detail || `Fal.ai IP-Adapter request failed with status ${response.status}`);
  }

  const result = await response.json();
  if (!result || !result.image_url) { // Adjust based on actual Fal.ai response structure for this model
    console.error("Fal.ai IP-Adapter Invalid Response:", result);
    throw new Error("Fal.ai IP-Adapter did not return a valid image URL.");
  }
  return result.image_url;
};

/**
 * Applies Composition Control using ControlNet via Fal.ai.
 */
export const applyControlNet = async (
  authToken: string,
  baseImage: File, 
  controlImage: File,
  controlType: string, 
  controlStrength: number,
  prompt: string 
): Promise<string> => {
  const formData = new FormData();
  formData.append('image_file', baseImage);
  formData.append('control_image_file', controlImage);
  formData.append('controlnet_type', controlType); // Common parameter name
  formData.append('control_strength', controlStrength.toString());
  formData.append('prompt', prompt);
  
  console.log("FalService: applyControlNet calling actual fetch", {
    baseImageName: baseImage.name,
    controlImageName: controlImage.name,
    controlType,
    controlStrength,
    prompt,
    endpoint: `${FAL_AI_CONTROLNET_ENDPOINT_BASE}/${controlType}` // Example construction
  });

  // The endpoint might vary or be a general one with controlType in payload
  const endpoint = `${FAL_AI_CONTROLNET_ENDPOINT_BASE}`; // Using a general base, specific model in payload
  formData.append('model_name', `controlnet-${controlType}`); // Assuming Fal identifies ControlNet models this way

  const response = await fetch(endpoint, { // Or specific endpoint if needed
    method: 'POST',
    headers: {
      'Authorization': `Key ${authToken}`,
      'Accept': 'application/json',
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => `Fal.ai ControlNet request failed with status ${response.status}`);
    let errorData;
    try {
        errorData = JSON.parse(errorText);
    } catch (e) {
        errorData = { message: errorText };
    }
    console.error("Fal.ai ControlNet Error:", errorData);
    throw new Error(errorData.message || errorData.detail || `Fal.ai ControlNet (${controlType}) request failed with status ${response.status}`);
  }

  const result = await response.json();
  if (!result || !result.image_url) { 
    console.error("Fal.ai ControlNet Invalid Response:", result);
    throw new Error("Fal.ai ControlNet did not return a valid image URL.");
  }
  return result.image_url;
};

/**
 * Describes an image using LLaVA via Fal.ai.
 */
export const describeImageWithLlava = async (
  authToken: string,
  image: File
): Promise<string> => {
  const formData = new FormData();
  formData.append('image_file', image);
  // formData.append('prompt', "Describe this image in detail."); // Optional prompt for LLaVA

  console.log("FalService: describeImageWithLlava calling actual fetch", { imageName: image.name, endpoint: FAL_AI_LLAVA_ENDPOINT });

  const response = await fetch(FAL_AI_LLAVA_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${authToken}`,
      'Accept': 'application/json',
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => `Fal.ai LLaVA request failed with status ${response.status}`);
     let errorData;
    try {
        errorData = JSON.parse(errorText);
    } catch (e) {
        errorData = { message: errorText };
    }
    console.error("Fal.ai LLaVA Error:", errorData);
    throw new Error(errorData.message || errorData.detail || `Fal.ai LLaVA request failed with status ${response.status}`);
  }

  const result = await response.json();
  const description = result.text || result.description || result.output?.text; 
  if (typeof description !== 'string') {
    console.error("Fal.ai LLaVA Invalid Response:", result);
    throw new Error("Fal.ai LLaVA did not return a valid text description.");
  }
  return description;
};

/**
 * Generates a video using Stable Video Diffusion (SVD) via Fal.ai.
 */
export const generateVideoWithSVD = async (
  authToken: string,
  imageFile: File,
  seed?: number,
  motionBucketId?: number,
  noiseAugStrength?: number
): Promise<string> => {
  const formData = new FormData();
  formData.append('image_file', imageFile);
  if (seed !== undefined) formData.append('seed', seed.toString());
  if (motionBucketId !== undefined) formData.append('motion_bucket_id', motionBucketId.toString());
  if (noiseAugStrength !== undefined) formData.append('cond_aug', noiseAugStrength.toString());

  console.log("FalService: generateVideoWithSVD calling actual fetch", {
    imageName: imageFile.name, seed, motionBucketId, noiseAugStrength, endpoint: FAL_AI_SVD_ENDPOINT
  });

  const response = await fetch(FAL_AI_SVD_ENDPOINT, { 
    method: 'POST',
    headers: {
      'Authorization': `Key ${authToken}`,
      'Accept': 'application/json'
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => `Fal.ai SVD request failed with status ${response.status}`);
    let errorData;
    try {
        errorData = JSON.parse(errorText);
    } catch (e) {
        errorData = { message: errorText };
    }
    console.error("Fal.ai SVD Error:", errorData);
    throw new Error(errorData.message || errorData.detail || `Fal.ai SVD request failed with status ${response.status}`);
  }

  const result = await response.json(); 
  // Fal SVD response structure might be like { "video_url": "..." } or similar
  if (!result || !(result.video_url || (result.video && result.video.url))) { 
    console.error("Fal.ai SVD Invalid Response:", result);
    throw new Error("Fal.ai SVD did not return a valid video URL.");
  }
  return result.video_url || result.video.url;
};
