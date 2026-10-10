/**
 * Favorites and exploration history, persisted in IndexedDB (idb-keyval) so
 * larger data does not hit localStorage limits.
 */
import { createStore, get as idbGet, set as idbSet } from 'idb-keyval';
import { create } from 'zustand';
import type { Candidate } from '@/core/exploration/explore';
import type { ExplorationMode } from '@/core/exploration/spec';
import type { Metrics } from '@/core/evaluation/metrics';
import { newId, parseComposition, type Composition } from '@/core/model/composition';

export interface FavoriteEntry {
  id: string;
  createdAt: number;
  name: string;
  composition: Composition;
  metrics?: Metrics;
  tags?: string[];
}

export interface HistoryEntry {
  id: string;
  createdAt: number;
  mode: ExplorationMode;
  seed: number;
  discovery: number;
  preset: string;
  template: Composition;
  candidates: Candidate[];
}

export const HISTORY_LIMIT = 20;

const db = typeof indexedDB !== 'undefined' ? createStore('composition-explorer', 'library') : null;

async function load<T>(key: string): Promise<T[]> {
  if (!db) return [];
  try {
    return ((await idbGet<T[]>(key, db)) ?? []) as T[];
  } catch {
    return [];
  }
}
function save<T>(key: string, value: T[]): void {
  if (db) void idbSet(key, value, db).catch(() => undefined);
}

interface LibraryState {
  ready: boolean;
  favorites: FavoriteEntry[];
  history: HistoryEntry[];
  hydrate: () => Promise<void>;
  addFavorite: (composition: Composition, extra?: Partial<FavoriteEntry>) => string;
  removeFavorite: (id: string) => void;
  renameFavorite: (id: string, name: string) => void;
  isFavorite: (composition: Composition) => boolean;
  addHistory: (entry: Omit<HistoryEntry, 'id' | 'createdAt'>) => void;
  removeHistory: (id: string) => void;
  clearHistory: () => void;
}

const sameComposition = (a: Composition, b: Composition) => JSON.stringify(a) === JSON.stringify(b);

export const useLibraryStore = create<LibraryState>()((set, get) => ({
  ready: false,
  favorites: [],
  history: [],
  hydrate: async () => {
    if (get().ready) return;
    const [favorites, history] = await Promise.all([load<FavoriteEntry>('favorites'), load<HistoryEntry>('history')]);
    // Validate stored compositions (schema may evolve).
    const valid = favorites.filter((f) => parseComposition(f.composition).ok);
    set({ favorites: valid, history, ready: true });
  },
  addFavorite: (composition, extra) => {
    const id = newId('fav');
    const entry: FavoriteEntry = {
      id,
      createdAt: Date.now(),
      name: composition.name || '',
      composition: structuredClone(composition),
      ...extra,
    };
    const favorites = [entry, ...get().favorites];
    set({ favorites });
    save('favorites', favorites);
    return id;
  },
  removeFavorite: (id) => {
    const favorites = get().favorites.filter((f) => f.id !== id);
    set({ favorites });
    save('favorites', favorites);
  },
  renameFavorite: (id, name) => {
    const favorites = get().favorites.map((f) => (f.id === id ? { ...f, name } : f));
    set({ favorites });
    save('favorites', favorites);
  },
  isFavorite: (composition) => get().favorites.some((f) => sameComposition(f.composition, composition)),
  addHistory: (entry) => {
    const history = [{ ...entry, id: newId('run'), createdAt: Date.now() }, ...get().history].slice(0, HISTORY_LIMIT);
    set({ history });
    save('history', history);
  },
  removeHistory: (id) => {
    const history = get().history.filter((h) => h.id !== id);
    set({ history });
    save('history', history);
  },
  clearHistory: () => {
    set({ history: [] });
    save('history', []);
  },
}));
