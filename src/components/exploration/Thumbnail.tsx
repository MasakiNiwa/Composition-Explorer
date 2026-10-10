import { memo, useMemo } from 'react';
import { buildScene } from '@/core/scene/buildScene';
import type { Composition } from '@/core/model/composition';
import { sceneSvgBody } from '@/render/svg';
import { useSettingsStore } from '@/state/settingsStore';

/** Static SVG thumbnail of a composition (same renderer as the editor). */
export const Thumbnail = memo(function Thumbnail({ composition, uid }: { composition: Composition; uid: string }) {
  const palette = useSettingsStore((s) => s.palette);
  const { body, W, H } = useMemo(() => {
    const scene = buildScene(composition, { palette, showGrid: true, showHorizon: false, guides: [] });
    return { body: sceneSvgBody(scene, { uid }), W: scene.frame.W, H: scene.frame.H };
  }, [composition, palette, uid]);
  return (
    <div className="ce-thumb">
      <svg viewBox={`0 0 ${W} ${H}`} dangerouslySetInnerHTML={{ __html: body }} />
    </div>
  );
});
