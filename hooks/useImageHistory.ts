
import { useState, useEffect, useCallback } from 'react';
import { ImageHistoryItem, LogEntryType, ImageProviderSetting, ImageProviderId, MediaType } from '../types';

const MAX_HISTORY_ITEMS = 10;

interface UseImageHistoryProps {
  logAppEvent: (type: LogEntryType, message: string, details?: any) => void;
  imageProvidersConfig: ImageProviderSetting[];
  showToast: (message: string, duration?: number) => void;
}

export const useImageHistory = ({ 
  logAppEvent, 
  imageProvidersConfig,
  showToast
}: UseImageHistoryProps) => {
  const [imageHistory, setImageHistory] = useState<ImageHistoryItem[]>([]);

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('etherscapeHistory'); // Updated key
      if (savedHistory) {
        setImageHistory(JSON.parse(savedHistory));
        logAppEvent('SYSTEM', 'Image history loaded from localStorage.');
      }
    } catch (e: any) {
      logAppEvent('ERROR', 'Failed to load image history from localStorage.', { error: e.message });
    }
  }, [logAppEvent]);

  useEffect(() => {
    try {
      localStorage.setItem('etherscapeHistory', JSON.stringify(imageHistory)); // Updated key
    } catch (e: any) {
        logAppEvent('ERROR', 'Failed to save image history to localStorage. Quota might be exceeded.', { error: e.message, historyLength: imageHistory.length });
        showToast('Error saving history. LocalStorage might be full.', 4000);
    }
  }, [imageHistory, logAppEvent, showToast]);

  const addImageToHistory = useCallback((
    imageUrl: string, 
    promptText: string, 
    conceptText: string, 
    mediaTypeValue: MediaType, // Added mediaType
    artStyleText: string, 
    aspectRatioValue: string,
    providerIdValue: ImageProviderId, 
    modelIdValue: string, 
    negativePromptText?: string, 
    driveFileIdValue?: string,
    isUpscaledValue?: boolean, 
    originalHistoryItemIdValue?: string, 
    cfgScaleValue?: number, 
    stepsValue?: number,
    seedValue?: number, 
    samplerValue?: string, 
    stylePresetValue?: string, 
    leonardoPresetStyleValue?: string,
    useAlchemyValue?: boolean, 
    usePhotoRealValue?: boolean, 
    sourceImageForImg2ImgIdValue?: string,
    initStrengthForImg2ImgValue?: number
  ): ImageHistoryItem => {
    const providerConfig = imageProvidersConfig.find(p => p.id === providerIdValue);
    const modelConfig = providerConfig?.models.find(m => m.id === modelIdValue);

    const newHistoryItem: ImageHistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      imageUrl,
      prompt: promptText,
      concept: conceptText,
      mediaType: mediaTypeValue, // Use passed mediaType
      artStyle: artStyleText,
      aspectRatio: aspectRatioValue,
      provider: providerIdValue,
      modelId: modelIdValue,
      modelDisplayName: modelConfig?.displayName || modelIdValue,
      negativePrompt: negativePromptText,
      driveFileId: driveFileIdValue,
      isUpscaled: isUpscaledValue,
      originalHistoryItemId: originalHistoryItemIdValue,
      cfgScale: cfgScaleValue,
      steps: stepsValue,
      seed: seedValue,
      sampler: samplerValue,
      stylePreset: stylePresetValue,
      leonardoPresetStyle: leonardoPresetStyleValue,
      useAlchemy: useAlchemyValue,
      usePhotoReal: usePhotoRealValue,
      sourceImageForImg2ImgId: sourceImageForImg2ImgIdValue,
      initStrengthForImg2Img: initStrengthForImg2ImgValue,
    };

    setImageHistory(prevHistory => {
        const updatedHistory = [newHistoryItem, ...prevHistory];
        return updatedHistory.slice(0, MAX_HISTORY_ITEMS);
    });
    
    logAppEvent('INFO', 'Item added to local history via hook.', {
      id: newHistoryItem.id,
      concept: conceptText, mediaType: mediaTypeValue, artStyle: artStyleText, aspectRatio: aspectRatioValue,
      provider: providerConfig?.displayName, model: modelConfig?.displayName,
      prompt: promptText.substring(0, 30) + '...', negativePrompt: negativePromptText,
      driveFileId: driveFileIdValue || 'N/A', isUpscaled: isUpscaledValue,
      originalHistoryItemId: originalHistoryItemIdValue, cfgScale: cfgScaleValue,
      steps: stepsValue, seed: seedValue, sampler: samplerValue,
      stylePreset: stylePresetValue, leonardoPresetStyle: leonardoPresetStyleValue,
      useAlchemy: useAlchemyValue, usePhotoReal: usePhotoRealValue,
      sourceImageForImg2ImgId: sourceImageForImg2ImgIdValue,
      initStrengthForImg2Img: initStrengthForImg2ImgValue
    });
    return newHistoryItem;
  }, [logAppEvent, imageProvidersConfig]);

  const deleteHistoryItem = useCallback((itemId: string) => {
    const itemToDelete = imageHistory.find(item => item.id === itemId);
    setImageHistory(prevHistory => prevHistory.filter(item => item.id !== itemId));
    if (itemToDelete) {
        showToast("Item removed from history.", 2000);
        logAppEvent('INFO', 'Item removed from local history via hook.', { concept: itemToDelete.concept, id: itemId });
    }
  }, [imageHistory, showToast, logAppEvent]);

  return { imageHistory, addImageToHistory, deleteHistoryItem };
};
