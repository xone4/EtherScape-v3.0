
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useImageEditorStore } from '../stores/imageEditorStore';
import { ImageHistoryItem, UserApiKeys, EditingError, ImageProviderId, ModelSetting, LogEntryType, MediaType, ImageLayer } from '../types';
import { IMAGE_PROVIDERS_STATIC, DEFAULT_ART_STYLE, DEFAULT_ASPECT_RATIO, DEFAULT_CFG_SCALE, DEFAULT_STEPS, DEFAULT_SEED, CLIPDROP_MODEL_ID_INPAINT } from '../constants';
import { applyIPAdapter, applyControlNet, describeImageWithLlava } from '../services/falService';
import { inpaintWithClipdrop } from '../services/imageEditingService';
import { urlToFile } from '../utils'; 


interface ImageEditorDrawerProps {
  isOpen: boolean; 
  onCloseAndClear: () => void; 
  onUpscale: (originalImage: ImageHistoryItem, scaleFactor: 2 | 4) => Promise<void>; 
  onClipdropUpscale: (originalImage: ImageHistoryItem) => Promise<void>; 
  isLoading: boolean; 
  userApiKeys: UserApiKeys;
  editingError: EditingError | null;
  clearEditingError: () => void;
  setEditingError: (error: EditingError | null) => void; 
  onImageUpload: (file: File) => void; 
  onLiveQueryStart: () => void; 
  isProcessingLiveQuery: boolean; 

  selectedImageProviderId?: ImageProviderId;
  selectedModelConfig?: ModelSetting | null;
  onGenerateWithLeonardoImg2Img: (baseImageDataUrl: string, strength: number, sourceHistoryId?: string) => void;
  
  addImageToHistory: (
    imageUrl: string, 
    prompt: string, 
    concept: string, 
    mediaType: MediaType, 
    artStyle: string, 
    aspectRatio: string,
    providerId: ImageProviderId, 
    modelId: string, 
    negativePrompt?: string, 
    driveFileId?: string,
    isUpscaled?: boolean, 
    originalHistoryItemId?: string, 
    cfgScale?: number, 
    steps?: number,
    seed?: number, 
    sampler?: string, 
    stylePreset?: string, 
    leonardoPresetStyle?: string,
    useAlchemy?: boolean, 
    usePhotoReal?: boolean, 
    sourceImageForImg2ImgId?: string, 
    initStrengthForImg2Img?: number
  ) => ImageHistoryItem;
  showToast: (message: string, duration?: number) => void;
  logAppEvent: (type: LogEntryType, message: string, details?: any) => void;
  currentMainPrompt: string; 
  onClipdropInpaint: (originalImage: ImageHistoryItem, maskFile: File, inpaintPrompt: string) => Promise<void>;
  onClipdropOutpaint: (originalImage: ImageHistoryItem, extendUp: number, extendDown: number, extendLeft: number, extendRight: number) => Promise<void>;
}

type EditorTabType = MediaType | 'creative';

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean; }> = ({ active, onClick, children, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-3 py-2 text-xs sm:text-sm font-medium transition-colors rounded-t-md whitespace-nowrap
                ${active ? 'bg-gray-700 text-white border-b-2 border-teal-500' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'}
                disabled:opacity-50 disabled:cursor-not-allowed`}
    aria-pressed={active}
  >
    {children}
  </button>
);


const ImageEditorDrawer: React.FC<ImageEditorDrawerProps> = ({
  isOpen,
  onCloseAndClear,
  onUpscale,
  onClipdropUpscale,
  isLoading, 
  userApiKeys,
  editingError,
  clearEditingError,
  setEditingError, 
  onImageUpload,
  onLiveQueryStart,
  isProcessingLiveQuery,
  selectedImageProviderId,
  selectedModelConfig,
  onGenerateWithLeonardoImg2Img,
  addImageToHistory,
  showToast,
  logAppEvent,
  currentMainPrompt,
  onClipdropInpaint,
  onClipdropOutpaint
}) => {
  const { layers, selectedLayerId, updateLayer } = useImageEditorStore();
  const activeLayer = layers.find(l => l.id === selectedLayerId);

  const [activeTab, setActiveTab] = useState<EditorTabType>('image');
  const [isReplicateUpscaling, setIsReplicateUpscaling] = useState(false);
  const [isClipdropUpscaling, setIsClipdropUpscaling] = useState(false);
  const [isClipdropInpainting, setIsClipdropInpainting] = useState(false);
  const [isClipdropOutpainting, setIsClipdropOutpainting] = useState(false);
  const [outpaintUp, setOutpaintUp] = useState(0);
  const [outpaintDown, setOutpaintDown] = useState(0);
  const [outpaintLeft, setOutpaintLeft] = useState(0);
  const [outpaintRight, setOutpaintRight] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const styleImageInputRef = useRef<HTMLInputElement>(null);
  const controlImageInputRef = useRef<HTMLInputElement>(null);

  const [leoInitStrength, setLeoInitStrength] = useState(0.5);

  const [styleImageFile, setStyleImageFile] = useState<File | null>(null);
  const [styleImageUrlPreview, setStyleImageUrlPreview] = useState<string | null>(null);
  const [ipAdapterScale, setIpAdapterScale] = useState(0.5);
  
  const [controlImageFile, setControlImageFile] = useState<File | null>(null);
  const [controlImageUrlPreview, setControlImageUrlPreview] = useState<string | null>(null);
  const [controlNetType, setControlNetType] = useState<string>('canny'); 
  const [controlStrength, setControlStrength] = useState(0.75);

  const [llavaPrompt, setLlavaPrompt] = useState<string | null>(null);
  const [isApplyingStyle, setIsApplyingStyle] = useState(false);
  const [isApplyingControlNet, setIsApplyingControlNet] = useState(false);
  const [isDescribingWithLlava, setIsDescribingWithLlava] = useState(false);

  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const [inpaintingPrompt, setInpaintingPrompt] = useState<string>('');
  const [brushSize, setBrushSize] = useState<number>(20);
  const [isErasing, setIsErasing] = useState<boolean>(false);
  const [isDrawingMask, setIsDrawingMask] = useState<boolean>(false);
  const [maskActionHistory, setMaskActionHistory] = useState<ImageData[]>([]);
  const [currentMaskHistoryIndex, setCurrentMaskHistoryIndex] = useState<number>(-1);


  useEffect(() => {
    if (!isOpen || !activeLayer) {
      setStyleImageFile(null); setStyleImageUrlPreview(null);
      setControlImageFile(null); setControlImageUrlPreview(null);
      setLlavaPrompt(null); setIpAdapterScale(0.5);
      setControlNetType('canny'); setControlStrength(0.75);
      setActiveTab('image'); 
      setInpaintingPrompt(''); clearMaskCanvas();
    } else if (activeLayer) {
      setActiveTab(activeLayer.mediaType === 'image' ? 'image' : activeLayer.mediaType);
      if (activeLayer.mediaType === 'image') {
        clearMaskCanvas();
        const canvas = maskCanvasRef.current;
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => {
            if(canvas) {
                const aspectRatio = image.width / image.height;
                const displayWidth = canvas.parentElement?.clientWidth || 300; 
                canvas.width = displayWidth; 
                canvas.height = displayWidth / aspectRatio;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height); 
                    saveMaskAction(); 
                }
            }
        };
        image.src = activeLayer.imageUrl;
      }
    }
  }, [isOpen, activeLayer]);

  const saveMaskAction = useCallback(() => {
    if (maskCanvasRef.current) {
      const ctx = maskCanvasRef.current.getContext('2d');
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
        setMaskActionHistory(prev => {
          const newHistory = prev.slice(0, currentMaskHistoryIndex + 1);
          newHistory.push(imageData);
          return newHistory;
        });
        setCurrentMaskHistoryIndex(prev => prev + 1);
      }
    }
  }, [currentMaskHistoryIndex]);

  const undoMaskAction = () => {
    if (currentMaskHistoryIndex > 0) {
      setCurrentMaskHistoryIndex(prev => prev - 1);
      const imageData = maskActionHistory[currentMaskHistoryIndex - 1];
      const ctx = maskCanvasRef.current?.getContext('2d');
      if (ctx && imageData) {
        ctx.putImageData(imageData, 0, 0);
      }
    }
  };

  const redoMaskAction = () => {
    if (currentMaskHistoryIndex < maskActionHistory.length - 1) {
      setCurrentMaskHistoryIndex(prev => prev + 1);
      const imageData = maskActionHistory[currentMaskHistoryIndex + 1];
      const ctx = maskCanvasRef.current?.getContext('2d');
      if (ctx && imageData) {
        ctx.putImageData(imageData, 0, 0);
      }
    }
  };
  
  const startDrawingMask = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawingMask(true);
    drawOnMask(event); 
  };

  const drawOnMask = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingMask || !maskCanvasRef.current) return;
    const canvas = maskCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in event.nativeEvent) {
        clientX = event.nativeEvent.touches[0].clientX;
        clientY = event.nativeEvent.touches[0].clientY;
    } else {
        clientX = event.nativeEvent.clientX;
        clientY = event.nativeEvent.clientY;
    }
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = isErasing ? 'rgba(0,0,0,1)' : 'rgba(255,255,255,1)'; 
    ctx.fill();
  };

  const stopDrawingMask = () => {
    if (isDrawingMask) {
        saveMaskAction();
    }
    setIsDrawingMask(false);
  };

  const clearMaskCanvas = () => {
    if (maskCanvasRef.current) {
      const ctx = maskCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
        saveMaskAction();
      }
    }
  };


  const handleReplicateUpscaleClick = async (scaleFactor: 2 | 4) => {
    if (!activeLayer || isReplicateUpscaling || isLoading) return;
    clearEditingError(); setIsReplicateUpscaling(true);
    try { await onUpscale(activeLayer, scaleFactor); }
    catch (error) { console.error(`Replicate Upscale ${scaleFactor}x failed in drawer:`, error); } 
    finally { setIsReplicateUpscaling(false); }
  };

  const handleDoClipdropUpscale = async () => {
    if (!activeLayer || isClipdropUpscaling || isLoading || !userApiKeys.clipdrop) return;
    clearEditingError(); setIsClipdropUpscaling(true);
    try { await onClipdropUpscale(activeLayer); }
    catch (error) { console.error(`Clipdrop Upscale failed in drawer:`, error); } 
    finally { setIsClipdropUpscaling(false); }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const newImageUrl = e.target?.result as string;
            if (newImageUrl) {
                const newItem: ImageHistoryItem = {
                    id: `local-${Date.now()}`, imageUrl: newImageUrl, prompt: `Uploaded: ${file.name}`,
                    concept: file.name.split('.')[0], mediaType: 'image', artStyle: DEFAULT_ART_STYLE, 
                    aspectRatio: "source", 
                    isUpscaled: false, cfgScale: DEFAULT_CFG_SCALE, steps: DEFAULT_STEPS, seed: DEFAULT_SEED,
                    sampler: undefined, stylePreset: undefined, leonardoPresetStyle: "NONE",
                    useAlchemy: false, usePhotoReal: false,
                };
                onImageUpload(file); 
                // The store should be updated from where the action is dispatched,
                // but for now, we'll handle it here.
                // This will be part of a larger refactor.
                // For now, we assume a single layer that we replace.
                if (layers[0]?.id) {
                  updateLayer(layers[0].id, newItem);
                }
                setActiveTab('image'); 
                logAppEvent('EDITING', 'Image uploaded from device for editing.', { filename: file.name });
                showToast(`Image "${file.name}" loaded for editing.`, 2500);
            } else {
                logAppEvent('ERROR', 'Failed to read uploaded file for editing.');
                showToast('Error reading uploaded file.', 3000);
            }
        };
        reader.onerror = () => {
            logAppEvent('ERROR', 'Error occurred while reading the uploaded file.');
            showToast('Error reading file.', 3000);
        };
        reader.readAsDataURL(file);
    }
    event.target.value = ''; 
  };
  
  const handleStyleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setStyleImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setStyleImageUrlPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
    event.target.value = '';
  };

  const handleControlImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setControlImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setControlImageUrlPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
    event.target.value = '';
  };

  const handleLiveQueryClick = () => {
    if (!isAnyToolLoading) onLiveQueryStart();
  };
  
  const handleLeoImg2ImgGenerate = () => {
    if (activeLayer && !isLoading) {
      onGenerateWithLeonardoImg2Img(activeLayer.imageUrl, leoInitStrength, activeLayer.id);
    }
  };

  const handleApplyStyleTransfer = async () => {
    const falAuthToken = userApiKeys.fal_ai;
    if (!activeLayer || !styleImageFile || !falAuthToken || falAuthToken.trim() === '') {
        showToast("Fal.ai Auth Token, base image, and style image are required.", 3000);
        logAppEvent('WARNING', 'Fal.ai IP-Adapter: Missing token, base image, or style image.');
        return;
    }
    setIsApplyingStyle(true); clearEditingError();
    logAppEvent('EDITING', "Fal.ai: Attempting Style Transfer (IP-Adapter)", { 
        baseImageConcept: activeLayer.concept, styleImageName: styleImageFile.name, ipAdapterScale
    });
    try {
        const baseImageFile = await urlToFile(activeLayer.imageUrl, `base_${activeLayer.id}.png`);
        const newImageUrl = await applyIPAdapter(falAuthToken, baseImageFile, styleImageFile, ipAdapterScale);
        
        const newPrompt = `Styled with ${styleImageFile.name.substring(0,15)}... (IP-Adapter) on: ${activeLayer.prompt}`;
        const newHistoryItem = addImageToHistory(
            newImageUrl, newPrompt, activeLayer.concept, 'image', activeLayer.artStyle || DEFAULT_ART_STYLE,
            activeLayer.aspectRatio, 'fal_ai', 'fal-ai/ip-adapter',
            activeLayer.negativePrompt, undefined, false, activeLayer.id,
            activeLayer.cfgScale, activeLayer.steps, activeLayer.seed
        );
        if (selectedLayerId) updateLayer(selectedLayerId, newHistoryItem);
        showToast("Fal.ai Style Transfer (IP-Adapter) successful!", 3000);
        logAppEvent('EDITING', "Fal.ai Style Transfer (IP-Adapter) success", { newImageUrl });
    } catch (error: any) {
        logAppEvent('ERROR', "Fal.ai Style Transfer (IP-Adapter) failed.", { error: error.message });
        showToast(`Fal.ai Style Transfer Error: ${error.message}`, 4000);
    } finally {
        setIsApplyingStyle(false);
    }
  };

  const handleApplyControlNet = async () => {
    const falAuthToken = userApiKeys.fal_ai;
    if (!activeLayer || !controlImageFile || !falAuthToken || falAuthToken.trim() === '') {
        showToast("Fal.ai Auth Token, base image, and control image are required.", 3000);
        logAppEvent('WARNING', 'Fal.ai ControlNet: Missing token, base image, or control image.');
        return;
    }
    setIsApplyingControlNet(true); clearEditingError();
    const promptForControlNet = currentMainPrompt || activeLayer.prompt || activeLayer.concept;
    logAppEvent('EDITING', "Fal.ai: Attempting Composition Control (ControlNet)", {
        baseImageConcept: activeLayer.concept, controlImageName: controlImageFile.name,
        controlNetType, controlStrength, prompt: promptForControlNet
    });
    try {
        const baseImageFile = await urlToFile(activeLayer.imageUrl, `base_control_${activeLayer.id}.png`);
        const newImageUrl = await applyControlNet(falAuthToken, baseImageFile, controlImageFile, controlNetType, controlStrength, promptForControlNet);

        const newPrompt = `ControlNet (${controlNetType}, Str: ${controlStrength.toFixed(2)}) on: ${promptForControlNet}`;
        const newHistoryItem = addImageToHistory(
            newImageUrl, newPrompt, activeLayer.concept, 'image', activeLayer.artStyle || DEFAULT_ART_STYLE,
            activeLayer.aspectRatio, 'fal_ai', `fal-ai/controlnet-${controlNetType}`,
            activeLayer.negativePrompt, undefined, false, activeLayer.id,
            activeLayer.cfgScale, activeLayer.steps, activeLayer.seed
        );
        if (selectedLayerId) updateLayer(selectedLayerId, newHistoryItem);
        showToast("Fal.ai Composition Control (ControlNet) successful!", 3000);
        logAppEvent('EDITING', "Fal.ai Composition Control (ControlNet) success", { newImageUrl });
    } catch (error: any) {
        logAppEvent('ERROR', "Fal.ai Composition Control (ControlNet) failed.", { error: error.message });
        showToast(`Fal.ai ControlNet Error: ${error.message}`, 4000);
    } finally {
        setIsApplyingControlNet(false);
    }
  };

  const handleDescribeWithLlava = async () => {
    const falAuthToken = userApiKeys.fal_ai;
    if (!activeLayer || !falAuthToken || falAuthToken.trim() === '') {
        showToast("Fal.ai Auth Token and an image are required.", 3000);
        logAppEvent('WARNING', 'Fal.ai LLaVA: Missing token or image.');
        return;
    }
    setIsDescribingWithLlava(true); clearEditingError();
    setLlavaPrompt("Describing with LLaVA (Fal.ai)...");
    logAppEvent('EDITING', "Fal.ai: Attempting Image Description (LLaVA)", { imageConcept: activeLayer.concept });
    try {
        const imageToDescribeFile = await urlToFile(activeLayer.imageUrl, `llava_target_${activeLayer.id}.png`);
        const description = await describeImageWithLlava(falAuthToken, imageToDescribeFile);
        setLlavaPrompt(description);
        showToast("Fal.ai LLaVA description received!", 3000);
        logAppEvent('EDITING', "Fal.ai LLaVA description success", { description });
    } catch (error: any) {
        logAppEvent('ERROR', "Fal.ai LLaVA description failed.", { error: error.message });
        setLlavaPrompt(`Error describing image: ${error.message}`);
        showToast(`Fal.ai LLaVA Error: ${error.message}`, 4000);
    } finally {
        setIsDescribingWithLlava(false);
    }
  };
  
  const handleApplyInpainting = async () => {
      if (!activeLayer || !maskCanvasRef.current ) {
          showToast("An image and a mask are required for inpainting.", 3000);
          logAppEvent('WARNING', 'Clipdrop Inpainting: Missing image, or mask canvas.');
          return;
      }
      if (!inpaintingPrompt.trim()) {
          showToast("Please enter a prompt describing what to inpaint.", 3000);
          return;
      }
      setIsClipdropInpainting(true); clearEditingError();
      logAppEvent('EDITING', "Clipdrop: Attempting Inpainting", {
        baseImageConcept: activeLayer.concept, prompt: inpaintingPrompt
      });

      try {
          const tempMaskCanvas = document.createElement('canvas');
          tempMaskCanvas.width = maskCanvasRef.current.width;
          tempMaskCanvas.height = maskCanvasRef.current.height;
          const tempCtx = tempMaskCanvas.getContext('2d');
          if(!tempCtx) throw new Error("Could not create temporary canvas context for mask.");

          tempCtx.drawImage(maskCanvasRef.current, 0, 0);
          
          const maskBlob = await new Promise<Blob | null>(resolve => tempMaskCanvas.toBlob(resolve, 'image/png'));
          if (!maskBlob) throw new Error("Could not create mask blob for Clipdrop Inpainting.");
          const maskFile = new File([maskBlob], `cd_inpaint_mask_${activeLayer.id}.png`, { type: 'image/png' });

          await onClipdropInpaint(activeLayer, maskFile, inpaintingPrompt);
          
          clearMaskCanvas(); 
          setInpaintingPrompt('');
      } catch (error: any) { 
          logAppEvent('ERROR', "Clipdrop Inpainting failed in drawer.", { error: error.message });
      } finally {
          setIsClipdropInpainting(false);
      }
  };

  const handleApplyOutpainting = async () => {
    if (!activeLayer) {
      showToast("An image is required for outpainting.", 3000);
      logAppEvent('WARNING', 'Clipdrop Outpainting: Missing image.');
      return;
    }
    if (outpaintUp === 0 && outpaintDown === 0 && outpaintLeft === 0 && outpaintRight === 0) {
      showToast("Please enter a value for at least one direction.", 3000);
      return;
    }
    setIsClipdropOutpainting(true);
    clearEditingError();
    logAppEvent('EDITING', "Clipdrop: Attempting Outpainting", {
      baseImageConcept: activeLayer.concept,
      up: outpaintUp,
      down: outpaintDown,
      left: outpaintLeft,
      right: outpaintRight,
    });
    try {
      await onClipdropOutpaint(activeLayer, outpaintUp, outpaintDown, outpaintLeft, outpaintRight);
    } catch (error: any) {
      logAppEvent('ERROR', "Clipdrop Outpainting failed in drawer.", { error: error.message });
    } finally {
      setIsClipdropOutpainting(false);
    }
  };

  const handleSaveCurrentToHistory = () => {
    if (!activeLayer) {
      showToast("No image loaded in editor to save.", 3000);
      return;
    }
    addImageToHistory(
      activeLayer.imageUrl,
      activeLayer.prompt,
      activeLayer.concept,
      activeLayer.mediaType,
      activeLayer.artStyle || DEFAULT_ART_STYLE,
      activeLayer.aspectRatio || DEFAULT_ASPECT_RATIO,
      activeLayer.provider || (selectedImageProviderId || 'gemini'), // Fallback provider
      activeLayer.modelId || (selectedModelConfig?.id || 'unknown-model'), // Fallback model
      activeLayer.negativePrompt,
      activeLayer.driveFileId, // Keep if it was already from Drive
      activeLayer.isUpscaled,
      activeLayer.originalHistoryItemId,
      activeLayer.cfgScale,
      activeLayer.steps,
      activeLayer.seed,
      activeLayer.sampler,
      activeLayer.stylePreset,
      activeLayer.leonardoPresetStyle,
      activeLayer.useAlchemy,
      activeLayer.usePhotoReal,
      activeLayer.sourceImageForImg2ImgId,
      activeLayer.initStrengthForImg2Img
    );
    showToast(`Image "${activeLayer.concept}" saved to history.`, 2500);
    logAppEvent('EDITING', 'Current editor image saved to history manually.', { concept: activeLayer.concept });
  };


  const replicateApiKeySet = userApiKeys.replicate && userApiKeys.replicate.trim() !== '';
  const clipdropApiKeySet = userApiKeys.clipdrop && userApiKeys.clipdrop.trim() !== '';
  const leonardoApiKeySet = userApiKeys.leonardo_ai && userApiKeys.leonardo_ai.trim() !== '';
  const falAiApiKeySet = userApiKeys.fal_ai && userApiKeys.fal_ai.trim() !== '';
  
  const canReplicateUpscale = replicateApiKeySet && activeLayer && activeLayer.mediaType === 'image' && !activeLayer.isUpscaled;
  const canClipdropUpscale = clipdropApiKeySet && activeLayer && activeLayer.mediaType === 'image' && !activeLayer.isUpscaled;
  const canClipdropInpaint = clipdropApiKeySet && activeLayer && activeLayer.mediaType === 'image';
  const canClipdropOutpaint = clipdropApiKeySet && activeLayer && activeLayer.mediaType === 'image';
  
  const isAnyToolLoading = isLoading || isReplicateUpscaling || isClipdropUpscaling || isClipdropInpainting || isClipdropOutpainting || isProcessingLiveQuery || isApplyingStyle || isApplyingControlNet || isDescribingWithLlava;

  const showFalAiStudio = activeLayer && activeLayer.mediaType === 'image';
  const showLeonardoImg2Img = activeLayer && activeLayer.mediaType === 'image' && selectedImageProviderId === 'leonardo_ai' && leonardoApiKeySet && selectedModelConfig?.supportsImageToImage === true;


  return (
    <aside
      className={`fixed top-0 left-0 h-full w-full max-w-[300px] bg-gray-800/70 backdrop-blur-md shadow-xl z-40 transform transition-transform duration-300 ease-[cubic-bezier(0.37,0,0.63,1)] flex flex-col border-r border-gray-700/50
                  ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      role="complementary" aria-labelledby="image-editor-title" aria-hidden={!isOpen} >
      <div className="flex items-center justify-between p-3 border-b border-gray-700/50">
        <h2 id="image-editor-title" className="text-xl font-semibold text-gray-300">Media Studio</h2>
        <button onClick={onCloseAndClear} className="text-gray-400 hover:text-white" aria-label="Close Editor and Clear Media">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      
      <div className="flex border-b border-gray-600/50 px-1">
        {(['image', 'creative', 'video', 'audio'] as EditorTabType[]).map(tab => (
          <TabButton 
            key={tab} 
            active={activeTab === tab} 
            onClick={() => setActiveTab(tab)}
            disabled={!activeLayer && tab !== 'image'}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </TabButton>
        ))}
      </div>


      <div className="p-3 overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700/50 editor-drawer-content">
        <div className="space-y-4">
            {(activeTab === 'image' || !activeLayer) && (
                <div className="p-2.5 border border-gray-600 rounded-md bg-gray-700/50">
                    <h3 className="text-sm font-medium text-gray-300 mb-2">Load Image</h3>
                    <input type="file" accept="image/png, image/jpeg, image/webp, image/gif" onChange={handleFileUpload} ref={fileInputRef} className="hidden" id="local-image-upload" />
                    <button onClick={() => fileInputRef.current?.click()} disabled={isAnyToolLoading} className="w-full mb-2 px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-md shadow-sm transition-all text-xs disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center" >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"> <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /> </svg> Upload from Device
                    </button>
                    <button onClick={handleLiveQueryClick} disabled={isAnyToolLoading} className="w-full mb-2 px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-md shadow-sm transition-all text-xs disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center" aria-label="Start Live Query with Camera for Editor" title="Use your camera to capture an image for the editor" >
                    {isProcessingLiveQuery ? ( <><svg className="animate-spin -ml-1 mr-1.5 h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg> Capturing...</>
                    ) : ( <> <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor"> <path d="M2 4a1 1 0 011-1h1a1 1 0 011 1v1a1 1 0 01-1 1H3a1 1 0 01-1-1V4zM6 4a1 1 0 011-1h2a1 1 0 011 1v1a1 1 0 01-1 1H7a1 1 0 01-1-1V4zM2 9a1 1 0 011-1h1a1 1 0 011 1v1a1 1 0 01-1 1H3a1 1 0 01-1-1V9zM6 9a1 1 0 011-1h2a1 1 0 011 1v1a1 1 0 01-1 1H7a1 1 0 01-1-1V9zM2 14a1 1 0 011-1h1a1 1 0 011 1v1a1 1 0 01-1 1H3a1 1 0 01-1-1v-1zM6 14a1 1 0 011-1h2a1 1 0 011 1v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-1z" /> <path fillRule="evenodd" d="M12 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zM15.293 4.293a1 1 0 011.414 0l2 2a1 1 0 010 1.414l-2 2a1 1 0 01-1.414-1.414L16.586 7 15.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /> </svg> Live Capture </> )}
                    </button>
                    {activeLayer && activeLayer.mediaType === 'image' && (
                        <button onClick={handleSaveCurrentToHistory} disabled={isAnyToolLoading} className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-md shadow-sm transition-all text-xs disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" /></svg>
                            Save to History
                        </button>
                    )}
                </div>
            )}

            {activeLayer && activeLayer.mediaType === 'image' && (
                <>
                    <div className="border border-gray-600 rounded-md overflow-hidden relative" style={{minHeight: '150px'}}> 
                        <img src={activeLayer.imageUrl} alt={activeLayer.concept} className="w-full h-auto object-contain max-h-60" />
                        {activeTab === 'creative' && (
                            <canvas
                                ref={maskCanvasRef}
                                onMouseDown={startDrawingMask}
                                onMouseMove={drawOnMask}
                                onMouseUp={stopDrawingMask}
                                onMouseLeave={stopDrawingMask}
                                onTouchStart={startDrawingMask}
                                onTouchMove={drawOnMask}
                                onTouchEnd={stopDrawingMask}
                                className="absolute top-0 left-0 w-full h-full opacity-50 cursor-crosshair"
                                style={{ imageRendering: 'pixelated' }} 
                            ></canvas>
                        )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Editing Image: <span className="font-semibold text-gray-300 truncate block" title={activeLayer.concept}>{activeLayer.concept}</span></p>
                    {editingError && !editingError.tool.startsWith('clipdrop_inpaint') && ( 
                        <div className="my-2 p-2 bg-red-800/60 border border-red-700 rounded-md text-xs text-red-200 break-words"> <strong>Error:</strong> {editingError.message} <button onClick={clearEditingError} className="ml-2 text-red-100 hover:text-white underline">(Clear)</button></div>
                    )}
                </>
            )}

            {activeLayer && activeLayer.mediaType === 'image' && (
                <>
                    {activeTab === 'image' && (
                        <>
                            <div className="p-2.5 border border-gray-600 rounded-md bg-gray-700/50">
                                <h3 className="text-sm font-medium text-gray-300 mb-2">Upscale Image</h3>
                                {activeLayer.isUpscaled && ( <p className="text-xs text-blue-300 bg-blue-800/30 p-2 rounded-md mb-2"> This image has already been upscaled. Further upscaling is not recommended. </p> )}
                                <div className="space-y-2">
                                    {!replicateApiKeySet && ( <p className="text-xs text-yellow-400 bg-yellow-800/30 p-2 rounded-md"> Replicate API Key needed for Replicate upscale options. </p> )}
                                    <button onClick={() => handleReplicateUpscaleClick(2)} disabled={!canReplicateUpscale || isReplicateUpscaling || isAnyToolLoading} className="w-full px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-md shadow-sm transition-all text-xs disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center" > {isReplicateUpscaling ? ( <><svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Upscaling 2x (Replicate)...</> ) : "Upscale 2x (Replicate)"} </button>
                                    <button onClick={() => handleReplicateUpscaleClick(4)} disabled={!canReplicateUpscale || isReplicateUpscaling || isAnyToolLoading} className="w-full px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-md shadow-sm transition-all text-xs disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center" > {isReplicateUpscaling ? ( <><svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Upscaling 4x (Replicate)...</> ) : "Upscale 4x (Replicate)"} </button>
                                    <hr className="border-gray-600 my-2" />
                                    {!clipdropApiKeySet && ( <p className="text-xs text-yellow-400 bg-yellow-800/30 p-2 rounded-md"> Clipdrop API Key needed for Clipdrop upscale option. </p> )}
                                    <button onClick={handleDoClipdropUpscale} disabled={!canClipdropUpscale || isClipdropUpscaling || isAnyToolLoading} className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-md shadow-sm transition-all text-xs disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center" > {isClipdropUpscaling ? ( <><svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Upscaling (Clipdrop)...</> ) : "Upscale with Clipdrop (Auto)"} </button>
                                </div>
                            </div>
                            
                            {showLeonardoImg2Img && (
                                <div className="p-2.5 border border-gray-600 rounded-md bg-gray-700/50">
                                    <h3 className="text-sm font-medium text-gray-300 mb-2">Image-to-Image (Leonardo.Ai)</h3>
                                    <p className="text-xs text-gray-400 mb-1"> Uses current editor image as base. Ensure main prompt (Controls panel) describes desired transformation. </p>
                                    <div> <label htmlFor="leo-init-strength" className="block text-xs font-medium text-gray-300 mb-1"> Influence Strength: <span className="text-gray-400">{leoInitStrength.toFixed(2)}</span> </label> <input type="range" id="leo-init-strength" min="0.1" max="0.9" step="0.05" value={leoInitStrength} onChange={(e) => setLeoInitStrength(parseFloat(e.target.value))} disabled={isAnyToolLoading} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500" /> <p className="text-xs text-gray-400 mt-0.5">Higher values respect original image more.</p> </div>
                                    <button onClick={handleLeoImg2ImgGenerate} disabled={isAnyToolLoading || !activeLayer} className="w-full mt-3 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-md shadow-sm transition-all text-xs disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center" > {isLoading && selectedImageProviderId === 'leonardo_ai' ? ( <><svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Generating (Img2Img)...</> ) : "Generate with Img2Img (Leonardo)"} </button>
                                </div>
                            )}
                            {!showLeonardoImg2Img && selectedImageProviderId === 'leonardo_ai' && activeLayer && activeLayer.mediaType === 'image' && ( <p className="text-xs text-yellow-400 bg-yellow-800/30 p-2 rounded-md"> {(leonardoApiKeySet && selectedModelConfig && !selectedModelConfig.supportsImageToImage) ? `Selected Leonardo model "${selectedModelConfig?.displayName}" does not support Image-to-Image. Choose a compatible model (e.g., Leonardo Diffusion XL, DreamShaper v7) in Advanced Settings.` : "Leonardo.Ai Image-to-Image requires a compatible model and API key. Please check your settings."} </p> )}
                        </>
                    )}

                    {activeTab === 'creative' && (
                        <>
                            {editingError?.tool.startsWith('clipdrop_inpaint') && ( <div className="my-2 p-2 bg-red-800/60 border border-red-700 rounded-md text-xs text-red-200 break-words"> <strong>Error:</strong> {editingError.message} <button onClick={clearEditingError} className="ml-2 text-red-100 hover:text-white underline">(Clear)</button></div> )}
                            <div className="p-2.5 border border-blue-500/50 rounded-md bg-gray-700/40 space-y-2">
                                <h3 className="text-sm font-medium text-blue-300 mb-1">Inpainting (Clipdrop)</h3>
                                {!canClipdropInpaint && ( <p className="text-xs text-yellow-300 bg-yellow-700/40 p-1.5 rounded-md"> Clipdrop API Key required for Inpainting. </p> )}
                                
                                <div className="flex items-center space-x-2">
                                    <button onClick={() => setIsErasing(false)} disabled={!canClipdropInpaint || isAnyToolLoading} className={`px-2 py-1 text-xs rounded flex-1 ${!isErasing ? 'bg-blue-500 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>Brush</button>
                                    <button onClick={() => setIsErasing(true)} disabled={!canClipdropInpaint || isAnyToolLoading} className={`px-2 py-1 text-xs rounded flex-1 ${isErasing ? 'bg-blue-500 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>Eraser</button>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <label htmlFor="brush-size" className="text-xs text-gray-300 whitespace-nowrap">Brush Size:</label>
                                    <input type="range" id="brush-size" min="2" max="80" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} disabled={!canClipdropInpaint || isAnyToolLoading} className="w-full h-1.5 bg-gray-500 rounded appearance-none cursor-pointer accent-blue-400"/>
                                    <span className="text-xs text-gray-400 w-6 text-right">{brushSize}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <button onClick={undoMaskAction} disabled={!canClipdropInpaint || isAnyToolLoading || currentMaskHistoryIndex <= 0} className="flex-1 px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 rounded disabled:opacity-50">Undo</button>
                                    <button onClick={redoMaskAction} disabled={!canClipdropInpaint || isAnyToolLoading || currentMaskHistoryIndex >= maskActionHistory.length - 1} className="flex-1 px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 rounded disabled:opacity-50">Redo</button>
                                    <button onClick={clearMaskCanvas} disabled={!canClipdropInpaint || isAnyToolLoading} className="flex-1 px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 rounded disabled:opacity-50">Clear Mask</button>
                                </div>
                                <p className="text-[10px] text-gray-400">Draw on the image above to mark areas for inpainting. White = inpaint, Black (Eraser) = keep.</p>
                                <textarea value={inpaintingPrompt} onChange={(e) => setInpaintingPrompt(e.target.value)} placeholder="Describe what to fill in the masked area..." rows={2} disabled={!canClipdropInpaint || isAnyToolLoading} className="w-full p-1.5 text-xs bg-gray-600 border border-gray-500 rounded focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400 scrollbar-thin"></textarea>
                                <button onClick={handleApplyInpainting} disabled={!canClipdropInpaint || isAnyToolLoading || !inpaintingPrompt.trim()} className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-md shadow-sm transition-all text-xs disabled:opacity-60 disabled:cursor-not-allowed">
                                    {isClipdropInpainting ? 'Inpainting...' : 'Apply Inpainting (Clipdrop)'}
                                </button>
                            </div>

                            <div className="p-2.5 border border-purple-500/50 rounded-md bg-gray-700/40 space-y-2">
                                <h3 className="text-sm font-medium text-purple-300 mb-1">Outpainting (Clipdrop)</h3>
                                {!canClipdropOutpaint && ( <p className="text-xs text-yellow-300 bg-yellow-700/40 p-1.5 rounded-md"> Clipdrop API Key required for Outpainting. </p> )}
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label htmlFor="outpaint-left" className="block text-xs font-medium text-gray-300">Left (px)</label>
                                        <input type="number" id="outpaint-left" value={outpaintLeft} onChange={(e) => setOutpaintLeft(Number(e.target.value))} disabled={!canClipdropOutpaint || isAnyToolLoading} className="w-full p-1.5 text-xs bg-gray-600 border border-gray-500 rounded" />
                                    </div>
                                    <div>
                                        <label htmlFor="outpaint-right" className="block text-xs font-medium text-gray-300">Right (px)</label>
                                        <input type="number" id="outpaint-right" value={outpaintRight} onChange={(e) => setOutpaintRight(Number(e.target.value))} disabled={!canClipdropOutpaint || isAnyToolLoading} className="w-full p-1.5 text-xs bg-gray-600 border border-gray-500 rounded" />
                                    </div>
                                    <div>
                                        <label htmlFor="outpaint-up" className="block text-xs font-medium text-gray-300">Up (px)</label>
                                        <input type="number" id="outpaint-up" value={outpaintUp} onChange={(e) => setOutpaintUp(Number(e.target.value))} disabled={!canClipdropOutpaint || isAnyToolLoading} className="w-full p-1.5 text-xs bg-gray-600 border border-gray-500 rounded" />
                                    </div>
                                    <div>
                                        <label htmlFor="outpaint-down" className="block text-xs font-medium text-gray-300">Down (px)</label>
                                        <input type="number" id="outpaint-down" value={outpaintDown} onChange={(e) => setOutpaintDown(Number(e.target.value))} disabled={!canClipdropOutpaint || isAnyToolLoading} className="w-full p-1.5 text-xs bg-gray-600 border border-gray-500 rounded" />
                                    </div>
                                </div>
                                <button onClick={handleApplyOutpainting} disabled={!canClipdropOutpaint || isAnyToolLoading} className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-md shadow-sm transition-all text-xs disabled:opacity-60 disabled:cursor-not-allowed">
                                    {isClipdropOutpainting ? 'Outpainting...' : 'Apply Outpainting (Clipdrop)'}
                                </button>
                            </div>
                            <hr className="border-gray-600/50 my-3" />
                            
                            {showFalAiStudio && (
                                <div className="space-y-3 p-2.5 border-2 border-teal-500/50 rounded-md bg-gray-700/30">
                                    <h3 className="text-md font-semibold text-teal-300 mb-2 text-center">Fal.ai Precision Studio</h3>
                                    {!falAiApiKeySet && ( <p className="text-xs text-yellow-300 bg-yellow-700/40 p-2 rounded-md text-center"> Fal.ai Auth Token needed. Set it in Advanced Settings. </p> )}
                                    
                                    <div className="p-2 border border-gray-600 rounded bg-gray-700/40">
                                        <h4 className="text-sm font-medium text-gray-300 mb-1.5">Style Transfer (IP-Adapter)</h4>
                                        <input type="file" accept="image/*" onChange={handleStyleImageUpload} ref={styleImageInputRef} className="hidden" id="style-image-upload-fal" />
                                        <button onClick={() => styleImageInputRef.current?.click()} disabled={isAnyToolLoading || !falAiApiKeySet} className="w-full mb-2 px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-xs rounded disabled:opacity-50"> {styleImageFile ? `Style: ${styleImageFile.name.substring(0,20)}...` : "Upload Style Image"} </button>
                                        {styleImageUrlPreview && <img src={styleImageUrlPreview} alt="Style preview" className="w-full h-24 object-contain rounded border border-gray-500 mb-2 bg-black/20"/>}
                                        <div> <label htmlFor="ip-adapter-scale" className="block text-xs text-gray-400 mb-0.5">Style Influence: <span className="text-gray-300">{ipAdapterScale.toFixed(2)}</span></label> <input type="range" id="ip-adapter-scale" min="0.1" max="1.0" step="0.05" value={ipAdapterScale} onChange={(e) => setIpAdapterScale(parseFloat(e.target.value))} disabled={isAnyToolLoading || !falAiApiKeySet} className="w-full h-1.5 bg-gray-500 rounded appearance-none cursor-pointer accent-teal-500"/> </div>
                                        <button onClick={handleApplyStyleTransfer} disabled={!activeLayer || !styleImageFile || isAnyToolLoading || !falAiApiKeySet} className="w-full mt-2 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-xs rounded disabled:opacity-50"> {isApplyingStyle ? "Applying Style..." : "Apply Style Transfer"} </button>
                                    </div>

                                    <div className="p-2 border border-gray-600 rounded bg-gray-700/40">
                                        <h4 className="text-sm font-medium text-gray-300 mb-1.5">Composition Control (ControlNet)</h4>
                                        <input type="file" accept="image/*" onChange={handleControlImageUpload} ref={controlImageInputRef} className="hidden" id="control-image-upload-fal" />
                                        <button onClick={() => controlImageInputRef.current?.click()} disabled={isAnyToolLoading || !falAiApiKeySet} className="w-full mb-2 px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-xs rounded disabled:opacity-50"> {controlImageFile ? `Control: ${controlImageFile.name.substring(0,20)}...` : "Upload Control Image"} </button>
                                        {controlImageUrlPreview && <img src={controlImageUrlPreview} alt="Control preview" className="w-full h-24 object-contain rounded border border-gray-500 mb-2 bg-black/20"/>}
                                        <div> <label htmlFor="controlnet-type" className="block text-xs text-gray-400 mb-0.5">Control Type</label> <select id="controlnet-type" value={controlNetType} onChange={(e) => setControlNetType(e.target.value)} disabled={isAnyToolLoading || !falAiApiKeySet} className="w-full p-1.5 text-xs bg-gray-600 border border-gray-500 rounded focus:ring-teal-500 focus:border-teal-500"> <option value="canny">Canny (Edges)</option> <option value="depth">Depth</option> <option value="human_pose">Human Pose</option> <option value="scribble">Scribble / Sketch</option> <option value="mlsd">MLSD (Lines)</option> </select> </div>
                                        <div className="mt-1.5"> <label htmlFor="control-strength" className="block text-xs text-gray-400 mb-0.5">Control Strength: <span className="text-gray-300">{controlStrength.toFixed(2)}</span></label> <input type="range" id="control-strength" min="0.1" max="2.0" step="0.05" value={controlStrength} onChange={(e) => setControlStrength(parseFloat(e.target.value))} disabled={isAnyToolLoading || !falAiApiKeySet} className="w-full h-1.5 bg-gray-500 rounded appearance-none cursor-pointer accent-teal-500"/> </div>
                                        <button onClick={handleApplyControlNet} disabled={!activeLayer || !controlImageFile || isAnyToolLoading || !falAiApiKeySet } className="w-full mt-2 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-xs rounded disabled:opacity-50"> {isApplyingControlNet ? "Applying Control..." : "Generate with Control"} </button>
                                        <p className="text-[10px] text-gray-500 mt-1">Uses the main prompt from the Controls panel.</p>
                                    </div>
                                    
                                    <div className="p-2 border border-gray-600 rounded bg-gray-700/40">
                                        <h4 className="text-sm font-medium text-gray-300 mb-1.5">Describe Image (LLaVA)</h4>
                                        <button onClick={handleDescribeWithLlava} disabled={!activeLayer || isAnyToolLoading || !falAiApiKeySet} className="w-full mb-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-xs rounded disabled:opacity-50"> {isDescribingWithLlava ? "Describing..." : "Describe Current Image"} </button>
                                        {llavaPrompt && ( <textarea readOnly value={llavaPrompt} rows={3} className="w-full p-1.5 text-xs bg-gray-600 border-gray-500 rounded scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-700/50" placeholder="Description will appear here..."/> )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            {activeTab === 'video' && (
                <>
                  {!activeLayer || activeLayer.mediaType !== 'video' ? ( <p className="text-gray-400 text-center p-4">Load a video item from history to see details.</p>) : (
                    <div className="p-2.5 border border-gray-600 rounded-md bg-gray-700/50">
                        <h3 className="text-sm font-medium text-gray-300 mb-2">Video Details</h3>
                        <video src={activeLayer.imageUrl} controls className="w-full rounded-md mb-2 max-h-60" />
                        <p className="text-xs text-gray-400">Concept: <span className="text-gray-300">{activeLayer.concept}</span></p>
                        <p className="text-xs text-gray-400">Source Prompt: <span className="text-gray-300 italic">{activeLayer.prompt}</span></p>
                        <p className="text-xs text-gray-400">Provider: <span className="text-gray-300">{activeLayer.provider} ({activeLayer.modelDisplayName || activeLayer.modelId})</span></p>
                    </div>
                  )}
                </>
            )}
            {activeTab === 'audio' && (
                 <>
                  {!activeLayer || activeLayer.mediaType !== 'audio' ? ( <p className="text-gray-400 text-center p-4">Load an audio item from history to see details.</p>) : (
                    <div className="p-2.5 border border-gray-600 rounded-md bg-gray-700/50">
                        <h3 className="text-sm font-medium text-gray-300 mb-2">Audio Details</h3>
                        <audio src={activeLayer.imageUrl} controls className="w-full mb-2" />
                        <p className="text-xs text-gray-400">Concept: <span className="text-gray-300">{activeLayer.concept}</span></p>
                        <p className="text-xs text-gray-400">Source Prompt: <span className="text-gray-300 italic">{activeLayer.prompt}</span></p>
                        <p className="text-xs text-gray-400">Provider: <span className="text-gray-300">{activeLayer.provider} ({activeLayer.modelDisplayName || activeLayer.modelId})</span></p>
                    </div>
                  )}
                </>
            )}
            
            {!activeLayer && (activeTab === 'image' || activeTab === 'creative') && (
                <p className="text-gray-400 text-center p-4">Upload or capture an image to enable editing tools.</p>
            )}
            {activeLayer && activeLayer.mediaType !== 'video' && activeTab === 'video' && (
                 <p className="text-gray-400 text-center p-4">Current media is not a video. Load a video from history to see details.</p>
            )}
            {activeLayer && activeLayer.mediaType !== 'audio' && activeTab === 'audio' && (
                 <p className="text-gray-400 text-center p-4">Current media is not audio. Load an audio item from history to see details.</p>
            )}
            
            {activeLayer && activeLayer.mediaType !== 'image' && (activeTab === 'image' || activeTab === 'creative') && (
                <div className="p-2.5 border border-dashed border-gray-600 rounded-md bg-gray-700/30 mt-4">
                    <h3 className="text-sm font-medium text-gray-400 mb-1">Editing Tools Not Applicable</h3>
                    <p className="text-xs text-gray-500">The current media type ({activeLayer.mediaType}) does not support these image editing tools.</p>
                </div>
            )}

        </div>
      </div>
      <style>{`
        .editor-drawer-content::-webkit-scrollbar { width: 8px; }
        .editor-drawer-content::-webkit-scrollbar-track { background: #374151; }
        .editor-drawer-content::-webkit-scrollbar-thumb { background-color: #4b5563; border-radius: 10px; border: 2px solid #374151; }
        .editor-drawer-content { scrollbar-width: thin; scrollbar-color: #4b5563 #374151; }
      `}</style>
    </aside>
  );
};

export default ImageEditorDrawer;
