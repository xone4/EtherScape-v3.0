
import { useState, useCallback, useRef } from 'react';
import {
  Chat, GenerateContentResponse, Part, FunctionCall as GeminiSDKFunctionCall
} from '@google/genai';
import {
  ChatMessage, ChatProviderId, ChatProviderSetting, UserChatApiKeys, ChatConfig,
  LogEntryType, ImageHistoryItem, ImageProviderId, 
  GeminiTool, GeminiFunctionCallPart
} from '../types';
import { createChatSession, sendMessageToChat as sendMessageToGeminiChat } from '../services/geminiService';
import { sendMessageToDeepSeek } from '../services/deepseekService'; 
import { ART_STYLES, COMMON_ASPECT_RATIOS, DEFAULT_CHAT_SYSTEM_PROMPT_BASE } from '../constants';

interface AppFunctionCallHandlers {
  onUpdateArtStyle: (newStyle: string) => void;
  onUpdateNegativePrompt: (negativePromptText: string) => void;
  onUpdateTheme: (newTheme: string) => void;
  onSetSeed: (seedValue?: number) => void;
  onSetCfgScale: (cfgScaleValue: number) => void;
  onSetAspectRatio: (newAspectRatio: string) => void;
  onSelectRandomConcept: () => void;
  onGenerateImageNow: () => void;
}

interface UseChatProps {
  appCurrentConcept: string;
  appCurrentArtStyle: string;
  appImageHistory: ImageHistoryItem[];
  appSelectedImageProviderId: ImageProviderId; 
  appSelectedImageModelId: string;    

  chatSelectedProviderId: ChatProviderId;
  chatSelectedModelId: string;
  chatProvidersConfig: ChatProviderSetting[];
  chatUserChatApiKeys: UserChatApiKeys;
  chatCurrentSystemPromptBase: string;
  chatCurrentConfig: ChatConfig;

  showToast: (message: string, duration?: number) => void;
  logAppEvent: (type: LogEntryType, message: string, details?: any) => void;
  functionCallHandlers: AppFunctionCallHandlers;
}

interface ProviderMessage { // Generic structure for non-Gemini providers
  role: "user" | "assistant" | "system";
  content: string;
}

export const useChat = ({
  appCurrentConcept, appCurrentArtStyle, appImageHistory, appSelectedImageProviderId, appSelectedImageModelId,
  chatSelectedProviderId, chatSelectedModelId, chatProvidersConfig, chatUserChatApiKeys,
  chatCurrentSystemPromptBase, chatCurrentConfig,
  showToast, logAppEvent,
  functionCallHandlers
}: UseChatProps) => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentChatSession, setCurrentChatSession] = useState<Chat | null>(null); 
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [chatContextCache, setChatContextCache] = useState<{
    concept: string; artStyle: string; imageContextKey: string; chatSettingsKey: string; providerId: ChatProviderId;
  } | null>(null);

  const buildSystemInstruction = useCallback((forNonGemini: boolean = false) => {
    const lastHistoryItem = appImageHistory[0];
    let dynamicContext = "No specific image context available yet. Help the user get started!";
    if (lastHistoryItem) {
      dynamicContext = `The user's last generated image details are:\n- Concept: "${lastHistoryItem.concept}"\n- Art Style: "${lastHistoryItem.artStyle || 'Default'}"\n- Prompt: "${lastHistoryItem.prompt.substring(0, 70)}..."\n- Image Provider: ${lastHistoryItem.provider || 'N/A'} (Model: ${lastHistoryItem.modelDisplayName || 'N/A'})`;
      if (lastHistoryItem.negativePrompt) dynamicContext += `\n- Negative Prompt: ${lastHistoryItem.negativePrompt}`;
      if (lastHistoryItem.cfgScale !== undefined) dynamicContext += `\n- CFG Scale: ${lastHistoryItem.cfgScale}`;
      if (lastHistoryItem.steps !== undefined) dynamicContext += `\n- Steps: ${lastHistoryItem.steps}`;
      if (lastHistoryItem.seed !== undefined) dynamicContext += `\n- Seed: ${lastHistoryItem.seed}`;
    }
    let systemInstruction = (chatCurrentSystemPromptBase || DEFAULT_CHAT_SYSTEM_PROMPT_BASE).trim();
    systemInstruction += `\n\nKey Context for this conversation:\n${dynamicContext}`;
    
    if (forNonGemini) { // Non-Gemini providers might not support rich function calling like Gemini
        systemInstruction += "\n\nNote: You are a helpful assistant. Advanced image manipulation functions are managed by the Gemini Co-pilot. Focus on creative brainstorming and suggestions for theme, art style, and prompt details.";
    }
    return systemInstruction;
  }, [appImageHistory, chatCurrentSystemPromptBase, appCurrentConcept, appCurrentArtStyle, appSelectedImageProviderId, appSelectedImageModelId]);


  const initializeChatSession = useCallback(async (isDrawerOpening: boolean) => {
    if (!isDrawerOpening) return;

    const currentProviderConfig = chatProvidersConfig.find(p => p.id === chatSelectedProviderId);
    const currentImageContextKey = `${appSelectedImageProviderId}-${appSelectedImageModelId}-${appCurrentConcept}-${appCurrentArtStyle}`; // More specific context
    const currentChatSettingsKey = `${chatSelectedProviderId}-${chatSelectedModelId}-${chatCurrentSystemPromptBase}-${JSON.stringify(chatCurrentConfig)}`;

    const contextChanged = !chatContextCache ||
                           chatContextCache.imageContextKey !== currentImageContextKey || // Simplified context check
                           chatContextCache.chatSettingsKey !== currentChatSettingsKey ||
                           chatContextCache.providerId !== chatSelectedProviderId;
    
    const needsGeminiReinitialization = !currentChatSession && chatSelectedProviderId === 'gemini';

    if (contextChanged || needsGeminiReinitialization) {
      setIsChatLoading(true);
      setChatMessages([]);
      setCurrentChatSession(null); 

      if (currentProviderConfig?.requiresApiKey && (!chatUserChatApiKeys[chatSelectedProviderId] || chatUserChatApiKeys[chatSelectedProviderId]?.trim() === '')) {
        const errorMsg = `API Key for ${currentProviderConfig.displayName} is required. Please set it in Advanced Settings.`;
        showToast(errorMsg, 5000);
        logAppEvent('ERROR', `Chat initialization failed: API key missing for ${chatSelectedProviderId}.`);
        setChatMessages([{ id: `system-error-apikey-${Date.now()}`, role: 'system', text: errorMsg, timestamp: new Date().toISOString() }]);
        setIsChatLoading(false);
        return;
      }

      if (currentProviderConfig?.isPlaceholder) {
        const errorMsg = `Chat with ${currentProviderConfig.displayName} is a placeholder and not yet implemented.`;
        showToast(errorMsg, 4000);
        logAppEvent('WARNING', `Attempted to initialize chat with placeholder provider: ${chatSelectedProviderId}.`);
        setChatMessages([{ id: `system-error-placeholder-${Date.now()}`, role: 'system', text: errorMsg, timestamp: new Date().toISOString() }]);
        setIsChatLoading(false);
        return;
      }
      
      setChatContextCache({
        concept: appCurrentConcept, artStyle: appCurrentArtStyle, // Storing these for simpler check, imageContextKey is more robust
        imageContextKey: currentImageContextKey, 
        chatSettingsKey: currentChatSettingsKey,
        providerId: chatSelectedProviderId
      });

      let greetingMessageText = `Hello! I'm your Etherscapes Co-pilot (using ${currentProviderConfig?.displayName || chatSelectedProviderId}). How can I help you?`;

      if (chatSelectedProviderId === 'gemini') {
        const systemInstruction = buildSystemInstruction(false); // False for Gemini (supports functions)
        try {
          const chatSession = await createChatSession(systemInstruction, chatCurrentConfig);
          setCurrentChatSession(chatSession);
          logAppEvent('CHAT', 'Gemini chat session initialized/re-initialized.', { systemPromptBaseLength: chatCurrentSystemPromptBase.length, config: chatCurrentConfig });
        } catch (err: any) {
          const errorMessage = err.message || `Failed to initialize chat with ${chatSelectedProviderId}.`;
          showToast(`Chat Error: ${errorMessage}`, 5000);
          setChatMessages([{ id: `error-${Date.now()}`, role: 'system', text: `Error: ${errorMessage}`, timestamp: new Date().toISOString() }]);
          logAppEvent('ERROR', 'Failed to initialize Gemini chat session.', { error: errorMessage });
          setIsChatLoading(false); return;
        }
      } else { // For DeepSeek and future non-Gemini providers
        logAppEvent('CHAT', `${currentProviderConfig?.displayName || chatSelectedProviderId} chat initialized. System prompt handled by API service or first message.`, { config: chatCurrentConfig });
        // No explicit session object like Gemini's `Chat` for others, handled by service calls.
      }
      
      const greetingMessage: ChatMessage = {
        id: `system-greeting-${Date.now()}`, role: 'system', text: greetingMessageText, timestamp: new Date().toISOString(),
      };
      setChatMessages([greetingMessage]);
      setIsChatLoading(false);

    } else if (chatMessages.length === 0 && currentProviderConfig) { 
      const welcomeBackText = `Welcome back to your ${currentProviderConfig.displayName} Co-pilot!`;
      setChatMessages([{id: `system-reopen-${Date.now()}`, role: 'system', text: welcomeBackText, timestamp: new Date().toISOString()}]);
    }
  }, [
    appCurrentConcept, appCurrentArtStyle, appImageHistory, appSelectedImageProviderId, appSelectedImageModelId,
    chatSelectedProviderId, chatSelectedModelId, chatProvidersConfig, chatUserChatApiKeys,
    chatCurrentSystemPromptBase, chatCurrentConfig, buildSystemInstruction,
    currentChatSession, chatContextCache, chatMessages.length,
    showToast, logAppEvent
  ]);

  const sendChatMessage = useCallback(async (userMessageText: string) => {
    if (!userMessageText.trim() || isChatLoading) return;

    const currentProviderConfig = chatProvidersConfig.find(p => p.id === chatSelectedProviderId);
    if (!currentProviderConfig || currentProviderConfig.isPlaceholder) {
        showToast(`Chat provider ${currentProviderConfig?.displayName || chatSelectedProviderId} is not available.`, 4000);
        return;
    }
    if (currentProviderConfig.requiresApiKey && (!chatUserChatApiKeys[chatSelectedProviderId] || chatUserChatApiKeys[chatSelectedProviderId]?.trim() === '')) {
        showToast(`API Key for ${currentProviderConfig.displayName} is missing.`, 4000);
        return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`, role: 'user', text: userMessageText.trim(), timestamp: new Date().toISOString(),
    };
    setChatMessages(prev => [...prev, userMessage]);
    setIsChatLoading(true);
    logAppEvent('CHAT', 'User sent chat message.', { provider: chatSelectedProviderId, messageLength: userMessageText.length });

    try {
      let aiResponseText: string | null = null;
      let functionCallData: GeminiFunctionCallPart['functionCall'] | undefined;
      let functionExecutionResult: any;

      switch (chatSelectedProviderId) {
        case 'gemini':
          if (!currentChatSession) throw new Error("Gemini chat session not initialized.");
          const tools: GeminiTool[] = [{
            functionDeclarations: [
              { name: "updateArtStyle", description: "Sets the art style for the next image generation.", parameters: { type: "OBJECT", properties: { newStyle: { type: "STRING", description: `The desired art style. Available styles are: ${ART_STYLES.flatMap(c => c.styles).join(', ')}` } }, required: ["newStyle"] } },
              { name: "updateNegativePrompt", description: "Sets or updates the negative prompt.", parameters: { type: "OBJECT", properties: { negativePromptText: { type: "STRING", description: "Text describing what to avoid." } }, required: ["negativePromptText"] } },
              { name: "updateTheme", description: "Changes the main theme or concept.", parameters: { type: "OBJECT", properties: { newTheme: { type: "STRING", description: "The new theme text." } }, required: ["newTheme"] } },
              { name: "setSeed", description: "Sets the image generation seed.", parameters: { type: "OBJECT", properties: { seedValue: { type: "NUMBER", description: "Seed value (positive integer). 0 or empty for random." } } } }, // Made seedValue not required by Gemini
              { name: "setCfgScale", description: "Sets CFG scale.", parameters: { type: "OBJECT", properties: { cfgScaleValue: { type: "NUMBER", description: "CFG scale (1.0-20.0)." } }, required: ["cfgScaleValue"] } },
              { name: "setAspectRatio", description: `Sets image aspect ratio. Common: ${COMMON_ASPECT_RATIOS.join(', ')}.`, parameters: { type: "OBJECT", properties: { newAspectRatio: { type: "STRING", description: "Aspect ratio (e.g., '16:9')." } }, required: ["newAspectRatio"] } },
              { name: "selectRandomConcept", description: "Selects a random concept and art style, resets advanced settings.", parameters: { type: "OBJECT", properties: {} } },
              { name: "generateImageNow", description: "Triggers image generation with current settings.", parameters: { type: "OBJECT", properties: {} } }
            ]
          }];
          const response: GenerateContentResponse = await sendMessageToGeminiChat(currentChatSession, userMessageText.trim(), tools);
          const firstCandidate = response.candidates?.[0];
          if (firstCandidate?.content?.parts) {
            let textResponseAccumulator = "";
            let sdkFunctionCall: GeminiSDKFunctionCall | undefined;
            for (const part of firstCandidate.content.parts) {
              if (part.text) textResponseAccumulator += part.text;
              else if (part.functionCall) { sdkFunctionCall = part.functionCall; break; }
            }

            if (sdkFunctionCall && typeof sdkFunctionCall.name === 'string') {
              const functionName: string = sdkFunctionCall.name;
              const functionArgs = sdkFunctionCall.args || {};
              let detailMessage = ""; let actionTaken = false;
              logAppEvent('CHAT', `Gemini requested function call: ${functionName}`, { args: functionArgs });
              
              if (functionName === "updateArtStyle") { const newStyleArg = functionArgs?.newStyle; if (typeof newStyleArg === 'string' && ART_STYLES.flatMap(cat => cat.styles).includes(newStyleArg)) { functionCallHandlers.onUpdateArtStyle(newStyleArg); detailMessage = `Art style updated to "${newStyleArg}".`; actionTaken = true; } else detailMessage = `Invalid art style: "${newStyleArg}".`; }
              else if (functionName === "updateNegativePrompt") { const newNegativePromptArg = functionArgs?.negativePromptText; if (typeof newNegativePromptArg === 'string') { functionCallHandlers.onUpdateNegativePrompt(newNegativePromptArg); detailMessage = `Negative prompt set to: "${newNegativePromptArg || '(cleared)'}".`; actionTaken = true; } else detailMessage = "Invalid negative prompt text."; }
              else if (functionName === "updateTheme") { const newThemeArg = functionArgs?.newTheme; if (typeof newThemeArg === 'string' && newThemeArg.trim() !== "") { functionCallHandlers.onUpdateTheme(newThemeArg.trim()); detailMessage = `Theme updated to "${newThemeArg.trim()}".`; actionTaken = true; } else detailMessage = "Invalid theme text."; }
              else if (functionName === "setSeed") { const seedVal = functionArgs?.seedValue; if (seedVal === undefined || seedVal === null || (typeof seedVal === 'number' && !isNaN(seedVal))) { const seedToSet = (typeof seedVal !== 'number' || seedVal === 0 || isNaN(seedVal)) ? undefined : Math.max(0, Math.floor(seedVal)); functionCallHandlers.onSetSeed(seedToSet); detailMessage = `Seed updated to ${seedToSet === undefined ? 'Random' : seedToSet}.`; actionTaken = true; } else detailMessage = "Invalid seed value."; }
              else if (functionName === "setCfgScale") { const cfgVal = functionArgs?.cfgScaleValue; if (typeof cfgVal === 'number' && cfgVal >= 0 && cfgVal <= 30) { functionCallHandlers.onSetCfgScale(cfgVal); detailMessage = `CFG Scale updated to ${cfgVal.toFixed(1)}.`; actionTaken = true; } else detailMessage = "Invalid CFG Scale value."; }
              else if (functionName === "setAspectRatio") { const ratioArg = functionArgs?.newAspectRatio; if (typeof ratioArg === 'string' && (COMMON_ASPECT_RATIOS.includes(ratioArg) || /^\d+:\d+$/.test(ratioArg))) { functionCallHandlers.onSetAspectRatio(ratioArg); detailMessage = `Aspect Ratio updated to "${ratioArg}".`; actionTaken = true; } else detailMessage = `Invalid aspect ratio: "${ratioArg}".`; }
              else if (functionName === "selectRandomConcept") { functionCallHandlers.onSelectRandomConcept(); detailMessage = `Okay, I've selected a new random concept and art style. Settings like CFG, Seed, etc., reset.`; actionTaken = true; }
              else if (functionName === "generateImageNow") { functionCallHandlers.onGenerateImageNow(); detailMessage = "Image generation initiated with current settings!"; actionTaken = true; }
              else { detailMessage = `Unknown function: ${functionName}.`; logAppEvent('WARNING', `AI tried to call unknown function: ${functionName}`); }
              
              functionExecutionResult = { status: actionTaken ? "SUCCESS" : "ERROR", message: detailMessage };
              if(actionTaken) functionExecutionResult.details = functionArgs; else functionExecutionResult.error = detailMessage;
              if (actionTaken && textResponseAccumulator.trim()) {
                const preFuncMsg: ChatMessage = { id: `model-prefunc-${Date.now()}`, role: 'model', text: textResponseAccumulator.trim(), timestamp: new Date().toISOString() };
                setChatMessages(prev => [...prev, preFuncMsg]);
              }
              const funcResponseParts: Part[] = [{ functionResponse: { name: functionName, response: functionExecutionResult } }];
              const summaryResponse = await sendMessageToGeminiChat(currentChatSession, funcResponseParts);
              aiResponseText = summaryResponse.text?.trim() || detailMessage;
              functionCallData = { name: functionName, args: functionArgs };
            } else {
              aiResponseText = textResponseAccumulator.trim();
            }
          } else {
            throw new Error("AI response missing candidates or content parts.");
          }
          break;
        
        case 'deepseek':
          const apiKey = chatUserChatApiKeys[chatSelectedProviderId];
          if (!apiKey) throw new Error("DeepSeek API Key not found.");
          
          const deepSeekHistory: ProviderMessage[] = [
            { role: "system", content: buildSystemInstruction(true) }, // True for non-Gemini (no complex functions)
            ...chatMessages.filter(m => m.role === 'user' || m.role === 'model').slice(-6).map(m => ({ 
              role: m.role === 'user' ? 'user' : ('assistant' as "user" | "assistant" | "system"), // Corrected type
              content: m.text
            })),
            { role: "user", content: userMessageText.trim() }
          ];
          aiResponseText = await sendMessageToDeepSeek(apiKey, deepSeekHistory, chatSelectedModelId, chatCurrentConfig);
          break;
        
        // ... other provider cases can be added here ...
        default:
          throw new Error(`Chat provider ${chatSelectedProviderId} is not implemented yet.`);
      }

      if (aiResponseText) {
        const aiMessage: ChatMessage = {
          id: `model-${Date.now()}`, role: 'model', text: aiResponseText, timestamp: new Date().toISOString(),
          ...(functionCallData && { functionCall: functionCallData }),
          ...(functionExecutionResult && { functionResponse: functionExecutionResult })
        };
        setChatMessages(prev => [...prev, aiMessage]);
        logAppEvent('CHAT', `AI responded from ${chatSelectedProviderId}.`, { responseLength: aiResponseText.length, functionCalled: !!functionCallData });
      } else if (!functionCallData) { 
        logAppEvent('WARNING', `AI response from ${chatSelectedProviderId} was empty.`);
        const emptyMsg: ChatMessage = {id: `model-empty-${Date.now()}`, role: 'system', text:"The AI's response was empty.", timestamp: new Date().toISOString()};
        setChatMessages(prev => [...prev, emptyMsg]);
      }

    } catch (err: any) {
      const errorMessage = err.message || "Failed to get AI response.";
      showToast(`Chat Error: ${errorMessage}`, 5000);
      const errorSystemMessage: ChatMessage = { id: `error-${Date.now()}`, role: 'system', text: `Error: ${errorMessage}`, timestamp: new Date().toISOString() };
      setChatMessages(prev => [...prev, errorSystemMessage]);
      logAppEvent('ERROR', 'Failed to get AI response for chat.', { provider: chatSelectedProviderId, error: errorMessage });
    } finally {
      setIsChatLoading(false);
    }
  }, [
    chatSelectedProviderId, chatProvidersConfig, currentChatSession, isChatLoading,
    chatUserChatApiKeys, chatSelectedModelId, chatCurrentConfig, buildSystemInstruction,
    showToast, logAppEvent, functionCallHandlers, chatMessages 
  ]);
  
  const clearChatSessionData = useCallback(() => {
    setCurrentChatSession(null); 
    setChatMessages([]);
    setChatContextCache(null); 
    logAppEvent('CHAT', 'Chat session data cleared (e.g. due to provider/settings change).');
  }, [logAppEvent]);


  return {
    chatMessages,
    isChatLoading,
    initializeChatSession,
    sendChatMessage,
    clearChatSessionData,
  };
};
