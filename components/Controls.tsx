import React, { useState, useEffect } from 'react';
import { useAppContext } from '../AppContext'; // Import context
import { ART_STYLES, COMMON_ASPECT_RATIOS, DEFAULT_ASPECT_RATIO, IMAGE_PROVIDERS_STATIC, DEFAULT_CFG_SCALE, DEFAULT_STEPS } from '../constants';
import { ModelSetting, ImageProviderSetting, PresetItem, ImageProviderId } from '../types';
import { remixConcept, enhancePrompt } from '../services/geminiService';

// Props that are NOT from context (or are callbacks that App.tsx still handles)
interface ControlsOwnProps {
  onStart: (
    theme: string, artStyle: string, aspectRatio: string, negativePrompt?: string,
    cfgScale?: number, steps?: number, seed?: number, sampler?: string, stylePreset?: string,
    leonardoPresetStyle?: string, useAlchemy?: boolean, usePhotoReal?: boolean
  ) => void;
  onStop: () => void;
  onGenerateSingle: (
    theme: string, artStyle: string, aspectRatio: string, negativePrompt?: string,
    cfgScale?: number, steps?: number, seed?: number, sampler?: string, stylePreset?: string,
    leonardoPresetStyle?: string, useAlchemy?: boolean, usePhotoReal?: boolean
  ) => void;
  onSaveConcept: (theme: string) => void;
  onRandomize: () => void;
  predefinedConcepts: string[];
  userSavedConcepts: string[];

  onOpenAdvancedSettings: () => void;

  onLiveQueryStart: () => void;
  isProcessingLiveQuery: boolean;
}

const Controls: React.FC<ControlsOwnProps> = ({
  onStart, onStop, onGenerateSingle, onSaveConcept,
  onRandomize, predefinedConcepts, userSavedConcepts,
  onOpenAdvancedSettings,
  onLiveQueryStart, isProcessingLiveQuery
}) => {
  const {
    // States from context
    imageProvidersConfig,
    isPlaying,
    appIsLoading,
    initialThemeForControls, setInitialThemeForControls, 
    currentArtStyle, setCurrentArtStyle, initialArtStyleForControls, setInitialArtStyleForControls,
    currentAspectRatio, setCurrentAspectRatio, initialAspectRatioForControls, setInitialAspectRatioForControls,
    selectedImageProvider, 
    selectedModelId, 
    currentNegativePrompt, setCurrentNegativePrompt, initialNegativePromptForControls, setInitialNegativePromptForControls,
    currentCfgScale, setCurrentCfgScale, initialCfgScaleForControls, setInitialCfgScaleForControls,
    currentSteps, setCurrentSteps, initialStepsForControls, setInitialStepsForControls,
    currentSeed, setCurrentSeed, initialSeedForControls, setInitialSeedForControls,
    currentSampler, setCurrentSampler, initialSamplerForControls, setInitialSamplerForControls,
    currentStylePreset, setCurrentStylePreset, initialStylePresetForControls, setInitialStylePresetForControls,
    currentLeonardoPresetStyle, setCurrentLeonardoPresetStyle, initialLeonardoPresetStyleForControls, setInitialLeonardoPresetStyleForControls,
    currentUseAlchemy, setCurrentUseAlchemy, initialUseAlchemyForControls, setInitialUseAlchemyForControls,
    currentUsePhotoReal, setCurrentUsePhotoReal, initialUsePhotoRealForControls, setInitialUsePhotoRealForControls,
    useSearchGrounding, setUseSearchGrounding,
    driveSyncEnabled, 
    isDriveAuthenticated, 
    driveUserEmail, 
    isDriveLoading: isDriveContextLoading, 
    driveError, 
    handleToggleDriveSync, 
    handleDriveSignIn, 
    handleDriveSignOut, 
    logAppEvent
  } = useAppContext();

  const isLoading = appIsLoading || isDriveContextLoading;

  const [themeInput, setThemeInput] = useState<string>(initialThemeForControls);
  const [seedInput, setSeedInput] = useState<string>(initialSeedForControls === undefined ? '' : String(initialSeedForControls));
  const [showPresetManager, setShowPresetManager] = useState<boolean>(false);
  const [showAdvancedGenParams, setShowAdvancedGenParams] = useState<boolean>(false);
  const [suggestedConcepts, setSuggestedConcepts] = useState<string[] | null>(null);
  const [isRemixingConcept, setIsRemixingConcept] = useState<boolean>(false);
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState<boolean>(false);
  const [savedPresets, setSavedPresets] = useState<PresetItem[]>([]);

  const handleRemixConcept = async () => {
    if (!themeInput.trim() || isRemixingConcept || appIsLoading || isPlaying) return;
    setIsRemixingConcept(true);
    logAppEvent('API', 'Remixing concept from Gemini text model.', { concept: themeInput.trim() });
    try {
      const variations = await remixConcept(themeInput.trim());
      setSuggestedConcepts(variations);
      logAppEvent('API', 'Remixed concepts received.', { variations });
    } catch (err: any) {
      logAppEvent('ERROR', 'Failed to remix concept.', { error: err.message });
    } finally {
      setIsRemixingConcept(false);
    }
  };

  const handleEnhancePrompt = async () => {
    if (!themeInput.trim() || isEnhancingPrompt || appIsLoading || isPlaying) return;
    setIsEnhancingPrompt(true);
    logAppEvent('API', 'Enhancing theme/prompt with Gemini text model.', { theme: themeInput.trim() });
    try {
        const enhanced = await enhancePrompt(themeInput.trim());
        if (enhanced && enhanced !== `${themeInput.trim()} (enhancement failed)`) {
            setThemeInput(enhanced);
            setInitialThemeForControls(enhanced);
            logAppEvent('API', 'Concept enhanced successfully.', { original: themeInput.trim(), enhanced });
        } else {
            logAppEvent('WARNING', 'AI prompt enhancement failed or no change.', { theme: themeInput.trim() });
        }
    } catch (err: any) {
        logAppEvent('ERROR', 'Failed to enhance concept/prompt.', { error: err.message });
    } finally {
        setIsEnhancingPrompt(false);
    }
  };

  const handleSavePreset = () => {
    const presetName = window.prompt("Enter a name for this preset:", themeInput.trim().substring(0, 30));
    if (presetName && presetName.trim() !== "") {
      const newPreset: PresetItem = {
        id: `${Date.now()}`,
        name: presetName.trim(),
        concept: themeInput.trim(),
        artStyle: initialArtStyleForControls,
        aspectRatio: initialAspectRatioForControls,
        providerId: selectedImageProvider,
        modelId: selectedModelId,
        negativePrompt: initialNegativePromptForControls.trim(),
        cfgScale: initialCfgScaleForControls,
        steps: initialStepsForControls,
        seed: initialSeedForControls,
        sampler: initialSamplerForControls,
        stylePreset: initialStylePresetForControls,
        leonardoPresetStyle: initialLeonardoPresetStyleForControls,
        useAlchemy: initialUseAlchemyForControls,
        usePhotoReal: initialUsePhotoRealForControls,
      };
      setSavedPresets(prev => [...prev, newPreset]);
      logAppEvent('SYSTEM', 'Preset saved.', { presetName: newPreset.name });
    }
  };

  const onLoadPreset = (preset: PresetItem) => {
    setThemeInput(preset.concept);
    setInitialThemeForControls(preset.concept);
    setCurrentArtStyle(preset.artStyle);
    setInitialArtStyleForControls(preset.artStyle);
    setCurrentAspectRatio(preset.aspectRatio);
    setInitialAspectRatioForControls(preset.aspectRatio);
    // These are already in context, but we need to set them
    // setSelectedImageProvider(preset.providerId);
    // setSelectedModelId(preset.modelId);
    setCurrentNegativePrompt(preset.negativePrompt || "");
    setInitialNegativePromptForControls(preset.negativePrompt || "");
    setCurrentCfgScale(preset.cfgScale ?? DEFAULT_CFG_SCALE);
    setInitialCfgScaleForControls(preset.cfgScale ?? DEFAULT_CFG_SCALE);
    setCurrentSteps(preset.steps ?? DEFAULT_STEPS);
    setInitialStepsForControls(preset.steps ?? DEFAULT_STEPS);
    setCurrentSeed(preset.seed);
    setInitialSeedForControls(preset.seed);
    setCurrentSampler(preset.sampler);
    setInitialSamplerForControls(preset.sampler);
    setCurrentStylePreset(preset.stylePreset);
    setInitialStylePresetForControls(preset.stylePreset);
    setCurrentLeonardoPresetStyle(preset.leonardoPresetStyle);
    setInitialLeonardoPresetStyleForControls(preset.leonardoPresetStyle);
    setCurrentUseAlchemy(preset.useAlchemy ?? false);
    setInitialUseAlchemyForControls(preset.useAlchemy ?? false);
    setCurrentUsePhotoReal(preset.usePhotoReal ?? false);
    setInitialUsePhotoRealForControls(preset.usePhotoReal ?? false);
    logAppEvent('SYSTEM', 'Preset loaded.', { presetName: preset.name });
  };

  const onDeletePreset = (presetId: string) => {
    setSavedPresets(prev => prev.filter(p => p.id !== presetId));
    logAppEvent('SYSTEM', 'Preset deleted.', { presetId });
  };


  const selectedProviderConfig = imageProvidersConfig.find(p => p.id === selectedImageProvider);
  const selectedModelConfig = selectedProviderConfig?.models.find(m => m.id === selectedModelId);
  const availableAspectRatios = selectedModelConfig?.supportedAspectRatios?.length ? selectedModelConfig.supportedAspectRatios : COMMON_ASPECT_RATIOS;

  useEffect(() => { setThemeInput(initialThemeForControls); }, [initialThemeForControls]);

  useEffect(() => {
    if (selectedModelConfig) {
      const currentModelRatios = selectedModelConfig.supportedAspectRatios;
      if (currentModelRatios && currentModelRatios.length > 0 && !currentModelRatios.includes(initialAspectRatioForControls)) {
          const newValidRatio = currentModelRatios[0];
          setCurrentAspectRatio(newValidRatio); setInitialAspectRatioForControls(newValidRatio);
      } else if ((!currentModelRatios || currentModelRatios.length === 0) && initialAspectRatioForControls !== DEFAULT_ASPECT_RATIO && !COMMON_ASPECT_RATIOS.includes(initialAspectRatioForControls)) {
          setCurrentAspectRatio(DEFAULT_ASPECT_RATIO); setInitialAspectRatioForControls(DEFAULT_ASPECT_RATIO);
      }
    }
  }, [initialAspectRatioForControls, selectedModelConfig, setCurrentAspectRatio, setInitialAspectRatioForControls]);

  useEffect(() => { setSeedInput(initialSeedForControls === undefined ? '' : String(initialSeedForControls)); }, [initialSeedForControls]);


  const handleThemeChange = (event: React.ChangeEvent<HTMLInputElement>) => setThemeInput(event.target.value);
  const handleNegativePromptInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setCurrentNegativePrompt(newValue);
    setInitialNegativePromptForControls(newValue);
  };
  const handleConceptSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newTheme = event.target.value;
    setThemeInput(newTheme);
    setInitialThemeForControls(newTheme); 
    logAppEvent('INFO', 'Concept selected from dropdown.', { concept: newTheme });
  };
  const handleArtStyleSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newStyle = event.target.value;
    setCurrentArtStyle(newStyle);
    setInitialArtStyleForControls(newStyle);
    logAppEvent('INFO', 'Art style selected.', { artStyle: newStyle });
  };
  const handleAspectRatioSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newRatio = event.target.value;
    setCurrentAspectRatio(newRatio);
    setInitialAspectRatioForControls(newRatio);
    logAppEvent('INFO', 'Aspect ratio selected.', { aspectRatio: newRatio });
  };

  const handleSeedUiChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = event.target.value;
    setSeedInput(valStr);
    const valNum = parseInt(valStr, 10);
    const seedToSet = isNaN(valNum) || valStr.trim() === '' ? undefined : valNum;
    setCurrentSeed(seedToSet); setInitialSeedForControls(seedToSet);
  };

  const handleCfgScaleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(event.target.value);
    setInitialCfgScaleForControls(val);
    setCurrentCfgScale(val);
  };
  const handleStepsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(event.target.value, 10);
    setInitialStepsForControls(val);
    setCurrentSteps(val);
  };
  const handleSamplerChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const val = event.target.value;
    setInitialSamplerForControls(val);
    setCurrentSampler(val);
  };
  const handleStylePresetChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const val = event.target.value;
    setInitialStylePresetForControls(val);
    setCurrentStylePreset(val);
  };
  const handleLeonardoPresetChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const val = event.target.value;
    setInitialLeonardoPresetStyleForControls(val);
    setCurrentLeonardoPresetStyle(val);
  };
  const handleAlchemyToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const val = event.target.checked;
    setInitialUseAlchemyForControls(val);
    setCurrentUseAlchemy(val);
  };
  const handlePhotoRealToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const val = event.target.checked;
    setInitialUsePhotoRealForControls(val);
    setCurrentUsePhotoReal(val);
  };


  const handleStartClick = () => {
    if (themeInput.trim()) {
      const seedNum = parseInt(seedInput, 10);
      onStart(themeInput.trim(), initialArtStyleForControls, initialAspectRatioForControls, initialNegativePromptForControls.trim(),
              initialCfgScaleForControls, initialStepsForControls, isNaN(seedNum) ? undefined : seedNum, 
              initialSamplerForControls, initialStylePresetForControls, initialLeonardoPresetStyleForControls, 
              initialUseAlchemyForControls, initialUsePhotoRealForControls);
    }
  };
  const handleGenerateSingleClick = () => {
    if (themeInput.trim() && !isLoading && !isPlaying && !isProcessingLiveQuery) {
      const seedNum = parseInt(seedInput, 10);
      onGenerateSingle(themeInput.trim(), initialArtStyleForControls, initialAspectRatioForControls, initialNegativePromptForControls.trim(),
                       initialCfgScaleForControls, initialStepsForControls, isNaN(seedNum) ? undefined : seedNum, 
                       initialSamplerForControls, initialStylePresetForControls, initialLeonardoPresetStyleForControls,
                       initialUseAlchemyForControls, initialUsePhotoRealForControls);
    }
  };
  const handleLiveQueryClick = () => {
    if (!isLoading && !isPlaying && !isProcessingLiveQuery) {
        onLiveQueryStart();
    }
  };

  const isAnyLoading = isLoading || isPlaying || isRemixingConcept || isEnhancingPrompt || isProcessingLiveQuery;
  const isThemeInputDisabled = isAnyLoading;

  const handleSaveConceptClick = () => { if (themeInput.trim()) onSaveConcept(themeInput.trim()); };
  const handleRemixClick = () => { if (themeInput.trim() && !isAnyLoading) handleRemixConcept(); };
  const handleEnhanceConceptClick = () => { if (themeInput.trim() && !isAnyLoading) handleEnhancePrompt(); };
  const onSelectSuggestedConcept = (concept: string) => {
    setThemeInput(concept);
    setInitialThemeForControls(concept);
    setSuggestedConcepts(null);
    logAppEvent('INFO', 'User selected a suggested concept.', { concept });
    };

  const handleSavePresetClick = () => {
    const presetData = {
      concept: themeInput.trim(), 
      artStyle: initialArtStyleForControls,
      aspectRatio: initialAspectRatioForControls,
      providerId: selectedImageProvider,
      modelId: selectedModelId,
      negativePrompt: initialNegativePromptForControls.trim(),
      cfgScale: initialCfgScaleForControls,
      steps: initialStepsForControls,
      seed: initialSeedForControls,
      sampler: initialSamplerForControls,
      stylePreset: initialStylePresetForControls,
      leonardoPresetStyle: initialLeonardoPresetStyleForControls,
      useAlchemy: initialUseAlchemyForControls,
      usePhotoReal: initialUsePhotoRealForControls,
    };
    handleSavePreset(presetData);
  };

  const isSaveDisabled = isAnyLoading || !themeInput.trim() || predefinedConcepts.includes(themeInput.trim()) || userSavedConcepts.includes(themeInput.trim());
  const isRemixDisabled = isAnyLoading || !themeInput.trim();
  const isEnhanceDisabled = isAnyLoading || !themeInput.trim();
  const isGenerateSingleDisabled = isAnyLoading || !themeInput.trim();
  const isLiveQueryDisabled = isAnyLoading || !themeInput.trim();
  const isSavePresetDisabled = isAnyLoading || !themeInput.trim();

  const showSeedInput = selectedProviderConfig?.id === 'stability_ai' ||
                        selectedProviderConfig?.id === 'replicate' ||
                        selectedProviderConfig?.id === 'leonardo_ai' ||
                        selectedProviderConfig?.id === 'black_forest'; 

  const showCfgScaleSlider = selectedModelConfig?.defaultCfgScale !== undefined;
  const showStepsSlider = selectedModelConfig?.defaultSteps !== undefined;
  const showSamplerDropdown = selectedModelConfig?.availableSamplers && selectedModelConfig.availableSamplers.length > 0;
  const showStylePresetDropdown = selectedModelConfig?.availableStylePresets && selectedModelConfig.availableStylePresets.length > 0;
  const showLeonardoPresetDropdown = selectedModelConfig?.availableLeonardoPresetStyles && selectedModelConfig.availableLeonardoPresetStyles.length > 0;
  const showAlchemyCheckbox = selectedModelConfig?.supportsAlchemy;
  const showPhotoRealCheckbox = selectedModelConfig?.supportsPhotoReal;
  
  const showAnyAdvancedGenParam = showCfgScaleSlider || showStepsSlider || showSamplerDropdown || showStylePresetDropdown || showLeonardoPresetDropdown || showAlchemyCheckbox || showPhotoRealCheckbox;


  return (
    <div className="space-y-3 text-sm controls-drawer-content">
      <div>
        <label htmlFor="theme-input" className="block text-xs font-medium text-gray-300 mb-0.5">Theme / Concept</label>
        <input
          type="text"
          id="theme-input"
          value={themeInput}
          onChange={handleThemeChange}
          onBlur={() => {setInitialThemeForControls(themeInput.trim()); logAppEvent('INFO', "Theme input blurred, updated initial value for controls.", {theme: themeInput.trim()});}}
          placeholder="e.g., Cosmic jellyfish ballet"
          className="w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:ring-1 focus:ring-gray-500 outline-none transition-colors"
          disabled={isThemeInputDisabled}
          aria-label="Enter theme or concept for image generation"
        />
      </div>

      {suggestedConcepts && suggestedConcepts.length > 0 && (
        <div className="p-2 bg-gray-700/70 rounded-md">
          <p className="text-xs text-gray-300 mb-1">Suggestions based on "{themeInput.substring(0,25)}{themeInput.length > 25 ? "..." : ""}":</p>
          <ul className="space-y-1">
            {suggestedConcepts.map(concept => (
              <li key={concept}>
                <button
                  onClick={() => onSelectSuggestedConcept(concept)}
                  className="w-full text-left text-xs px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-gray-200 transition-colors"
                  aria-label={`Select suggested concept: ${concept}`}
                >
                  {concept}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex space-x-1.5">
        <button onClick={handleSaveConceptClick} disabled={isSaveDisabled} className="flex-1 px-2 py-1.5 bg-gray-600 hover:bg-gray-500 text-white font-medium rounded-md text-xs disabled:opacity-60 disabled:cursor-not-allowed" title="Save current concept to your list">Save Concept</button>
        <button onClick={handleRemixClick} disabled={isRemixDisabled} className="flex-1 px-2 py-1.5 bg-gray-600 hover:bg-gray-500 text-white font-medium rounded-md text-xs disabled:opacity-60 disabled:cursor-not-allowed" title="Generate variations of the current concept">
          {isRemixingConcept ? 'Remixing...' : 'Remix Concept'}
        </button>
        <button onClick={handleEnhanceConceptClick} disabled={isEnhanceDisabled} className="flex-1 px-2 py-1.5 bg-gray-600 hover:bg-gray-500 text-white font-medium rounded-md text-xs disabled:opacity-60 disabled:cursor-not-allowed" title="Enhance current concept using AI">
          {isEnhancingPrompt ? 'Enhancing...' : 'Enhance'}
        </button>
      </div>
      <div className="flex space-x-1.5">
        <button onClick={onRandomize} disabled={isAnyLoading} className="flex-1 px-2 py-1.5 bg-gray-600 hover:bg-gray-500 text-white font-medium rounded-md text-xs disabled:opacity-60 disabled:cursor-not-allowed" title="Randomize theme and art style">Shuffle</button>
         <button onClick={handleLiveQueryClick} disabled={isLiveQueryDisabled} className="flex-1 px-2 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-md text-xs disabled:opacity-60 disabled:cursor-not-allowed" title="Use camera to generate image and query">
            {isProcessingLiveQuery ? 'Processing...' : 'Live Query'}
        </button>
      </div>


      <div>
        <label htmlFor="concept-select" className="block text-xs font-medium text-gray-300 mb-0.5">Load Concept</label>
        <select id="concept-select" onChange={handleConceptSelect} value={themeInput} className="w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:ring-1 focus:ring-gray-500 outline-none transition-colors" disabled={isThemeInputDisabled} aria-label="Select a predefined or saved concept">
          <option value="" disabled>Select a concept...</option>
          <optgroup label="Predefined">
            {predefinedConcepts.map(concept => <option key={concept} value={concept}>{concept}</option>)}
          </optgroup>
          {userSavedConcepts.length > 0 && (
            <optgroup label="My Saved Concepts">
              {userSavedConcepts.map(concept => <option key={concept} value={concept}>{concept}</option>)}
            </optgroup>
          )}
        </select>
      </div>

      <div>
        <label htmlFor="art-style-select" className="block text-xs font-medium text-gray-300 mb-0.5">Art Style</label>
        <select id="art-style-select" value={initialArtStyleForControls} onChange={handleArtStyleSelect} className="w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:ring-1 focus:ring-gray-500 outline-none transition-colors" disabled={isThemeInputDisabled} aria-label="Select an art style">
          {ART_STYLES.map(category => (
            <optgroup key={category.categoryName} label={category.categoryName}>
              {category.styles.map(style => <option key={style} value={style}>{style}</option>)}
            </optgroup>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="aspect-ratio-select" className="block text-xs font-medium text-gray-300 mb-0.5">Aspect Ratio</label>
        <select id="aspect-ratio-select" value={initialAspectRatioForControls} onChange={handleAspectRatioSelect} className="w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:ring-1 focus:ring-gray-500 outline-none transition-colors" disabled={isThemeInputDisabled || (availableAspectRatios.length <= 1 && availableAspectRatios.length !== 0)} aria-label="Select aspect ratio">
          {(availableAspectRatios.length > 0 ? availableAspectRatios : COMMON_ASPECT_RATIOS).map(ratio => (
            <option key={ratio} value={ratio}>{ratio}</option>
          ))}
        </select>
        {selectedModelConfig && (!selectedModelConfig.supportedAspectRatios || selectedModelConfig.supportedAspectRatios.length === 0) && (
            <p className="text-xs text-gray-400 mt-0.5">This model's aspect ratios are flexible or use a default. Common options shown.</p>
        )}
      </div>
      
      <div>
        <label htmlFor="negative-prompt-input" className="block text-xs font-medium text-gray-300 mb-0.5">Negative Prompt (Optional)</label>
        <input
          type="text"
          id="negative-prompt-input"
          value={initialNegativePromptForControls}
          onChange={handleNegativePromptInputChange}
          placeholder="e.g., blurry, text, watermark"
          className="w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:ring-1 focus:ring-gray-500 outline-none transition-colors"
          disabled={isThemeInputDisabled}
          aria-label="Enter negative prompt to exclude elements from image"
        />
      </div>

      {showSeedInput && (
        <div>
          <label htmlFor="seed-input" className="block text-xs font-medium text-gray-300 mb-0.5">Seed (Optional)</label>
          <input
            type="number"
            id="seed-input"
            value={seedInput}
            onChange={handleSeedUiChange}
            placeholder="Enter a number or leave blank for random"
            min="0"
            step="1"
            className="w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:ring-1 focus:ring-gray-500 outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            disabled={isThemeInputDisabled}
            aria-label="Enter seed for image generation or leave blank for random"
          />
        </div>
      )}
      
      {showAnyAdvancedGenParam && (
        <div className="mt-3 pt-3 border-t border-gray-700/50">
            <button
                onClick={() => setShowAdvancedGenParams(!showAdvancedGenParams)}
                className="w-full px-3 py-1.5 bg-gray-600/70 hover:bg-gray-500/80 text-white font-medium rounded-md text-xs flex items-center justify-between"
                aria-expanded={showAdvancedGenParams}
                aria-controls="advanced-gen-params-content"
            >
                <span>Advanced Generation Parameters</span>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transform transition-transform ${showAdvancedGenParams ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {showAdvancedGenParams && (
                <div id="advanced-gen-params-content" className="mt-2 p-2.5 bg-gray-700/50 rounded-md space-y-3">
                    {showCfgScaleSlider && (
                        <div>
                            <label htmlFor="cfg-scale-slider" className="block text-xs font-medium text-gray-300 mb-0.5">CFG Scale: <span className="text-gray-400">{initialCfgScaleForControls.toFixed(1)}</span></label>
                            <input type="range" id="cfg-scale-slider" min="1" max="20" step="0.5" value={initialCfgScaleForControls} onChange={handleCfgScaleChange} disabled={isThemeInputDisabled} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-60"/>
                        </div>
                    )}
                    {showStepsSlider && (
                        <div>
                            <label htmlFor="steps-slider" className="block text-xs font-medium text-gray-300 mb-0.5">Steps: <span className="text-gray-400">{initialStepsForControls}</span></label>
                            <input type="range" id="steps-slider" min="10" max="150" step="1" value={initialStepsForControls} onChange={handleStepsChange} disabled={isThemeInputDisabled} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-60"/>
                        </div>
                    )}
                    {showSamplerDropdown && selectedModelConfig?.availableSamplers && (
                        <div>
                            <label htmlFor="sampler-select" className="block text-xs font-medium text-gray-300 mb-0.5">Sampler</label>
                            <select id="sampler-select" value={initialSamplerForControls || ""} onChange={handleSamplerChange} disabled={isThemeInputDisabled} className="w-full p-2 text-xs border border-gray-600 rounded-md bg-gray-700 text-white focus:ring-1 focus:ring-gray-500 outline-none disabled:opacity-60">
                                {selectedModelConfig.availableSamplers.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    )}
                    {showStylePresetDropdown && selectedModelConfig?.availableStylePresets && (
                         <div>
                            <label htmlFor="style-preset-select" className="block text-xs font-medium text-gray-300 mb-0.5">Style Preset</label>
                            <select id="style-preset-select" value={initialStylePresetForControls || ""} onChange={handleStylePresetChange} disabled={isThemeInputDisabled} className="w-full p-2 text-xs border border-gray-600 rounded-md bg-gray-700 text-white focus:ring-1 focus:ring-gray-500 outline-none disabled:opacity-60">
                                {selectedModelConfig.availableStylePresets.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    )}
                    {showLeonardoPresetDropdown && selectedModelConfig?.availableLeonardoPresetStyles && (
                         <div>
                            <label htmlFor="leo-preset-select" className="block text-xs font-medium text-gray-300 mb-0.5">Leonardo Preset</label>
                            <select id="leo-preset-select" value={initialLeonardoPresetStyleForControls || "NONE"} onChange={handleLeonardoPresetChange} disabled={isThemeInputDisabled} className="w-full p-2 text-xs border border-gray-600 rounded-md bg-gray-700 text-white focus:ring-1 focus:ring-gray-500 outline-none disabled:opacity-60">
                                {selectedModelConfig.availableLeonardoPresetStyles.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    )}
                    {showAlchemyCheckbox && (
                        <div className="flex items-center">
                            <input type="checkbox" id="alchemy-toggle" checked={initialUseAlchemyForControls} onChange={handleAlchemyToggle} disabled={isThemeInputDisabled} className="h-4 w-4 text-blue-500 border-gray-500 rounded bg-gray-600 focus:ring-blue-400 disabled:opacity-60" />
                            <label htmlFor="alchemy-toggle" className="ml-2 text-xs font-medium text-gray-300">Use Alchemy (Leonardo.Ai)</label>
                        </div>
                    )}
                    {showPhotoRealCheckbox && (
                        <div className="flex items-center">
                            <input type="checkbox" id="photoreal-toggle" checked={initialUsePhotoRealForControls} onChange={handlePhotoRealToggle} disabled={isThemeInputDisabled} className="h-4 w-4 text-blue-500 border-gray-500 rounded bg-gray-600 focus:ring-blue-400 disabled:opacity-60" />
                            <label htmlFor="photoreal-toggle" className="ml-2 text-xs font-medium text-gray-300">Use PhotoReal (Leonardo.Ai)</label>
                        </div>
                    )}
                </div>
            )}
        </div>
      )}


      <div className="mt-3 pt-3 border-t border-gray-700/50">
         <button
            onClick={() => setShowPresetManager(!showPresetManager)}
            className="w-full px-3 py-1.5 bg-gray-600/70 hover:bg-gray-500/80 text-white font-medium rounded-md text-xs flex items-center justify-between"
            aria-expanded={showPresetManager}
            aria-controls="preset-manager-content"
          >
            <span>Presets Manager</span>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transform transition-transform ${showPresetManager ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showPresetManager && (
            <div id="preset-manager-content" className="mt-2 p-2 bg-gray-700/50 rounded-md space-y-2">
              <button onClick={handleSavePresetClick} disabled={isSavePresetDisabled} className="w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-md text-xs disabled:opacity-60 disabled:cursor-not-allowed">
                Save Current as Preset
              </button>
              {savedPresets.length > 0 ? (
                <ul className="max-h-32 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-600/70">
                  {savedPresets.map(preset => (
                    <li key={preset.id} className="flex justify-between items-center p-1.5 bg-gray-600/50 rounded">
                      <span className="text-xs text-gray-300 truncate" title={preset.name}>{preset.name}</span>
                      <div className="flex space-x-1">
                        <button onClick={() => onLoadPreset(preset)} disabled={isAnyLoading} className="px-1.5 py-0.5 bg-gray-500 hover:bg-gray-400 text-xs rounded disabled:opacity-60">Load</button>
                        <button onClick={() => onDeletePreset(preset.id)} disabled={isAnyLoading} className="px-1.5 py-0.5 bg-red-600 hover:bg-red-500 text-xs rounded disabled:opacity-60">Del</button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-400 text-center">No saved presets yet.</p>
              )}
            </div>
          )}
      </div>


      <div className="flex space-x-2 mt-4">
        <button
          onClick={handleStartClick}
          disabled={isPlaying || isLoading || !themeInput.trim()}
          className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-md shadow-md transition-all duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed start-stop-button"
          aria-label="Start continuous image generation"
        >
          {isPlaying ? 'Evolving...' : 'Start Evolving'}
        </button>
        <button
          onClick={onStop}
          disabled={!isPlaying}
          className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-md shadow-md transition-all duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label="Stop continuous image generation"
        >
          Stop
        </button>
      </div>
      <button
          onClick={handleGenerateSingleClick}
          disabled={isGenerateSingleDisabled}
          className="w-full mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-md shadow-md transition-all duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed generate-button"
          aria-label="Generate a single image"
        >
          {isLoading && !isPlaying ? 'Generating...' : 'Generate Single Image'}
      </button>

      <div className="mt-4 pt-4 border-t border-gray-700/50 space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="drive-sync-toggle" className="text-xs font-medium text-gray-300">Google Drive Sync</label>
          <button
            id="drive-sync-toggle"
            onClick={handleToggleDriveSync}
            disabled={isDriveContextLoading}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${driveSyncEnabled ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-600 hover:bg-gray-500'} ${isDriveContextLoading ? 'opacity-50 cursor-wait' : ''}`}
            aria-pressed={driveSyncEnabled}
          >
            {driveSyncEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
        {driveSyncEnabled && !isDriveAuthenticated && !isDriveContextLoading && !driveError && (
          <button onClick={handleDriveSignIn} className="w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-md text-xs">Sign In with Google Drive</button>
        )}
        {isDriveContextLoading && <p className="text-xs text-gray-400 text-center">Connecting to Drive...</p>}
        {driveError && <p className="text-xs text-red-400 bg-red-800/30 p-1.5 rounded-md break-words">{driveError}</p>}
        {driveSyncEnabled && isDriveAuthenticated && (
          <div className="text-xs text-gray-400">
            <p>Syncing to: <span className="text-gray-300 truncate">{driveUserEmail}</span></p>
            <button onClick={handleDriveSignOut} className="mt-1 text-blue-400 hover:text-blue-300 underline">Sign Out from Drive</button>
          </div>
        )}
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-700/50 flex items-center justify-between">
          <label htmlFor="search-grounding-toggle" className="text-xs font-medium text-gray-300">Search Grounding (Gemini)</label>
          <button
            id="search-grounding-toggle"
            onClick={() => setUseSearchGrounding(!useSearchGrounding)}
            disabled={isAnyLoading}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${useSearchGrounding ? 'bg-sky-600 hover:bg-sky-500' : 'bg-gray-600 hover:bg-gray-500'} ${isAnyLoading ? 'opacity-50 cursor-wait' : ''}`}
            aria-pressed={useSearchGrounding}
            title={useSearchGrounding ? "Disable Google Search grounding for theme/prompt generation" : "Enable Google Search grounding for theme/prompt generation (Gemini Text Model)"}
          >
            {useSearchGrounding ? 'ON' : 'OFF'}
          </button>
      </div>
      {useSearchGrounding && <p className="text-[10px] text-gray-400 mt-1">When ON, Gemini may use Google Search for more current or specific themes. This disables JSON output mode for theme generation.</p>}


      <button
        onClick={onOpenAdvancedSettings}
        className="w-full mt-4 px-4 py-2 bg-gray-600/70 hover:bg-gray-500/80 text-white font-medium rounded-md text-xs"
        aria-label="Open advanced settings and logs"
      >
        Advanced Settings & Logs
      </button>
    </div>
  );
};

export default Controls;
