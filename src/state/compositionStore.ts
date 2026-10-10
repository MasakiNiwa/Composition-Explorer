import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { temporal } from 'zundo';
import {
  createEmptyComposition,
  createSampleComposition,
  newId,
  parseComposition,
  type Composition,
  type Figure,
  type Prop,
  type PropKind,
} from '@/core/model/composition';
import { eyeLevelFigureHeight } from '@/core/geometry/camera';
import { PROP_DEFAULTS } from '@/core/model/propDefaults';

interface CompositionState {
  composition: Composition;
  /** Replace the whole composition (load, import, pick a candidate). */
  setComposition: (c: Composition) => void;
  /** Immutable update helper used by all editors. */
  update: (fn: (draft: Composition) => void) => void;
  clear: () => void;
  loadSample: () => void;
  addFigure: () => string;
  addProp: (kind: PropKind) => string;
  updateFigure: (id: string, patch: Partial<Figure>) => void;
  updateProp: (id: string, patch: Partial<Prop>) => void;
  removeItem: (id: string) => void;
  duplicateItem: (id: string) => string | null;
  snapFigureToEyeLevel: (id: string) => void;
}

const clone = <T>(v: T): T => structuredClone(v);

export const useCompositionStore = create<CompositionState>()(
  temporal(
    persist(
      (set, get) => ({
        composition: createSampleComposition(),
        setComposition: (c) => set({ composition: clone(c) }),
        update: (fn) => {
          const next = clone(get().composition);
          fn(next);
          set({ composition: next });
        },
        clear: () => set({ composition: createEmptyComposition(get().composition.seed) }),
        loadSample: () => set({ composition: createSampleComposition() }),
        addFigure: () => {
          const id = newId('fig');
          get().update((c) => {
            const y = Math.min(0.95, c.horizon.y + 0.25);
            const h = eyeLevelFigureHeight(c, y) ?? 0.25;
            c.figures.push({
              id,
              x: 0.5,
              y,
              height: Math.min(1.2, h),
              facing: 0,
              tilt: 0,
              roll: 0,
              pose: 'standing',
              locked: false,
            });
          });
          return id;
        },
        addProp: (kind) => {
          const id = newId('prop');
          get().update((c) => {
            const d = PROP_DEFAULTS[kind];
            const y =
              d.anchor === 'sky'
                ? c.horizon.y * d.y
                : d.anchor === 'horizon'
                  ? c.horizon.y
                  : Math.min(1, c.horizon.y + d.y);
            c.props.push({
              id,
              kind,
              layer: d.layer,
              x: 0.5,
              y,
              width: d.width,
              height: d.height,
              flip: false,
              rotation: 0,
              locked: false,
            });
          });
          return id;
        },
        updateFigure: (id, patch) =>
          get().update((c) => {
            const f = c.figures.find((x) => x.id === id);
            if (f) Object.assign(f, patch);
          }),
        updateProp: (id, patch) =>
          get().update((c) => {
            const p = c.props.find((x) => x.id === id);
            if (p) Object.assign(p, patch);
          }),
        removeItem: (id) =>
          get().update((c) => {
            c.figures = c.figures.filter((f) => f.id !== id);
            c.props = c.props.filter((p) => p.id !== id);
          }),
        duplicateItem: (id) => {
          const c = get().composition;
          const fig = c.figures.find((f) => f.id === id);
          const prop = c.props.find((p) => p.id === id);
          const nid = newId(fig ? 'fig' : 'prop');
          if (fig) get().update((d) => void d.figures.push({ ...fig, id: nid, x: fig.x + 0.05 }));
          else if (prop) get().update((d) => void d.props.push({ ...prop, id: nid, x: prop.x + 0.05 }));
          else return null;
          return nid;
        },
        snapFigureToEyeLevel: (id) =>
          get().update((c) => {
            const f = c.figures.find((x) => x.id === id);
            if (!f) return;
            const h = eyeLevelFigureHeight(c, f.y);
            if (h != null) f.height = Math.min(3, Math.max(0.005, h));
          }),
      }),
      {
        name: 'ce.composition',
        version: 1,
        storage: createJSONStorage(() => localStorage),
        partialize: (s) => ({ composition: s.composition }),
        merge: (persisted, current) => {
          const parsed = parseComposition((persisted as { composition?: unknown } | undefined)?.composition);
          return parsed.ok ? { ...current, composition: parsed.value } : current;
        },
      },
    ),
    {
      limit: 100,
      partialize: (s) => ({ composition: s.composition }),
      equality: (a, b) => a.composition === b.composition,
    },
  ),
);

export const useHistory = () => useCompositionStore.temporal.getState();
