import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ExploreProgress, ExploreResult } from '@/compute/backend';
import { getLocalBackend } from '@/compute/localBackend';
import { defaultSpec, type ExplorationSpec } from '@/core/exploration/spec';
import type { Composition } from '@/core/model/composition';
import { randomSeed } from '@/core/random/prng';

interface ExplorationState {
  spec: ExplorationSpec;
  running: boolean;
  progress: ExploreProgress | null;
  result: ExploreResult | null;
  error: string | null;
  /** Index (within result) of the candidate currently loaded in the editor. */
  activeIndex: number | null;
  setSpec: (fn: (s: ExplorationSpec) => void) => void;
  resetSpec: () => void;
  run: (template: Composition, workerCount: number) => Promise<void>;
  cancel: () => void;
  setActive: (i: number | null) => void;
}

let controller: AbortController | null = null;

export const useExplorationStore = create<ExplorationState>()(
  persist(
    (set, get) => ({
      spec: defaultSpec(randomSeed()),
      running: false,
      progress: null,
      result: null,
      error: null,
      activeIndex: null,
      setSpec: (fn) => {
        const next = structuredClone(get().spec);
        fn(next);
        set({ spec: next });
      },
      resetSpec: () => set({ spec: defaultSpec(get().spec.seed) }),
      run: async (template, workerCount) => {
        controller?.abort();
        controller = new AbortController();
        const spec = get().spec;
        set({ running: true, error: null, progress: { done: 0, total: spec.candidates, rejected: 0 } });
        try {
          const result = await getLocalBackend(workerCount).explore(
            template,
            spec,
            (progress) => set({ progress }),
            controller.signal,
          );
          set({ result, activeIndex: null });
        } catch (e) {
          if (!(e instanceof DOMException && e.name === 'AbortError'))
            set({ error: e instanceof Error ? e.message : String(e) });
        } finally {
          set({ running: false });
        }
      },
      cancel: () => controller?.abort(),
      setActive: (activeIndex) => set({ activeIndex }),
    }),
    {
      name: 'ce.exploration',
      version: 1,
      partialize: (s) => ({ spec: s.spec }),
      // Fill in fields added in newer versions.
      merge: (persisted, current) => {
        const p = (persisted as { spec?: Partial<ExplorationSpec> } | undefined)?.spec;
        if (!p) return current;
        const d = current.spec;
        return {
          ...current,
          spec: {
            ...d,
            ...p,
            params: { ...d.params, ...p.params },
            figureCount: { ...d.figureCount, ...p.figureCount },
            constraints: { ...d.constraints, ...p.constraints },
          },
        };
      },
    },
  ),
);
