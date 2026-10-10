import { Box } from '@mantine/core';
import { useElementSize } from '@mantine/hooks';
import { useCallback, useMemo, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { fromUnits, screenToWorld, vanishingPoints, type Frame } from '@/core/geometry/camera';
import { buildScene } from '@/core/scene/buildScene';
import type { Vec2 } from '@/core/geometry/vec';
import { sceneSvgBody } from '@/render/svg';
import { useCompositionStore } from '@/state/compositionStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useViewStore } from '@/state/viewStore';
import { useEvaluation } from '@/state/useEvaluation';
import type { Composition } from '@/core/model/composition';

type Drag =
  | { kind: 'item'; id: string; start: Vec2; orig: Vec2; isFigure: boolean }
  | {
      kind: 'resize';
      id: string;
      anchor: Vec2;
      startDist: number;
      orig: { w: number; h: number };
      isFigure: boolean;
    }
  | { kind: 'horizon'; start: Vec2; orig: number }
  | { kind: 'roll'; startAngle: number; orig: number }
  | { kind: 'vp'; key: 'vp' | 'vpLeft' | 'vpRight'; start: Vec2; orig: number };

interface DragSession {
  drag: Drag;
  pre: Composition;
  frame: Frame;
  moved: boolean;
  /** Client → scene transform frozen at drag start. */
  inv: DOMMatrix | undefined;
  startClient: { x: number; y: number };
}

const DRAG_THRESHOLD_PX = 4;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function CanvasView() {
  const composition = useCompositionStore((s) => s.composition);
  const update = useCompositionStore((s) => s.update);
  const { selectedId, select, guides, showGrid, showHorizon, showAnalysis } = useViewStore();
  const evaluation = useEvaluation();
  const palette = useSettingsStore((s) => s.palette);
  const { ref: wrapRef, width: boxW, height: boxH } = useElementSize();
  const svgRef = useRef<SVGSVGElement>(null);
  const session = useRef<DragSession | null>(null);

  const scene = useMemo(
    () => buildScene(composition, { palette, showGrid, showHorizon, guides }),
    [composition, palette, showGrid, showHorizon, guides],
  );
  const body = useMemo(() => sceneSvgBody(scene, { interactive: true, uid: 'editor' }), [scene]);
  const { W, H, center, roll, horizonY } = scene.frame;

  // Fit the canvas inside the available box while keeping the aspect ratio.
  const ratio = W / H;
  const fitW = boxW > 0 && boxH > 0 ? Math.min(boxW, boxH * ratio) : 0;
  const fitH = fitW / ratio;
  const k = fitW > 0 ? W / fitW : 1; // scene units per CSS pixel
  const handleR = 9 * k;

  const toScene = useCallback((e: { clientX: number; clientY: number }, inv?: DOMMatrix): Vec2 => {
    const m = inv ?? svgRef.current?.getScreenCTM()?.inverse();
    if (!m) return { x: 0, y: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m);
    return { x: p.x, y: p.y };
  }, []);

  const begin = (e: ReactPointerEvent, drag: Drag) => {
    e.stopPropagation();
    e.preventDefault();
    svgRef.current?.setPointerCapture(e.pointerId);
    useCompositionStore.temporal.getState().pause();
    session.current = {
      drag,
      pre: composition,
      frame: scene.frame,
      moved: false,
      inv: svgRef.current?.getScreenCTM()?.inverse(),
      startClient: { x: e.clientX, y: e.clientY },
    };
  };

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const target = (e.target as Element).closest('[data-id]');
    const id = target?.getAttribute('data-id');
    if (!id) {
      select(null);
      return;
    }
    select(id);
    const fig = composition.figures.find((f) => f.id === id);
    const prop = composition.props.find((p) => p.id === id);
    const item = fig ?? prop;
    if (!item || item.locked) return;
    const w = screenToWorld(scene.frame, toScene(e));
    begin(e, {
      kind: 'item',
      id,
      start: w,
      orig: { x: item.x, y: item.y },
      isFigure: !!fig,
    });
  };

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const s = session.current;
    if (!s) return;
    // Ignore tiny movements so a tap only selects.
    if (!s.moved && Math.hypot(e.clientX - s.startClient.x, e.clientY - s.startClient.y) < DRAG_THRESHOLD_PX) return;
    s.moved = true;
    // Use the transform captured at drag start: the canvas may be resized
    // mid-gesture (e.g. a panel opening) and must not make the object jump.
    const sp = toScene(e, s.inv);
    const wp = screenToWorld(s.frame, sp);
    const d = s.drag;
    switch (d.kind) {
      case 'item': {
        const delta = fromUnits(s.frame, {
          x: wp.x - d.start.x,
          y: wp.y - d.start.y,
        });
        update((c) => {
          const it = d.isFigure ? c.figures.find((f) => f.id === d.id) : c.props.find((p) => p.id === d.id);
          if (!it) return;
          it.x = clamp(d.orig.x + delta.x, -0.5, 1.5);
          it.y = clamp(d.orig.y + delta.y, -0.5, 1.5);
        });
        break;
      }
      case 'resize': {
        const dist = Math.hypot(wp.x - d.anchor.x, wp.y - d.anchor.y);
        const f = clamp(dist / Math.max(1, d.startDist), 0.05, 20);
        update((c) => {
          if (d.isFigure) {
            const it = c.figures.find((x) => x.id === d.id);
            if (it) it.height = clamp(d.orig.h * f, 0.01, 3);
          } else {
            const it = c.props.find((x) => x.id === d.id);
            if (it) {
              it.width = clamp(d.orig.w * f, 0.01, 4);
              it.height = clamp(d.orig.h * f, 0.01, 4);
            }
          }
        });
        break;
      }
      case 'horizon': {
        const dy = (wp.y - d.start.y) / s.frame.H;
        update((c) => void (c.horizon.y = clamp(d.orig + dy, -0.5, 1.5)));
        break;
      }
      case 'roll': {
        const a = (Math.atan2(sp.y - s.frame.center.y, sp.x - s.frame.center.x) * 180) / Math.PI;
        let next = d.orig + (a - d.startAngle);
        next = ((next + 540) % 360) - 180;
        update((c) => void (c.horizon.angle = clamp(Math.round(next * 10) / 10, -45, 45)));
        break;
      }
      case 'vp': {
        const dx = (wp.x - d.start.x) / s.frame.W;
        update((c) => void (c.perspective[d.key] = clamp(d.orig + dx, -5, 6)));
        break;
      }
    }
  };

  const onPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    const s = session.current;
    if (!s) return;
    session.current = null;
    svgRef.current?.releasePointerCapture(e.pointerId);
    // Collapse the whole drag into a single undo step.
    const finalC = useCompositionStore.getState().composition;
    const temporal = useCompositionStore.temporal.getState();
    if (s.moved && finalC !== s.pre) {
      useCompositionStore.setState({ composition: s.pre });
      temporal.resume();
      useCompositionStore.setState({ composition: finalC });
    } else {
      temporal.resume();
    }
  };

  // ---- Handles (world space, rendered inside the rolled group) -----------
  const selected = scene.items.find((i) => i.id === selectedId);
  const vps = vanishingPoints(composition, scene.frame);
  const vpKeys: ('vp' | 'vpLeft' | 'vpRight')[] =
    composition.perspective.mode === 'one' ? ['vp'] : ['vpLeft', 'vpRight'];
  const hxL = W * 0.04;
  const hxR = W * 0.96;

  const startResize = (e: ReactPointerEvent) => {
    if (!selected) return;
    const fig = composition.figures.find((f) => f.id === selected.id);
    const prop = composition.props.find((p) => p.id === selected.id);
    const it = fig ?? prop;
    if (!it || it.locked) return;
    const anchor = selected.anchor;
    const wp = screenToWorld(scene.frame, toScene(e));
    begin(e, {
      kind: 'resize',
      id: selected.id,
      anchor,
      startDist: Math.hypot(wp.x - anchor.x, wp.y - anchor.y),
      orig: { w: prop?.width ?? 0, h: it.height },
      isFigure: !!fig,
    });
  };

  const handleStyle = {
    fill: '#fff',
    stroke: '#4c6ef5',
    strokeWidth: 2 * k,
    cursor: 'grab',
  } as const;

  return (
    <Box
      ref={wrapRef}
      className="ce-canvas-wrap"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {fitW > 0 && (
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          width={fitW}
          height={fitH}
          role="img"
          aria-label="composition canvas"
          style={{
            boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
            background: '#fff',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <g dangerouslySetInnerHTML={{ __html: body }} />
          <g transform={`rotate(${roll} ${center.x} ${center.y})`}>
            {selected && (
              <>
                <rect
                  x={selected.bounds.x}
                  y={selected.bounds.y}
                  width={selected.bounds.w}
                  height={selected.bounds.h}
                  fill="none"
                  stroke="#4c6ef5"
                  strokeWidth={1.5 * k}
                  strokeDasharray={`${6 * k} ${4 * k}`}
                  pointerEvents="none"
                />
                <rect
                  x={selected.bounds.x + selected.bounds.w - handleR}
                  y={selected.bounds.y - handleR}
                  width={handleR * 2}
                  height={handleR * 2}
                  {...handleStyle}
                  style={{ cursor: 'nesw-resize' }}
                  onPointerDown={startResize}
                />
              </>
            )}
            {showHorizon && (
              <>
                <circle
                  cx={hxL}
                  cy={horizonY}
                  r={handleR}
                  {...handleStyle}
                  style={{ cursor: 'ns-resize' }}
                  onPointerDown={(e) =>
                    begin(e, {
                      kind: 'horizon',
                      start: screenToWorld(scene.frame, toScene(e)),
                      orig: composition.horizon.y,
                    })
                  }
                />
                <g
                  style={{ cursor: 'alias' }}
                  onPointerDown={(e) => {
                    const sp = toScene(e);
                    begin(e, {
                      kind: 'roll',
                      startAngle: (Math.atan2(sp.y - center.y, sp.x - center.x) * 180) / Math.PI,
                      orig: composition.horizon.angle,
                    });
                  }}
                >
                  <circle cx={hxR} cy={horizonY} r={handleR} {...handleStyle} fill="#4c6ef5" />
                  <path
                    d={`M ${hxR - handleR * 0.5} ${horizonY} a ${handleR * 0.5} ${handleR * 0.5} 0 1 1 ${handleR * 0.5} ${handleR * 0.5}`}
                    fill="none"
                    stroke="#fff"
                    strokeWidth={1.5 * k}
                    pointerEvents="none"
                  />
                </g>
              </>
            )}
            {vps.map((vp, i) => {
              const key = vpKeys[i];
              return (
                <g
                  key={key}
                  style={{ cursor: 'ew-resize' }}
                  onPointerDown={(e) =>
                    begin(e, {
                      kind: 'vp',
                      key,
                      start: screenToWorld(scene.frame, toScene(e)),
                      orig: composition.perspective[key],
                    })
                  }
                >
                  <circle cx={vp.x} cy={vp.y} r={handleR * 1.1} fill="#fa5252" stroke="#fff" strokeWidth={2 * k} />
                  <line
                    x1={vp.x - handleR * 0.6}
                    y1={vp.y}
                    x2={vp.x + handleR * 0.6}
                    y2={vp.y}
                    stroke="#fff"
                    strokeWidth={1.5 * k}
                  />
                  <line
                    x1={vp.x}
                    y1={vp.y - handleR * 0.6}
                    x2={vp.x}
                    y2={vp.y + handleR * 0.6}
                    stroke="#fff"
                    strokeWidth={1.5 * k}
                  />
                </g>
              );
            })}
          </g>
          {showAnalysis && <AnalysisOverlay W={W} H={H} k={k} evaluation={evaluation} />}
        </svg>
      )}
    </Box>
  );
}

/** Screen-space overlay: visual-weight centroid and primary point of interest. */
function AnalysisOverlay({
  W,
  H,
  k,
  evaluation,
}: {
  W: number;
  H: number;
  k: number;
  evaluation: ReturnType<typeof useEvaluation>;
}) {
  const { centroid, primary } = evaluation.features;
  const r = 10 * k;
  return (
    <g pointerEvents="none">
      <rect x={W * 0.5 - 2 * k} y={0} width={4 * k} height={H} fill="#12b886" opacity={0.25} />
      {primary && (
        <circle
          cx={primary.focus.x * W}
          cy={primary.focus.y * H}
          r={r * 1.6}
          fill="none"
          stroke="#f76707"
          strokeWidth={3 * k}
          strokeDasharray={`${5 * k} ${3 * k}`}
        />
      )}
      {centroid && (
        <g transform={`translate(${centroid.x * W} ${centroid.y * H})`}>
          <circle r={r} fill="#12b886" fillOpacity={0.35} stroke="#0ca678" strokeWidth={2 * k} />
          <line x1={-r * 1.6} x2={r * 1.6} y1={0} y2={0} stroke="#0ca678" strokeWidth={2 * k} />
          <line y1={-r * 1.6} y2={r * 1.6} x1={0} x2={0} stroke="#0ca678" strokeWidth={2 * k} />
        </g>
      )}
    </g>
  );
}
