import type { Layer, PropKind } from './composition';

/**
 * Default size/placement per prop kind.
 * anchor: 'ground' → y is offset below the horizon, 'horizon' → sits on it,
 * 'sky' → y is a fraction of the horizon height (from the top).
 */
export const PROP_DEFAULTS: Record<
  PropKind,
  {
    layer: Layer;
    width: number;
    height: number;
    anchor: 'ground' | 'horizon' | 'sky';
    y: number;
  }
> = {
  mountain: {
    layer: 'background',
    width: 0.9,
    height: 0.25,
    anchor: 'horizon',
    y: 0,
  },
  building: {
    layer: 'midground',
    width: 0.14,
    height: 0.24,
    anchor: 'ground',
    y: 0.08,
  },
  tower: {
    layer: 'background',
    width: 0.06,
    height: 0.35,
    anchor: 'horizon',
    y: 0,
  },
  tree: {
    layer: 'midground',
    width: 0.16,
    height: 0.3,
    anchor: 'ground',
    y: 0.12,
  },
  bush: {
    layer: 'foreground',
    width: 0.25,
    height: 0.1,
    anchor: 'ground',
    y: 0.35,
  },
  rock: {
    layer: 'foreground',
    width: 0.2,
    height: 0.12,
    anchor: 'ground',
    y: 0.3,
  },
  fence: {
    layer: 'foreground',
    width: 0.6,
    height: 0.1,
    anchor: 'ground',
    y: 0.3,
  },
  cloud: {
    layer: 'background',
    width: 0.35,
    height: 0.08,
    anchor: 'sky',
    y: 0.4,
  },
  sun: { layer: 'background', width: 0.1, height: 0.1, anchor: 'sky', y: 0.5 },
};
