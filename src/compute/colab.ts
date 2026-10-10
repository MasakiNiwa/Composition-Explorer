/**
 * Colab backend detection. When the UI is served by colab/server.py, the
 * same-origin `api/health` endpoint answers; on GitHub Pages it 404s.
 */
import { create } from 'zustand';

export interface ColabInfo {
  app: string;
  backend: 'colab';
  apiVersion: number;
  gpu: string | null;
}

interface BackendState {
  checked: boolean;
  colab: ColabInfo | null;
  detect: () => Promise<void>;
}

export const useBackendStore = create<BackendState>()((set, get) => ({
  checked: false,
  colab: null,
  detect: async () => {
    if (get().checked) return;
    let colab: ColabInfo | null = null;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 2000);
      const r = await fetch('./api/health', { signal: ctrl.signal, cache: 'no-store' });
      clearTimeout(timer);
      if (r.ok && (r.headers.get('content-type') ?? '').includes('json')) {
        const j = (await r.json()) as Partial<ColabInfo>;
        if (j.app === 'composition-explorer' && j.backend === 'colab') colab = j as ColabInfo;
      }
    } catch {
      colab = null;
    }
    set({ checked: true, colab });
  },
}));
