import { ImageProviderSetting, ArtStyleCategory, ChatProviderSetting, ChatConfig } from './types';

export const PREDEFINED_CONCEPTS: string[] = [
  "Abstract flowing energy",
  "Cosmic jellyfish ballet",
  "Ephemeral sand castles",
  "Whispers of forgotten dunes",
  "Celestial aquatic gardens",
  "Mechanical flora",
  "Sentient crystal formations",
  "Dreaming machines",
  "Symphony of shattered glass",
  "Bio-luminescent fungi forest",
  "Quantum entanglement visualised",
  "Cityscapes of pure light",
  "Submerged ancient ruins",
  "Nebulae birthing stars",
  "The texture of a black hole",
  "Alien cartography",
  "Frozen moments in time",
  "Metamorphic landscapes",
  "Symbiotic technology",
  "Whispering desert winds",
  "Aurora borealis on alien worlds",
  "Coral reefs of the sky",
  "Data streams in nature",
  "Echoes of a lost civilization",
  "Floating islands of jade",
  "Gardens of petrified light",
  "Haunted underwater cathedrals",
  "Ice sculptures by cosmic rays",
  "Journeys through inner space",
  "Keys to unseen doors",
  "Labyrinths of the mind",
  "Mountains made of song",
  "Networks of mycelial thought",
  "Oceans of liquid methane",
  "Portals to other dimensions",
  "Quasars in bloom",
  "Rivers of molten gold",
  "Sculptures of pure emotion",
  "Temples of the void",
  "Underwater volcanic vents",
  "Vanishing points of reality",
  "Webs of interconnected souls",
  "Xenomorphic gardens",
  "Yearning of distant stars",
  "Zephyrs carrying ancient secrets",
  "Architectures of dreams",
  "Bio-digital interfaces",
  "Chronosynclastic infundibula",
  "Dancing shadows in moonlight",
  "Ethereal beings of mist",
  "Fractal patterns in snowflakes",
  "Glimpses of the multiverse",
  "Holographic memories",
  "Infinite reflections",
  "Jeweled caves of starlight",
  "Kinetic sand mandalas",
  "Libraries of silent knowledge",
  "Mystic pathways through forests",
  "Nomadic cloud formations",
  "Obsidian mirrors to the soul",
  "Phantom islands on horizon",
  "Quietude of deep space",
  "Rhythms of planetary orbits",
  "Silent songs of ancient trees",
  "Topography of desire",
  "Unseen colors of the universe",
  "Vortex of swirling nebulae",
  "Whispers from the quantum foam",
  "Xylotheque of alien trees",
  "Yesterdays that never were",
  "Zones of temporal distortion",
  "Aetherial plains",
  "Breathing landscapes",
  "Chrono-architectures",
  "Dimensional rifts",
  "Echoing caverns of thought",
  "Fluorescent mineral veins",
  "Geometries of silence",
  "Hyper-dimensional origami",
  "Illusory oases",
  "Jubilant cosmic dust",
  "Kaleidoscopic realities",
  "Lunar tides on psychic shores",
  "Morphic resonance fields",
  "Nebulous forms in twilight",
  "Orbital dance of celestial bodies",
  "Pulsating energy grids",
  "Quivering membranes of existence",
  "Resonant frequencies of crystals",
  "Shifting sands of perception",
  "Translucent biological structures",
  "Umbral depths of consciousness",
  "Vibrational patterns in starlight",
  "Woven tapestries of fate",
  "Xenobiological ecosystems",
  "Yggdrasil's cosmic roots",
  "Zenith of a forgotten sun",
  "Algorithmic tapestries",
  "Bio-mechanical symphonies",
  "Crystalline nervous systems",
  "Data-driven auroras",
  "Echos of primordial code",
  "Fluidic architecture",
  "Ghostly algorithms",
  "Hyper-dimensional flora",
  "Impossible geometries",
  "Jungian archetypes in flux",
  "Kinetic cloudscapes",
  "Luminescent data streams",
  "Mnemonic landscapes",
  "Neural network dreams",
  "Optical illusions in nature",
  "Psychic weather patterns",
  "Quantum foam gardens",
  "Resonant echoes of creation",
  "Sentient nebulae",
  "Temporal echoes made visible",
  "Unfolding fractal realities",
  "Void-bound leviathans",
  "Whispers of the noosphere",
  "Xeno-archaeological findings",
  "Yearning for cosmic unity",
  "Zero-point energy fields"
];

export const ART_STYLES: ArtStyleCategory[] = [
  {
    categoryName: "Core & General",
    styles: [
      "Default (AI Decides)",
      "Photorealistic",
      "Cinematic Lighting",
      "Minimalist",
    ],
  },
  {
    categoryName: "Painting & Drawing",
    styles: [
      "Impressionistic",
      "Expressionistic",
      "Watercolor Painting",
      "Oil Painting",
      "Gouache Painting",
      "Acrylic Painting",
      "Hand-drawn Sketch",
      "Stipple Art",
      "Cross-hatching Sketch",
      "Sgraffito",
      "Chalk Art",
    ],
  },
  {
    categoryName: "Historical & Cultural Movements",
    styles: [
      "Renaissance Art",
      "Baroque",
      "Rococo",
      "Neoclassicism",
      "Romanticism",
      "Art Nouveau",
      "Art Deco",
      "Bauhaus Style",
      "Cubism",
      "Futurism",
      "Surrealism",
      "Abstract Expressionism",
      "Pop Art",
      "Modern Art",
      "Gothic Art",
      "Symbolism",
      "Fauvism",
      "De Stijl (Neoplasticism)",
      "Constructivism",
      "Suprematism",
      "Dadaism",
      "Ukiyo-e (Japanese Woodblock)",
      "Tribal Art",
    ],
  },
  {
    categoryName: "Photographic Styles & Techniques",
    styles: [
      "Vintage Photography (Sepia)",
      "Film Noir",
      "Long Exposure Photography",
      "Macro Photography",
      "Infrared Photography",
      "Tilt-Shift Photography",
      "Drone Photography",
      "Pinhole Camera Aesthetic",
      "Lomography / Lomo Effect",
      "iPhone Photography Aesthetic",
      "Double Exposure",
    ],
  },
  {
    categoryName: "Iconic Cameras & Film Stocks",
    styles: [
      "Hasselblad Look (Medium Format Depth)",
      "Leica M-series Look (Street Photography Classic)",
      "Canon L-series Lens Look (Sharp & Creamy Bokeh)",
      "Vintage Polaroid Look",
      "Kodachrome Film Stock Look",
      "Ektachrome Film Stock Look (Vibrant & Cool)",
      "Ilford HP5 Plus Film Stock Look (Classic B&W)",
      "Fujifilm Velvia Film Stock Look (Saturated Landscape)",
      "Cinestill 800T Film Stock Look (Tungsten Halation)",
      "Daguerreotype Style",
      "Ambrotype Style",
      "Albumen Print Look",
    ],
  },
  {
    categoryName: "Digital, Abstract & Geometric",
    styles: [
      "Abstract",
      "Pixel Art",
      "Voxel Art",
      "Low Poly",
      "Glitch Art",
      "Holographic",
      "Geometric Patterns",
      "Kinetic Art",
      "Op Art (Optical Art)",
      "Biomorphic Abstraction",
    ],
  },
  {
    categoryName: "Thematic & Conceptual Styles",
    styles: [
      "Steampunk",
      "Cyberpunk",
      "Solarpunk",
      "Dieselpunk",
      "Retro (80s Synthwave)",
      "Fantasy Art",
      "Sci-Fi Concept Art",
      "Blueprint Schematics",
    ],
  },
  {
    categoryName: "Unique Craft & Other Styles",
    styles: [
      "Cartoon Style",
      "Anime / Manga Style",
      "Stained Glass Window",
      "Mosaic Art",
      "Origami Style",
      "Claymation Style",
      "Tattoo Art Style",
      "Paper Quilling Art",
      "Street Art / Graffiti",
      "Lowbrow Art (Pop Surrealism)",
      "Anaglyph 3D Effect",
      "Thermal Imaging Effect",
      "X-Ray Effect",
    ],
  },
];

export const DEFAULT_ART_STYLE: string = ART_STYLES.length > 0 && ART_STYLES[0].styles.length > 0 ? ART_STYLES[0].styles[0] : "Default (AI Decides)";
export const DEFAULT_ASPECT_RATIO = '1:1';
export const FLEXIBLE_COMMON_ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '5:4', '4:5'];
export const WIDESCREEN_ULTRAWIDE_ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '21:9', '9:21', '5:4', '4:5'];
export const COMMON_ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3'];

export const REPLICATE_UPSCALER_MODEL_ID = "nightmareai/real-esrgan";
export const REPLICATE_UPSCALER_VERSION_ID = "42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b";
export const CLIPDROP_MODEL_ID_UPSCALE = "clipdrop-upscale-auto"; 
export const CLIPDROP_MODEL_ID_INPAINT = "clipdrop-inpaint";


export const STABILITY_SD3_STYLE_PRESETS = [
    'photographic', 'digital-art', 'cinematic', 'anime', 'comic-book', 'fantasy-art', 
    'analog-film', 'neon-punk', 'isometric', 'low-poly', 'origami', 'line-art', 
    'craft-clay', 'pixel-art', 'texture', 'graffiti', 'impressionist', 'expressionist', 
    'watercolor', 'oil painting', 'pen and ink'
];
export const STABILITY_SAMPLERS = [
    'DDIM', 'DDPM', 'K_DPMPP_2M', 'K_DPMPP_SDE', 'K_DPMPP_2S_ANCESTRAL', 'K_DPM_2', 
    'K_DPM_2_ANCESTRAL', 'K_EULER', 'K_EULER_ANCESTRAL', 'K_HEUN', 'K_LMS'
];
export const LEONARDO_PRESET_STYLES = [
    "NONE", "LEONARDO", "CINEMATIC", "CREATIVE", "VIBRANT", "PORTRAIT", "SKETCH_BW", "3D_RENDERING", 
    "RAYTRACED", "ANIME", "DYNAMIC", "ENVIRONMENT", "FANTASY_ART", "ILLUSTRATION", 
    "PHOTOGRAPHY", "PRODUCT", "RETRO", "SCI_FI", "CONCEPT_ART", "TEXTURE", "FOOD", "NEUTRAL"
];

// Default generation parameters
export const DEFAULT_CFG_SCALE = 7;
export const DEFAULT_STEPS = 30;
export const DEFAULT_SEED = undefined; // Or a specific number like 0 if you prefer a consistent "random"


export const IMAGE_PROVIDERS_STATIC: ImageProviderSetting[] = [
  {
    id: 'gemini',
    displayName: 'Google Gemini',
    requiresApiKey: false, 
    isDynamic: false,
    models: [
      { 
        id: 'imagen-3.0-generate-002', 
        displayName: 'Imagen 3', 
        supportsNegativePrompt: true,
        supportedAspectRatios: ['1:1'], 
        type: 'image_generation',
        defaultCfgScale: DEFAULT_CFG_SCALE, 
        defaultSteps: DEFAULT_STEPS,  
      }
    ]
  },
  {
    id: 'fal_ai',
    displayName: 'Fal AI (Real-time & Tools)',
    requiresApiKey: true,
    apiKeyLabel: 'Fal AI Auth Token',
    apiKeyManagementUrl: 'https://fal.ai/dashboard/keys',
    isDynamic: false, 
    models: [
      { 
        id: 'fal-ai/fast-sdxl', 
        displayName: 'Fast SDXL (Real-time)', 
        supportsNegativePrompt: true, 
        supportedAspectRatios: COMMON_ASPECT_RATIOS, 
        baseDimension: 1024, 
        type: 'image_generation',
        defaultCfgScale: DEFAULT_CFG_SCALE, 
        defaultSteps: 30,  
      },
      { id: 'fal-ai/ip-adapter', displayName: 'IP-Adapter (Fal)', type: 'image_to_image', supportsImageToImage: true },
      { id: 'fal-ai/controlnet-canny', displayName: 'ControlNet Canny (Fal)', type: 'image_to_image', supportsImageToImage: true },
      { id: 'fal-ai/controlnet-depth', displayName: 'ControlNet Depth (Fal)', type: 'image_to_image', supportsImageToImage: true },
      { id: 'fal-ai/controlnet-pose', displayName: 'ControlNet Pose (Fal)', type: 'image_to_image', supportsImageToImage: true },
      { id: 'fal-ai/llava-next', displayName: 'LLaVA Image Description (Fal)', type: 'image_to_image' /* Or custom type */ },
      { id: 'fal-ai/stable-video-diffusion', displayName: 'Stable Video Diffusion (Fal)', type: 'video'},
      { id: 'fal-ai/audiogen', displayName: 'AudioGen (Fal)', type: 'audio' }
    ]
  },
  {
    id: 'stability_ai',
    displayName: 'Stability AI',
    requiresApiKey: true,
    apiKeyLabel: 'Stability AI API Key',
    apiKeyManagementUrl: 'https://platform.stability.ai/account/keys',
    isDynamic: true, 
    models: [ 
      { 
        id: 'stable-diffusion-3-medium', 
        displayName: 'Stable Diffusion 3 Medium', 
        supportsNegativePrompt: true,
        supportedAspectRatios: ['1:1', '16:9', '9:16', '21:9', '9:21', '2:3', '3:2', '4:5', '5:4'], 
        type: 'image_generation',
        defaultCfgScale: 4.5, 
        defaultSteps: 28,     
        availableStylePresets: STABILITY_SD3_STYLE_PRESETS,
      },
      { 
        id: 'stable-diffusion-xl-1024-v1-0', 
        displayName: 'Stable Diffusion XL 1.0', 
        supportsNegativePrompt: true,
        supportedAspectRatios: WIDESCREEN_ULTRAWIDE_ASPECT_RATIOS,
        baseDimension: 1024,
        type: 'image_generation',
        defaultCfgScale: DEFAULT_CFG_SCALE,
        defaultSteps: DEFAULT_STEPS,
        availableSamplers: STABILITY_SAMPLERS,
      },
    ]
  },
  {
    id: 'black_forest',
    displayName: 'Black Forest Labs',
    requiresApiKey: true,
    apiKeyLabel: 'Black Forest Labs API Key',
    apiKeyManagementUrl: 'https://console.blackforestlabs.ai/',
    isDynamic: false,
    models: [
      { 
        id: 'flux-1-pro', 
        displayName: 'FLUX.1 Pro', 
        supportsNegativePrompt: true,
        supportedAspectRatios: WIDESCREEN_ULTRAWIDE_ASPECT_RATIOS, 
        baseDimension: 1024,
        type: 'image_generation',
        defaultCfgScale: DEFAULT_CFG_SCALE, 
        defaultSteps: DEFAULT_STEPS,   
      }, 
      { 
        id: 'flux-1-dev', 
        displayName: 'FLUX.1 Dev', 
        supportsNegativePrompt: true,
        supportedAspectRatios: WIDESCREEN_ULTRAWIDE_ASPECT_RATIOS,
        baseDimension: 1024,
        type: 'image_generation',
        defaultCfgScale: DEFAULT_CFG_SCALE,
        defaultSteps: DEFAULT_STEPS,
      }
    ]
  },
  {
    id: 'replicate',
    displayName: 'Replicate',
    requiresApiKey: true,
    apiKeyLabel: 'Replicate API Key',
    apiKeyManagementUrl: 'https://replicate.com/account/api-tokens',
    isDynamic: false, 
    models: [ 
      { 
        id: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
        displayName: 'Stability AI - SDXL', 
        supportsNegativePrompt: true,
        supportedAspectRatios: WIDESCREEN_ULTRAWIDE_ASPECT_RATIOS,
        baseDimension: 1024,
        type: 'image_generation',
        defaultCfgScale: DEFAULT_CFG_SCALE,
        defaultSteps: 25, 
        availableSamplers: ['DDIM', 'DPMSolverMultistep', 'Heun', 'KarrasDPM', 'K_EULER_ANCESTRAL', 'K_EULER', 'PNDM'], 
      },
      { 
        id: 'bytedance/sdxl-lightning-4step:5f24084160c9089501c1b3545d9be3c27883ae2239b6f412990e82d4a6210f8f', 
        displayName: 'ByteDance - SDXL Lightning (4-step)', 
        supportsNegativePrompt: true,
        supportedAspectRatios: WIDESCREEN_ULTRAWIDE_ASPECT_RATIOS, 
        baseDimension: 1024,
        type: 'image_generation',
        defaultCfgScale: 1.5, 
        defaultSteps: 4,      
         availableSamplers: ['K_EULER', 'LCM'], 
      },
       { 
        id: 'mrfrozst/fooocus-twoo:2a2d9ede00165089856380a5a911736b8017009419cc83861877987541175820',
        displayName: 'Fooocus MRE', 
        supportsNegativePrompt: true,
        supportedAspectRatios: WIDESCREEN_ULTRAWIDE_ASPECT_RATIOS, 
        baseDimension: 1024, 
        type: 'image_generation',
        defaultCfgScale: DEFAULT_CFG_SCALE, 
        defaultSteps: DEFAULT_STEPS,   
      },
      { 
        id: REPLICATE_UPSCALER_MODEL_ID, 
        displayName: 'Real-ESRGAN Upscaler', 
        type: 'upscaling',
      }
    ]
  },
  {
    id: 'leonardo_ai',
    displayName: 'Leonardo.Ai',
    requiresApiKey: true,
    apiKeyLabel: 'Leonardo.Ai API Key',
    apiKeyManagementUrl: 'https://app.leonardo.ai/settings/api-keys',
    isDynamic: true, 
    models: [ 
      { 
        id: '6bef9f1b-29cb-40c7-b9df-32b51c1f67d3', 
        displayName: 'Leonardo Diffusion XL', 
        supportsNegativePrompt: true,
        supportedAspectRatios: WIDESCREEN_ULTRAWIDE_ASPECT_RATIOS, 
        baseDimension: 1024,
        type: 'image_generation',
        supportsImageToImage: true,
        defaultCfgScale: DEFAULT_CFG_SCALE, 
        defaultSteps: 20,   
        supportsAlchemy: true,
        supportsPhotoReal: true,
        availableLeonardoPresetStyles: LEONARDO_PRESET_STYLES,
      },
      { 
        id: 'b24e16ff-06e3-43eb-a253-af9aa128b030', 
        displayName: 'DreamShaper v7', 
        supportsNegativePrompt: true,
        supportedAspectRatios: FLEXIBLE_COMMON_ASPECT_RATIOS, 
        baseDimension: 768,
        type: 'image_generation',
        supportsImageToImage: true,
        defaultCfgScale: DEFAULT_CFG_SCALE,
        defaultSteps: 25,
        supportsAlchemy: true,
        supportsPhotoReal: true,
        availableLeonardoPresetStyles: LEONARDO_PRESET_STYLES,
      },
    ]
  },
  {
    id: 'clipdrop',
    displayName: 'Clipdrop',
    requiresApiKey: true,
    apiKeyLabel: 'Clipdrop API Key',
    apiKeyManagementUrl: 'https://clipdrop.co/platform/account',
    isDynamic: false,
    models: [
      {
        id: CLIPDROP_MODEL_ID_UPSCALE, 
        displayName: 'Image Upscaling (Auto)', 
        type: 'upscaling',
      },
      {
        id: CLIPDROP_MODEL_ID_INPAINT,
        displayName: 'Inpainting',
        type: 'inpainting',
      }
    ]
  }
];

// Chat Provider Constants
export const DEFAULT_CHAT_SYSTEM_PROMPT_BASE: string = 
`You are a friendly and inspiring creative assistant for an application called Etherscape.
Etherscape generates evolving sequences of abstract, dream-like images based on user themes.
Your role is to help users brainstorm new themes, refine existing ones, develop artistic prompts, or explore conceptual ideas for their visual journey.
Be concise and encouraging.
When asked to perform an action, use the available functions. Only use a function if the user explicitly asks to change something or perform an action that corresponds to a function. For general discussion or brainstorming, do not use functions.
If the user asks for a complex stylistic change (e.g., 'make it more dramatic', 'give it a vintage feel', 'use a Dutch angle perspective'), consider what image generation parameters can achieve this. You can use functions to update the 'Theme/Concept', 'Art Style', 'Negative Prompt', 'CFG Scale', or 'Aspect Ratio'. Propose a sequence of changes using these functions if appropriate. For instance, for 'more dramatic', you might suggest changing the Theme, then ask if they also want to adjust the CFG scale. For 'Dutch angle', you might first suggest modifying the prompt within the Theme, then potentially a specific Art Style if applicable.`;

export const DEFAULT_CHAT_CONFIG: ChatConfig = {
  temperature: 0.9,
  topK: undefined, 
  topP: undefined, 
  maxOutputTokens: 2048,
  seed: undefined,
  stopSequences: [],
};

export const CHAT_PROVIDERS_STATIC: ChatProviderSetting[] = [
  {
    id: 'gemini',
    displayName: 'Google Gemini',
    requiresApiKey: false, 
    models: [
      { 
        id: 'gemini-2.5-flash-preview-04-17', 
        displayName: 'Gemini 2.5 Flash',
        contextWindow: 1000000, 
        defaultTemperature: DEFAULT_CHAT_CONFIG.temperature 
      }
    ]
  },
  {
    id: 'deepseek',
    displayName: 'DeepSeek',
    requiresApiKey: true,
    apiKeyLabel: 'DeepSeek API Key',
    apiKeyManagementUrl: 'https://platform.deepseek.com/api_keys',
    isPlaceholder: false, // No longer a placeholder
    models: [{ id: 'deepseek-chat', displayName: 'DeepSeek Chat', contextWindow: 32000 }]
  },
  {
    id: 'mistral',
    displayName: 'Mistral AI (Placeholder)',
    requiresApiKey: true,
    apiKeyLabel: 'Mistral API Key',
    apiKeyManagementUrl: 'https://console.mistral.ai/user/api-keys/',
    isPlaceholder: true,
    models: [{ id: 'mistral-large-latest', displayName: 'Mistral Large (Placeholder)', contextWindow: 32000 }]
  },
  {
    id: 'cohere',
    displayName: 'Cohere (Placeholder)',
    requiresApiKey: true,
    apiKeyLabel: 'Cohere API Key',
    apiKeyManagementUrl: 'https://dashboard.cohere.com/api-keys',
    isPlaceholder: true,
    models: [{ id: 'command-r-plus', displayName: 'Command R+ (Placeholder)', contextWindow: 128000 }]
  },
  {
    id: 'anthropic',
    displayName: 'Anthropic Claude (Placeholder)',
    requiresApiKey: true,
    apiKeyLabel: 'Anthropic API Key',
    apiKeyManagementUrl: 'https://console.anthropic.com/settings/keys',
    isPlaceholder: true,
    models: [{ id: 'claude-3-opus-20240229', displayName: 'Claude 3 Opus (Placeholder)', contextWindow: 200000 }]
  },
  {
    id: 'groq',
    displayName: 'Groq (Llama via Groq - Placeholder)',
    requiresApiKey: true,
    apiKeyLabel: 'Groq API Key',
    apiKeyManagementUrl: 'https://console.groq.com/keys',
    isPlaceholder: true,
    models: [
      { id: 'llama3-70b-8192', displayName: 'Llama3 70B (Placeholder)', contextWindow: 8192 },
      { id: 'mixtral-8x7b-32768', displayName: 'Mixtral 8x7B (Placeholder)', contextWindow: 32768 }
    ]
  }
];