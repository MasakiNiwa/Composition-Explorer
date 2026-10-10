import { Alert, Group, Progress, RingProgress, Select, Stack, Switch, Text, Tooltip } from '@mantine/core';
import { IconAlertTriangle, IconCircleCheck, IconInfoCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { METRIC_KEYS } from '@/core/evaluation/metrics';
import { PRESET_KEYS, type PresetKey } from '@/core/evaluation/presets';
import { useEvaluation } from '@/state/useEvaluation';
import { useViewStore } from '@/state/viewStore';
import { RadarChart } from './RadarChart';

const scoreColor = (v: number) => (v >= 75 ? 'teal' : v >= 50 ? 'indigo' : v >= 25 ? 'yellow' : 'gray');

export function EvaluationPanel() {
  const { t } = useTranslation();
  const ev = useEvaluation();
  const { preset, setPreset, showAnalysis, setShowAnalysis } = useViewStore();

  return (
    <Stack gap="sm">
      <Select
        label={t('evaluation.preset')}
        value={preset}
        allowDeselect={false}
        data={PRESET_KEYS.map((k) => ({ value: k, label: t(`presets.${k}`) }))}
        onChange={(v) => v && setPreset(v as PresetKey)}
      />
      <Group gap="sm" wrap="nowrap">
        <RingProgress
          size={84}
          thickness={8}
          roundCaps
          sections={[{ value: ev.overall, color: scoreColor(ev.overall) }]}
          label={
            <Text ta="center" fw={700} size="lg">
              {Math.round(ev.overall)}
            </Text>
          }
        />
        <Text size="xs" c="dimmed">
          {t('evaluation.overallHint')}
        </Text>
      </Group>
      <RadarChart
        values={METRIC_KEYS.map((k) => ev.metrics[k])}
        labels={METRIC_KEYS.map((k) => t(`metrics.${k}.short`))}
      />
      <Stack gap={6}>
        {METRIC_KEYS.map((k) => (
          <Tooltip key={k} label={t(`metrics.${k}.desc`)} multiline w={260} position="left" withArrow>
            <div>
              <Group justify="space-between" gap={4}>
                <Text size="xs">{t(`metrics.${k}.name`)}</Text>
                <Text size="xs" fw={600}>
                  {Math.round(ev.metrics[k])}
                </Text>
              </Group>
              <Progress value={ev.metrics[k]} color={scoreColor(ev.metrics[k])} size="sm" />
            </div>
          </Tooltip>
        ))}
      </Stack>
      <Switch
        size="sm"
        label={t('evaluation.overlay')}
        checked={showAnalysis}
        onChange={(e) => setShowAnalysis(e.currentTarget.checked)}
      />
      {ev.notes.length > 0 && (
        <Stack gap={6}>
          {ev.notes.map((n, i) => (
            <Alert
              key={i}
              p={8}
              color={n.tone === 'good' ? 'teal' : n.tone === 'warn' ? 'orange' : 'blue'}
              icon={
                n.tone === 'good' ? (
                  <IconCircleCheck size={16} />
                ) : n.tone === 'warn' ? (
                  <IconAlertTriangle size={16} />
                ) : (
                  <IconInfoCircle size={16} />
                )
              }
            >
              <Text size="xs">{t(`notes.${n.key}`, n.params)}</Text>
            </Alert>
          ))}
        </Stack>
      )}
      <Text size="xs" c="dimmed">
        {t('evaluation.disclaimer')}
      </Text>
    </Stack>
  );
}
