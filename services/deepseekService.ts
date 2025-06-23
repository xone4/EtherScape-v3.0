
import { ChatConfig } from '../types';

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

interface DeepSeekMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface DeepSeekResponseChoice {
  index: number;
  message: DeepSeekMessage;
  finish_reason: string;
}

interface DeepSeekResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: DeepSeekResponseChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export const sendMessageToDeepSeek = async (
  apiKey: string,
  messages: DeepSeekMessage[],
  model: string = "deepseek-chat", // Default model, can be overridden
  config?: ChatConfig 
): Promise<string> => {
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("DeepSeek API Key is required.");
  }

  const payload: any = {
    messages: messages,
    model: model,
    stream: false, // Not implementing streaming for DeepSeek in this iteration
  };

  if (config) {
    if (config.temperature !== undefined) payload.temperature = config.temperature;
    if (config.topP !== undefined) payload.top_p = config.topP; // DeepSeek uses top_p
    if (config.maxOutputTokens !== undefined) payload.max_tokens = config.maxOutputTokens;
    if (config.seed !== undefined) payload.seed = config.seed;
    // DeepSeek specific or other common params can be added here if needed
    // payload.frequency_penalty
    // payload.presence_penalty
    // payload.stop // equivalent to stopSequences
  }

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
      const errorMessage = errorData?.error?.message || `DeepSeek API Error: ${response.status}`;
      console.error("DeepSeek API Error:", errorData);
      throw new Error(errorMessage);
    }

    const responseData: DeepSeekResponse = await response.json();

    if (responseData.choices && responseData.choices.length > 0 && responseData.choices[0].message?.content) {
      return responseData.choices[0].message.content.trim();
    } else {
      console.error("DeepSeek response missing expected content:", responseData);
      throw new Error("DeepSeek API returned an unexpected response structure.");
    }
  } catch (error) {
    console.error("Error sending message to DeepSeek:", error);
    const message = error instanceof Error ? error.message : "Unknown error contacting DeepSeek API.";
    if (message.toLowerCase().includes('failed to fetch')) {
        throw new Error(`DeepSeek: Network error or CORS issue. Original: ${message}`);
    }
    throw new Error(message);
  }
};
