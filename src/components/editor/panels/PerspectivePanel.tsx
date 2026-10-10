import { SegmentedControl, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { PerspectiveMode } from '@/core/model/composition';
import { useCompositionStore } from '@/state/compositionStore';
import { useViewStore } from '@/state/viewStore';
import { ParamSlider } from '../ParamSlider';

export function PerspectivePanel() {
  const { t } = useTranslation();
  const p = useCompositionStore((s) => s.composition.perspective);
  const update = useCompositionStore((s) => s.update);
  const showGrid = useViewStore((s) => s.showGrid);

  return (
    <Stack gap="sm">
      <SegmentedControl
        fullWidth
        value={p.mode}
        onChange={(v) => update((d) => void (d.perspective.mode = v as PerspectiveMode))}
        data={[
          { value: 'none', label: t('perspective.none') },
          { value: 'one', label: t('perspective.one') },
          { value: 'two', label: t('perspective.two') },
        ]}
      />
      {p.mode === 'one' && (
        <ParamSlider
          label={t('perspective.vp')}
          value={p.vp}
          min={-0.5}
          max={1.5}
          step={0.005}
          displayScale={100}
          unit="%"
          onChange={(v) => update((d) => void (d.perspective.vp = v))}
        />
      )}
      {p.mode === 'two' && (
        <>
          <ParamSlider
            label={t('perspective.vpLeft')}
            value={p.vpLeft}
            min={-3}
            max={1}
            step={0.01}
            displayScale={100}
            unit="%"
            onChange={(v) => update((d) => void (d.perspective.vpLeft = Math.min(v, d.perspective.vpRight - 0.05)))}
          />
          <ParamSlider
            label={t('perspective.vpRight')}
            value={p.vpRight}
            min={0}
            max={4}
            step={0.01}
            displayScale={100}
            unit="%"
            onChange={(v) => update((d) => void (d.perspective.vpRight = Math.max(v, d.perspective.vpLeft + 0.05)))}
          />
          <Text size="xs" c="dimmed">
            {t('perspective.strengthHint', {
              span: ((p.vpRight - p.vpLeft) * 100).toFixed(0),
            })}
          </Text>
        </>
      )}
      {p.mode !== 'none' && (
        <ParamSlider
          label={t('perspective.gridLines')}
          value={p.gridLines}
          min={2}
          max={40}
          step={1}
          disabled={!showGrid}
          onChange={(v) => update((d) => void (d.perspective.gridLines = Math.round(v)))}
        />
      )}
      <Text size="xs" c="dimmed">
        {t('perspective.hint')}
      </Text>
    </Stack>
  );
}
