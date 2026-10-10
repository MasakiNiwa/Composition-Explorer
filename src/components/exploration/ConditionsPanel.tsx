import { Button, Divider, Group, RangeSlider, SegmentedControl, Slider, Stack, Switch, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import {
  FREE_BOUNDS,
  NUMERIC_PARAMS,
  type NumericParam,
  type ParamMode,
  type PropsMode,
} from '@/core/exploration/spec';
import { useExplorationStore } from '@/state/explorationStore';
import { AdaptiveSelect } from '@/components/common/AdaptiveSelect';

const fmt = (key: NumericParam, v: number) => {
  const b = FREE_BOUNDS[key];
  return `${(v * b.scale).toFixed(b.scale === 1 ? 1 : 0)}${b.unit}`;
};

function ParamRow({ k }: { k: NumericParam }) {
  const { t } = useTranslation();
  const p = useExplorationStore((s) => s.spec.params[k]);
  const setSpec = useExplorationStore((s) => s.setSpec);
  const b = FREE_BOUNDS[k];
  return (
    <Stack gap={4}>
      <Group justify="space-between" gap={4} wrap="nowrap">
        <Text size="sm">{t(`explore.params.${k}`)}</Text>
        <SegmentedControl
          size="xs"
          value={p.mode}
          onChange={(v) => setSpec((s) => void (s.params[k].mode = v as ParamMode))}
          data={[
            { value: 'fixed', label: t('explore.mode.fixed') },
            { value: 'range', label: t('explore.mode.range') },
            { value: 'free', label: t('explore.mode.free') },
          ]}
        />
      </Group>
      {p.mode === 'range' && (
        <RangeSlider
          min={b.min}
          max={b.max}
          step={b.step}
          minRange={b.step}
          value={[Math.max(b.min, Math.min(p.min, p.max)), Math.min(b.max, Math.max(p.min, p.max))]}
          label={(v) => fmt(k, v)}
          onChange={([lo, hi]) =>
            setSpec((s) => {
              s.params[k].min = lo;
              s.params[k].max = hi;
            })
          }
        />
      )}
      {p.mode === 'range' && (
        <Text size="xs" c="dimmed">
          {fmt(k, p.min)} – {fmt(k, p.max)}
        </Text>
      )}
    </Stack>
  );
}

/** Exploration conditions: Fixed / Range / Free per parameter, plus constraints. */
export function ConditionsPanel() {
  const { t } = useTranslation();
  const spec = useExplorationStore((s) => s.spec);
  const { setSpec, resetSpec } = useExplorationStore();
  const visible = NUMERIC_PARAMS.filter((k) => k !== 'figureSize' || !spec.eyeLevelSizing);

  return (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">
        {t('explore.conditionsHint')}
      </Text>
      {visible.map((k) => (
        <ParamRow key={k} k={k} />
      ))}
      <Group justify="space-between" gap={4} wrap="nowrap">
        <Text size="sm">{t('explore.perspectiveMode')}</Text>
        <SegmentedControl
          size="xs"
          value={spec.perspectiveMode}
          onChange={(v) => setSpec((s) => void (s.perspectiveMode = v as 'fixed' | 'free'))}
          data={[
            { value: 'fixed', label: t('explore.mode.fixed') },
            { value: 'free', label: t('explore.mode.free') },
          ]}
        />
      </Group>
      <Stack gap={4}>
        <Group justify="space-between" gap={4} wrap="nowrap">
          <Text size="sm">{t('explore.figureCount')}</Text>
          <SegmentedControl
            size="xs"
            value={spec.figureCount.mode}
            onChange={(v) => setSpec((s) => void (s.figureCount.mode = v as ParamMode))}
            data={[
              { value: 'fixed', label: t('explore.mode.fixed') },
              { value: 'range', label: t('explore.mode.range') },
              { value: 'free', label: t('explore.mode.free') },
            ]}
          />
        </Group>
        {spec.figureCount.mode === 'range' && (
          <RangeSlider
            min={0}
            max={5}
            step={1}
            minRange={0}
            marks={[0, 1, 2, 3, 4, 5].map((v) => ({ value: v, label: String(v) }))}
            mb="md"
            value={[spec.figureCount.min, spec.figureCount.max]}
            onChange={([lo, hi]) =>
              setSpec((s) => {
                s.figureCount.min = lo;
                s.figureCount.max = hi;
              })
            }
          />
        )}
      </Stack>
      <Switch
        label={t('explore.eyeLevelSizing')}
        checked={spec.eyeLevelSizing}
        onChange={(e) => {
          const v = e.currentTarget.checked;
          setSpec((s) => void (s.eyeLevelSizing = v));
        }}
      />
      <AdaptiveSelect
        label={t('explore.props')}
        value={spec.props}
        allowDeselect={false}
        data={(['fixed', 'jitter', 'free'] as const).map((v) => ({ value: v, label: t(`explore.propsMode.${v}`) }))}
        onChange={(v) => v && setSpec((s) => void (s.props = v as PropsMode))}
      />
      <Divider label={t('explore.constraints')} labelPosition="left" />
      <Stack gap={4}>
        <Text size="sm">
          {t('explore.skyMin')}:{' '}
          {spec.constraints.skyMin > 0 ? `${Math.round(spec.constraints.skyMin * 100)}%` : t('explore.off')}
        </Text>
        <Slider
          min={0}
          max={0.9}
          step={0.05}
          value={spec.constraints.skyMin}
          label={(v) => (v > 0 ? `${Math.round(v * 100)}%` : t('explore.off'))}
          onChange={(v) => setSpec((s) => void (s.constraints.skyMin = v))}
        />
      </Stack>
      <Switch
        label={t('explore.avoidCenter')}
        checked={spec.constraints.avoidCenter}
        onChange={(e) => {
          const v = e.currentTarget.checked;
          setSpec((s) => void (s.constraints.avoidCenter = v));
        }}
      />
      <Switch
        label={t('explore.keepInFrame')}
        checked={spec.constraints.keepInFrame}
        onChange={(e) => {
          const v = e.currentTarget.checked;
          setSpec((s) => void (s.constraints.keepInFrame = v));
        }}
      />
      <Text size="xs" c="dimmed">
        {t('explore.lockHint')}
      </Text>
      <Button size="xs" variant="default" onClick={resetSpec}>
        {t('explore.resetConditions')}
      </Button>
    </Stack>
  );
}
