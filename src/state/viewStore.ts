import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GuideKind } from '@/core/scene/buildScene';
import type { PresetKey } from '@/core/evaluation/presets';

/** Editor view state (not part of the composition itself). */
interface ViewState {
  selectedId: string | null;
  guides: GuideKind[];
  showGrid: boolean;
  showHorizon: boolean;
  /** Overlay the evaluation analysis (centroid, focus) on the canvas. */
  showAnalysis: boolean;
  preset: PresetKey;
  setShowAnalysis: (v: boolean) => void;
  setPreset: (p: PresetKey) => void;
  select: (id: string | null) => void;
  setGuides: (g: GuideKind[]) => void;
  setShowGrid: (v: boolean) => void;
  setShowHorizon: (v: boolean) => void;
}

export const useViewStore = create<ViewState>()(
  persist(
    (set) => ({
      selectedId: null,
      guides: ['thirds'],
      showGrid: true,
      showHorizon: true,
      showAnalysis: false,
      preset: 'balanced',
      setShowAnalysis: (showAnalysis) => set({ showAnalysis }),
      setPreset: (preset) => set({ preset }),
      select: (selectedId) => set({ selectedId }),
      setGuides: (guides) => set({ guides }),
      setShowGrid: (showGrid) => set({ showGrid }),
      setShowHorizon: (showHorizon) => set({ showHorizon }),
    }),
    {
      name: 'ce.view',
      partialize: (s) => ({
        guides: s.guides,
        showGrid: s.showGrid,
        showHorizon: s.showHorizon,
        showAnalysis: s.showAnalysis,
        preset: s.preset,
      }),
    },
  ),
);
