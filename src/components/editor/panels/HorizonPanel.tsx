import { Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { useCompositionStore } from '@/state/compositionStore';
import { ParamSlider } from '../ParamSlider';

export function HorizonPanel() {
  const { t } = useTranslation();
  const h = useCompositionStore((s) => s.composition.horizon);
  const update = useCompositionStore((s) => s.update);
  const sky = Math.min(100, Math.max(0, h.y * 100));

  return (
    <Stack gap="sm">
      <ParamSlider
        label={t('horizon.position')}
        value={h.y}
        min={-0.2}
        max={1.2}
        step={0.005}
        displayScale={100}
        unit="%"
        onChange={(v) => update((d) => void (d.horizon.y = v))}
      />
      <ParamSlider
        label={t('horizon.angle')}
        value={h.angle}
        min={-180}
        max={180}
        step={0.5}
        unit="°"
        precision={1}
        onChange={(v) => update((d) => void (d.horizon.angle = v))}
      />
      <ParamSlider
        label={t('horizon.cameraHeight')}
        value={h.cameraHeight}
        min={0.2}
        max={50}
        step={0.1}
        unit="m"
        precision={1}
        onChange={(v) => update((d) => void (d.horizon.cameraHeight = v))}
      />
      <ParamSlider
        label={t('horizon.fov')}
        value={h.fov}
        min={15}
        max={130}
        step={1}
        unit="°"
        onChange={(v) => update((d) => void (d.horizon.fov = v))}
      />
      <Text size="xs" c="dimmed">
        {t('horizon.fovHint')}
      </Text>
      <Text size="xs" c="dimmed">
        {t('horizon.ratio', {
          sky: sky.toFixed(0),
          ground: (100 - sky).toFixed(0),
        })}
      </Text>
      <Text size="xs" c="dimmed">
        {t('horizon.hint')}
      </Text>
    </Stack>
  );
}
