import { create } from 'zustand';

interface AppState {
  isAdvancedSettingsOpen: boolean;
  openAdvancedSettings: () => void;
  closeAdvancedSettings: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  isAdvancedSettingsOpen: false,
  openAdvancedSettings: () => set({ isAdvancedSettingsOpen: true }),
  closeAdvancedSettings: () => set({ isAdvancedSettingsOpen: false }),
}));
