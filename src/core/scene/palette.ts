import type { Layer } from '../model/composition';

export type PaletteName = 'color' | 'mono';

export interface Palette {
  skyTop: string;
  skyBottom: string;
  ground: string;
  groundFar: string;
  horizon: string;
  grid: string;
  figure: string;
  figureStroke: string;
  /** Prop fill per depth layer (atmospheric perspective: far = lighter). */
  layer: Record<Layer, { fill: string; shade: string; stroke: string }>;
  cloud: string;
  sun: string;
}

export const PALETTES: Record<PaletteName, Palette> = {
  color: {
    skyTop: '#8ec5f2',
    skyBottom: '#dcefff',
    ground: '#9fb88a',
    groundFar: '#c8d6b5',
    horizon: '#5c7cfa',
    grid: 'rgba(60, 80, 110, 0.35)',
    figure: '#e8590c',
    figureStroke: '#7a2e05',
    layer: {
      background: { fill: '#a7b4c9', shade: '#94a2b9', stroke: '#8593a9' },
      midground: { fill: '#6c7a91', shade: '#57647a', stroke: '#454f61' },
      foreground: { fill: '#3b4252', shade: '#2e3440', stroke: '#1f232c' },
    },
    cloud: '#ffffff',
    sun: '#ffd43b',
  },
  mono: {
    skyTop: '#f4f4f4',
    skyBottom: '#ffffff',
    ground: '#d9d9d9',
    groundFar: '#ececec',
    horizon: '#000000',
    grid: 'rgba(0, 0, 0, 0.3)',
    figure: '#000000',
    figureStroke: '#000000',
    layer: {
      background: { fill: '#bdbdbd', shade: '#aaaaaa', stroke: '#9a9a9a' },
      midground: { fill: '#7d7d7d', shade: '#686868', stroke: '#555555' },
      foreground: { fill: '#3a3a3a', shade: '#2a2a2a', stroke: '#1a1a1a' },
    },
    cloud: '#fafafa',
    sun: '#cccccc',
  },
};
