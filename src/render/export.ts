import type { Composition } from '@/core/model/composition';
import { buildScene, type SceneOptions } from '@/core/scene/buildScene';
import { sceneToSvgDocument } from './svg';

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function baseName(c: Composition): string {
  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
  const name = (c.name || 'composition').replace(/[^\w-]+/g, '_').slice(0, 40);
  return `${name}_${stamp}`;
}

function exportSize(c: Composition, longEdge: number): { width: number; height: number } {
  const r = c.canvas.aspectW / c.canvas.aspectH;
  return r >= 1
    ? { width: longEdge, height: Math.round(longEdge / r) }
    : { width: Math.round(longEdge * r), height: longEdge };
}

export function compositionToSvg(c: Composition, opts: SceneOptions, longEdge = 1536): string {
  const scene = buildScene(c, opts);
  return sceneToSvgDocument(scene, {
    ...exportSize(c, longEdge),
    includeGuides: true,
  });
}

export function exportSvg(c: Composition, opts: SceneOptions, longEdge: number): void {
  const svg = compositionToSvg(c, opts, longEdge);
  downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), `${baseName(c)}.svg`);
}

export async function renderPng(c: Composition, opts: SceneOptions, longEdge: number): Promise<Blob> {
  const svg = compositionToSvg(c, opts, longEdge);
  const { width, height } = exportSize(c, longEdge);
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to rasterize SVG'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    ctx.drawImage(img, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encoding failed'))), 'image/png'),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function exportPng(c: Composition, opts: SceneOptions, longEdge: number): Promise<void> {
  downloadBlob(await renderPng(c, opts, longEdge), `${baseName(c)}.png`);
}

export function compositionToJson(c: Composition): string {
  return JSON.stringify(
    {
      app: 'composition-explorer',
      appVersion: __APP_VERSION__,
      exportedAt: new Date().toISOString(),
      composition: c,
    },
    null,
    2,
  );
}

export function exportJson(c: Composition): void {
  downloadBlob(new Blob([compositionToJson(c)], { type: 'application/json' }), `${baseName(c)}.json`);
}
