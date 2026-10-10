/**
 * Scene → SVG markup. A single string serializer is used for the editor
 * canvas, thumbnails, and SVG/PNG export so every view is pixel-identical.
 */
import type { Scene } from '@/core/scene/buildScene';
import type { Primitive } from '@/core/scene/primitives';

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
const n = (v: number) => (Math.round(v * 100) / 100).toString();

function styleAttrs(p: Primitive, filled: boolean): string {
  let a = '';
  a += ` fill="${filled && p.fill ? esc(p.fill) : 'none'}"`;
  if (p.stroke)
    a += ` stroke="${esc(p.stroke)}" stroke-width="${n(p.strokeWidth ?? 1)}" stroke-linecap="round" stroke-linejoin="round"`;
  if (p.opacity != null && p.opacity < 1) a += ` opacity="${n(p.opacity)}"`;
  if (p.dash) a += ` stroke-dasharray="${p.dash.join(' ')}"`;
  return a;
}

export function primitiveToSvg(p: Primitive): string {
  switch (p.t) {
    case 'poly': {
      const pts: string[] = [];
      for (let i = 0; i < p.points.length; i += 2) pts.push(`${n(p.points[i])},${n(p.points[i + 1])}`);
      const tag = p.closed ? 'polygon' : 'polyline';
      return `<${tag} points="${pts.join(' ')}"${styleAttrs(p, p.closed)}/>`;
    }
    case 'ellipse':
      return `<ellipse cx="${n(p.cx)}" cy="${n(p.cy)}" rx="${n(p.rx)}" ry="${n(p.ry)}"${styleAttrs(p, true)}/>`;
    case 'line':
      return `<line x1="${n(p.x1)}" y1="${n(p.y1)}" x2="${n(p.x2)}" y2="${n(p.y2)}"${styleAttrs(p, false)}/>`;
    case 'path':
      return `<path d="${esc(p.d)}"${styleAttrs(p, true)}/>`;
  }
}

export interface SvgOptions {
  /** Unique suffix for clip-path ids when several SVGs share a document. */
  uid?: string;
  /** Emit data-id attributes on items (editor hit-testing). */
  interactive?: boolean;
  includeGuides?: boolean;
}

/** Inner markup (no <svg> wrapper) for embedding in an existing <svg>. */
export function sceneSvgBody(scene: Scene, opts: SvgOptions = {}): string {
  const { W, H, center, roll } = scene.frame;
  const uid = opts.uid ?? 'scene';
  const out: string[] = [];
  out.push(
    `<defs><clipPath id="clip-${esc(uid)}"><rect x="0" y="0" width="${n(W)}" height="${n(H)}"/></clipPath></defs>`,
  );
  out.push(`<g clip-path="url(#clip-${esc(uid)})">`);
  out.push(`<g transform="rotate(${n(roll)} ${n(center.x)} ${n(center.y)})">`);
  out.push('<g data-layer="environment">', ...scene.environment.map(primitiveToSvg), '</g>');
  out.push(...scene.horizon.map(primitiveToSvg));
  for (const item of scene.items) {
    const attrs = opts.interactive ? ` data-id="${esc(item.id)}" style="cursor:move"` : '';
    // Invisible hit area so thin shapes (legs, fences) are easy to grab.
    const hit = opts.interactive
      ? `<rect x="${n(item.bounds.x)}" y="${n(item.bounds.y)}" width="${n(item.bounds.w)}" height="${n(item.bounds.h)}" fill="transparent"/>`
      : '';
    out.push(`<g${attrs}>`, hit, ...item.prims.map(primitiveToSvg), '</g>');
  }
  out.push('</g>');
  if (opts.includeGuides !== false)
    out.push('<g data-layer="guides" pointer-events="none">', ...scene.guides.map(primitiveToSvg), '</g>');
  out.push('</g>');
  return out.join('');
}

/** Standalone SVG document. */
export function sceneToSvgDocument(scene: Scene, opts: SvgOptions & { width?: number; height?: number } = {}): string {
  const { W, H } = scene.frame;
  const w = opts.width ?? W;
  const h = opts.height ?? H;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(W)} ${n(H)}" width="${n(w)}" height="${n(h)}">${sceneSvgBody(scene, opts)}</svg>`;
}
