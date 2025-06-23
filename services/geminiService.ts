

import { GoogleGenAI, GenerateContentResponse, GenerateContentConfig, Chat, Tool, Part } from "@google/genai";
import { ThemeAndPromptResponse, GroundingSource, ChatConfig, GeminiTool as AppGeminiTool } from '../types'; 

// This service file now focuses on Gemini TEXT model interactions.
// The primary `ai` instance for Gemini (using process.env.API_KEY) is used here.

const ai: GoogleGenAI | null = process.env.API_KEY
  ? new GoogleGenAI({ apiKey: process.env.API_KEY })
  : null;

if (!process.env.API_KEY) {
  console.warn(
    "API_KEY environment variable not set. Gemini text model features will be disabled or fail if 'ai' client is not initialized."
  );
}

const TEXT_MODEL_NAME = "gemini-2.5-flash-preview-04-17";
const MULTIMODAL_MODEL_NAME = "gemini-2.5-flash-preview-04-17"; 
const CHAT_MODEL_NAME = "gemini-2.5-flash-preview-04-17";

export const generateThemeAndPrompt = async (
  currentConcept: string, 
  artStyle?: string,
  enableSearchGrounding?: boolean
): Promise<ThemeAndPromptResponse> => {
  if (!ai) {
    throw new Error("Gemini AI client (for text generation) is not initialized. API_KEY environment variable might be missing.");
  }

  let artStyleInstruction = "";
  if (artStyle && artStyle !== "Default (AI Decides)") {
    artStyleInstruction = ` Ensure the generated image prompt strongly reflects an art style of: "${artStyle}".`;
  }

  const prompt = `
You are an AI assistant for an "Etherscape" like visual experience.
Current theme: "${currentConcept}"
${artStyleInstruction ? `Requested Art Style: "${artStyle}"\n` : ''}
Task:
1. Generate a highly descriptive and artistic prompt (max 70 words) for an AI image generator (like Imagen 3) based on the current theme. Focus on abstract, surreal, and dreamlike visuals, colors, textures, and moods.${artStyleInstruction}
2. Suggest a new, **different**, and subtly evolved theme (max 10 words) for the next iteration. This new theme **must not be the same** as the current theme ("${currentConcept}"). It should build upon or smoothly transition from the current theme.

Return your response strictly as a JSON object with two keys: "imagePrompt" and "nextTheme".
Example for current theme "Cosmic jellyfish ballet"${artStyleInstruction ? ` and art style "${artStyle}"` : ''}:
{
  "imagePrompt": "Bioluminescent jellyfish with trailing nebulae for tentacles drift through a void of swirling galaxies, rendered in a [${artStyle || 'chosen by AI'}] style. Colors are deep blues, purples, and vibrant pinks. Ethereal, flowing, and majestic.",
  "nextTheme": "Celestial aquatic gardens" 
}
Example for current theme "Ephemeral sand castles"${artStyleInstruction ? ` and art style "${artStyle}"` : ''}:
{
  "imagePrompt": "Intricate sand castles slowly dissolving into swirling golden particles under a twilight sky, in the style of [${artStyle || 'chosen by AI'}]. A sense of fleeting beauty and impermanence. Colors are warm oranges, soft purples, and dusty yellows.",
  "nextTheme": "Whispers of forgotten dunes"
}
`;

  const modelConfig: GenerateContentConfig = {};
  if (enableSearchGrounding) {
    modelConfig.tools = [{googleSearch: {}}];
  } else {
    modelConfig.responseMimeType = "application/json";
  }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: TEXT_MODEL_NAME,
      contents: prompt,
      config: modelConfig
    });
    
    let jsonStr = response.text.trim();
    const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }

    const parsedData = JSON.parse(jsonStr);
    let themeAndPromptResponse: ThemeAndPromptResponse;

    if (typeof parsedData.imagePrompt === 'string' && typeof parsedData.nextTheme === 'string') {
        if (parsedData.nextTheme.trim() === "") {
            throw new Error("Received an empty nextTheme from the AI.");
        }
        themeAndPromptResponse = {
            imagePrompt: parsedData.imagePrompt,
            nextTheme: parsedData.nextTheme,
        };
    } else {
        throw new Error("Invalid JSON structure received from theme/prompt generation. Expected 'imagePrompt' and 'nextTheme' strings.");
    }

    if (enableSearchGrounding && response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      const rawChunks = response.candidates[0].groundingMetadata.groundingChunks;
      themeAndPromptResponse.groundingSources = rawChunks
        .filter(chunk => chunk.web && chunk.web.uri && chunk.web.title)
        .map(chunk => ({
          web: {
            uri: chunk.web!.uri!, 
            title: chunk.web!.title!, 
          }
        })) as GroundingSource[];
    }
    return themeAndPromptResponse;
  } catch (error) {
    console.error("Error generating theme and prompt:", error);
    const conceptForLog = currentConcept.length > 50 ? currentConcept.substring(0, 47) + "..." : currentConcept;
    console.error(`Error occurred while processing concept: "${conceptForLog}" with art style: "${artStyle}" (Grounding: ${enableSearchGrounding})`);
    throw new Error(`Failed to generate theme and prompt: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const remixConcept = async (baseConcept: string): Promise<string[]> => {
  if (!ai) {
    throw new Error("Gemini AI client (for text generation) is not initialized. API_KEY environment variable might be missing.");
  }
  const prompt = `
You are an AI assistant. The user provides a 'base concept': "${baseConcept}".
Your task is to generate 3 to 5 new and distinct creative variations or evolutionary ideas based on this base concept. These variations should be suitable as starting points for generating abstract, dream-like images. Each variation should be a short phrase (max 10 words).
Return your response strictly as a JSON array of strings.
Example for base concept "Cosmic jellyfish ballet":
["Celestial aquatic gardens", "Nebula-woven sea creatures", "Galactic ocean currents", "Stardust ballet formations", "Deep-space invertebrate dance"]
Example for base concept "Ephemeral sand castles":
["Whispers of forgotten dunes", "Desert mirages taking form", "Chronosand structures", "Temporary monuments of grit", "Golden particle architecture"]
`;
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: TEXT_MODEL_NAME,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    let jsonStr = response.text.trim();
    const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    const parsedData = JSON.parse(jsonStr);
    if (Array.isArray(parsedData) && parsedData.every(item => typeof item === 'string')) {
      if (parsedData.length === 0) {
        return [`Evolved: ${baseConcept} I`, `Evolved: ${baseConcept} II`]; 
      }
      return parsedData as string[];
    } else {
      console.error("Invalid JSON structure for remixed concepts. Expected array of strings. Received:", parsedData);
      throw new Error("Invalid JSON structure received from concept remixing. Expected an array of strings.");
    }
  } catch (error) {
    console.error("Error remixing concept:", error);
    const conceptForLog = baseConcept.length > 50 ? baseConcept.substring(0, 47) + "..." : baseConcept;
    console.error(`Error occurred while remixing concept: "${conceptForLog}"`);
    return [`${baseConcept} - variation 1`, `${baseConcept} - variation 2`, `${baseConcept} - variation 3`];
  }
};

export const enhancePrompt = async (currentPrompt: string): Promise<string> => {
  if (!ai) {
    throw new Error("Gemini AI client (for text generation) is not initialized. API_KEY environment variable might be missing.");
  }
  const systemInstruction = `You are a creative assistant that enhances user prompts for an AI image generator.
Rephrase the given prompt to be more descriptive, evocative, and artistic.
Focus on incorporating vivid details about potential lighting, composition, colors, textures, and mood.
Maintain the core idea of the original prompt.
Return ONLY the enhanced prompt string, without any other text, labels, or quotation marks.`;
  const userMessage = `Original prompt: "${currentPrompt}"`;
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: TEXT_MODEL_NAME,
      contents: userMessage,
      config: {
        systemInstruction: systemInstruction,
      }
    });
    const enhanced = response.text.trim();
    if (!enhanced) {
      throw new Error("AI returned an empty enhanced prompt.");
    }
    return enhanced;
  } catch (error) {
    console.error("Error enhancing prompt:", error);
    const promptForLog = currentPrompt.length > 50 ? currentPrompt.substring(0, 47) + "..." : currentPrompt;
    console.error(`Error occurred while enhancing prompt: "${promptForLog}"`);
    return `${currentPrompt} (enhancement failed)`; 
  }
};

export const generateTextFromImageAndPrompt = async (
  base64ImageData: string,
  mimeType: 'image/jpeg' | 'image/png', 
  userConcept: string
): Promise<string> => {
  if (!ai) {
    throw new Error("Gemini AI client is not initialized. API_KEY environment variable might be missing.");
  }
  const imagePart = {
    inlineData: {
      mimeType: mimeType,
      data: base64ImageData,
    },
  };
  const textPrompt = `You are an AI assistant for a creative visual experience called Etherscape.
Analyze the provided image.
Then, considering the Etherscape theme of "${userConcept}", generate a short, insightful, or poetic text response (1-3 sentences, max 40 words) that creatively connects the visual elements of the image to this abstract theme.
If the image content is entirely unrelated or very mundane (e.g., a simple object with no artistic merit), you can acknowledge that briefly and then offer a more general poetic reflection on the theme itself.
Focus on evoking a sense of wonder, dreaminess, or abstraction.`;
  const textPart = {
    text: textPrompt,
  };
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: MULTIMODAL_MODEL_NAME,
      contents: { parts: [imagePart, textPart] },
    });
    const textOutput = response.text.trim();
    if (!textOutput) {
      throw new Error("AI returned an empty response for the live query.");
    }
    return textOutput;
  } catch (error) {
    console.error("Error generating text from image and prompt:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to generate text from image for live query: ${errorMessage}`);
  }
};

// Chat feature functions
export const createChatSession = async (systemInstruction: string, chatConfig?: ChatConfig): Promise<Chat> => {
  if (!ai) {
    throw new Error("Gemini AI client (for chat) is not initialized. API_KEY environment variable might be missing.");
  }
  try {
    const sessionConfig: GenerateContentConfig = {
      systemInstruction: systemInstruction,
      ...(chatConfig?.temperature !== undefined && { temperature: chatConfig.temperature }),
      ...(chatConfig?.topK !== undefined && { topK: chatConfig.topK }),
      ...(chatConfig?.topP !== undefined && { topP: chatConfig.topP }),
      ...(chatConfig?.maxOutputTokens !== undefined && { maxOutputTokens: chatConfig.maxOutputTokens }),
      ...(chatConfig?.seed !== undefined && { seed: chatConfig.seed }),
      ...(chatConfig?.stopSequences && chatConfig.stopSequences.length > 0 && { stopSequences: chatConfig.stopSequences }),
    };

    const chat: Chat = ai.chats.create({
      model: CHAT_MODEL_NAME, 
      config: sessionConfig,
    });
    return chat;
  } catch (error) {
    console.error("Error creating chat session:", error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create chat session: ${message}`);
  }
};

export const sendMessageToChat = async (
  chat: Chat,
  messageContent: string | Part[], 
  tools?: AppGeminiTool[] 
): Promise<GenerateContentResponse> => {
  if (!ai) {
    throw new Error("Gemini AI client (for chat) is not initialized.");
  }
  try {
    const sdkTools: Tool[] | undefined = tools as Tool[] | undefined;

    const response: GenerateContentResponse = await chat.sendMessage({
        message: messageContent, 
        ...(sdkTools && { tools: sdkTools }) 
    });
    return response;
  } catch (error) {
    console.error("Error sending message to chat:", error);
    const errMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to send message to chat: ${errMessage}`);
  }
};