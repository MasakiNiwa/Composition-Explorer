import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PaletteName } from '@/core/scene/palette';

export type Language = 'auto' | 'ja' | 'en';
export type ColorScheme = 'auto' | 'light' | 'dark';

export interface Settings {
  language: Language;
  colorScheme: ColorScheme;
  palette: PaletteName;
  /** Long edge of exported PNGs in pixels. */
  exportSize: number;
  /** Include composition guides in exported images. */
  exportGuides: boolean;
  /** 0 = auto (navigator.hardwareConcurrency). */
  workerCount: number;
  /** Allow GPU (WebGPU) acceleration when available. */
  useGpu: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  language: 'auto',
  colorScheme: 'auto',
  palette: 'color',
  exportSize: 1536,
  exportGuides: false,
  workerCount: 0,
  useGpu: true,
};

interface SettingsState extends Settings {
  set: (patch: Partial<Settings>) => void;
  reset: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      set: (patch) => set(patch),
      reset: () => set(DEFAULT_SETTINGS),
    }),
    { name: 'ce.settings', version: 1 },
  ),
);
