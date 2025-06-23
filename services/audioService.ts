
// services/audioService.ts

const FAL_AI_AUDIOGEN_ENDPOINT = "https://fal.run/fal-ai/audiogen"; // Example placeholder

/**
 * Generates a soundscape using Fal.ai AudioGen (or similar).
 * @param authToken Fal.ai authentication token.
 * @param prompt The text prompt to generate audio from.
 * @param durationSeconds Optional duration of the audio in seconds.
 * @returns A promise that resolves to the URL of the generated audio file.
 */
export const generateSoundscapeWithFal = async (
  authToken: string,
  prompt: string,
  durationSeconds: number = 10 // Default duration
): Promise<string> => {
  const payload = { 
    prompt: prompt,
    duration: durationSeconds, 
    // model_id: "facebook/audiogen-medium" // Example, if Fal needs/supports model choice in payload
  };

  console.log("AudioService: generateSoundscapeWithFal calling actual fetch", {
    prompt,
    durationSeconds,
    endpoint: FAL_AI_AUDIOGEN_ENDPOINT
  });

  const response = await fetch(FAL_AI_AUDIOGEN_ENDPOINT, { 
    method: 'POST',
    headers: {
      'Authorization': `Key ${authToken}`, // Fal.ai typically uses "Key <token>"
      'Content-Type': 'application/json', 
      'Accept': 'application/json' 
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => `Fal.ai AudioGen request failed with status ${response.status}`);
    let errorData;
    try {
        errorData = JSON.parse(errorText);
    } catch (e) {
        errorData = { message: errorText };
    }
    console.error("Fal.ai AudioGen Error:", errorData);
    throw new Error(errorData.message || errorData.detail || `Fal.ai AudioGen request failed with status ${response.status}`);
  }

  const result = await response.json(); 
  // Fal AudioGen response might be { "audio_url": "..." } or { "audio": { "url": "..." } }
  if (!result || !(result.audio_url || (result.audio && result.audio.url))) { 
    console.error("Fal.ai AudioGen Invalid Response:", result);
    throw new Error("Fal.ai AudioGen did not return a valid audio URL.");
  }
  return result.audio_url || result.audio.url;
};
