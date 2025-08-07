import { create } from 'zustand';
import { ImageLayer } from '../types'; // This type will need to be created

interface ImageEditorState {
  layers: ImageLayer[];
  selectedLayerId: string | null;
  addLayer: (layer: Omit<ImageLayer, 'id'>) => void;
  deleteLayer: (layerId: string) => void;
  selectLayer: (layerId: string) => void;
  updateLayer: (layerId: string, updates: Partial<ImageLayer>) => void;
  resetEditor: () => void;
}

const initialState = {
  layers: [],
  selectedLayerId: null,
};

export const useImageEditorStore = create<ImageEditorState>((set) => ({
  ...initialState,
  addLayer: (layer) =>
    set((state) => {
      const newLayer: ImageLayer = {
        id: `layer-${Date.now()}`,
        ...layer,
      };
      return {
        layers: [...state.layers, newLayer],
        selectedLayerId: newLayer.id,
      };
    }),
  deleteLayer: (layerId) =>
    set((state) => ({
      layers: state.layers.filter((l) => l.id !== layerId),
      selectedLayerId: state.selectedLayerId === layerId ? state.layers[state.layers.length - 2]?.id || null : state.selectedLayerId,
    })),
  selectLayer: (layerId) => set({ selectedLayerId: layerId }),
  updateLayer: (layerId, updates) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === layerId ? { ...l, ...updates } : l
      ),
    })),
  resetEditor: () => set(initialState),
}));
