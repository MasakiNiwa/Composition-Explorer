import {
  ActionIcon,
  Button,
  Group,
  Progress,
  SegmentedControl,
  SimpleGrid,
  Slider,
  Stack,
  Switch,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconDice5, IconPlayerStop, IconSparkles } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { PRESET_KEYS, type PresetKey } from '@/core/evaluation/presets';
import type { ExplorationMode } from '@/core/exploration/spec';
import { SHOTS, type ShotChoice } from '@/core/exploration/cameraWork';
import { randomSeed } from '@/core/random/prng';
import { useCompositionStore } from '@/state/compositionStore';
import { useExplorationStore } from '@/state/explorationStore';
import { useViewStore } from '@/state/viewStore';
import { CandidateCard } from './CandidateCard';
import { useRunExploration } from '@/state/useRunExploration';
import { AdaptiveSelect } from '@/components/common/AdaptiveSelect';

const CANDIDATE_COUNTS = [200, 500, 1000, 2000, 5000, 10000, 20000];

interface Props {
  /** Hide the candidate grid (mobile shows results in a strip over the canvas). */
  compact?: boolean;
  /** Called after the run button starts an exploration. */
  onStarted?: () => void;
}

export function ExplorePanel({ compact = false, onStarted }: Props) {
  const { t } = useTranslation();
  const { spec, setSpec, cancel, running, progress, result, error, activeIndex, setActive } = useExplorationStore();
  const setComposition = useCompositionStore((s) => s.setComposition);
  const { preset, setPreset, select } = useViewStore();

  const runExploration = useRunExploration();
  const start = () => {
    void runExploration();
    onStarted?.();
  };

  return (
    <Stack gap="sm">
      <SegmentedControl
        fullWidth
        value={spec.mode}
        onChange={(v) => setSpec((s) => void (s.mode = v as ExplorationMode))}
        data={[
          { value: 'explore', label: t('explore.modeExplore') },
          { value: 'mutate', label: t('explore.modeMutate') },
        ]}
      />
      <Text size="xs" c="dimmed">
        {spec.mode === 'explore' ? t('explore.modeExploreHint') : t('explore.modeMutateHint')}
      </Text>
      <Stack gap={2}>
        <Group justify="space-between">
          <Text size="xs" fw={600}>
            Masterpiece
          </Text>
          <Text size="xs" fw={600}>
            Discovery
          </Text>
        </Group>
        <Slider
          value={spec.discovery}
          min={0}
          max={1}
          step={0.05}
          color="grape"
          label={(v) => t('explore.discoveryLabel', { m: Math.round((1 - v) * 100), d: Math.round(v * 100) })}
          onChange={(v) => setSpec((s) => void (s.discovery = v))}
        />
        <Text size="xs" c="dimmed">
          {t('explore.discoveryHint')}
        </Text>
      </Stack>
      <Stack gap={2}>
        <Text size="sm">
          {t('explore.diversity')}: {Math.round(spec.diversity * 100)}%
        </Text>
        <Slider
          value={spec.diversity}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => setSpec((s) => void (s.diversity = v))}
        />
      </Stack>
      <AdaptiveSelect
        label={t('evaluation.preset')}
        value={preset}
        allowDeselect={false}
        data={PRESET_KEYS.map((k) => ({ value: k, label: t(`presets.${k}`) }))}
        onChange={(v) => v && setPreset(v as PresetKey)}
      />
      <AdaptiveSelect
        label={t('explore.shot')}
        description={t('explore.shotHint')}
        value={spec.shot}
        allowDeselect={false}
        data={(['auto', ...SHOTS] as ShotChoice[]).map((k) => ({ value: k, label: t(`explore.shots.${k}`) }))}
        onChange={(v) => v && setSpec((s) => void (s.shot = v as ShotChoice))}
      />
      <Switch
        label={t('explore.cameraWork')}
        description={t('explore.cameraWorkHint')}
        checked={spec.cameraWork}
        onChange={(e) => {
          const v = e.currentTarget.checked;
          setSpec((s) => void (s.cameraWork = v));
        }}
      />
      <Group gap="xs" grow align="flex-end">
        <AdaptiveSelect
          label={t('explore.candidates')}
          value={String(spec.candidates)}
          allowDeselect={false}
          data={CANDIDATE_COUNTS.map((n) => ({ value: String(n), label: n.toLocaleString() }))}
          onChange={(v) => v && setSpec((s) => void (s.candidates = Number(v)))}
        />
        <AdaptiveSelect
          label={t('explore.present')}
          value={String(spec.present)}
          allowDeselect={false}
          data={['4', '6', '8', '10', '12', '16', '20']}
          onChange={(v) => v && setSpec((s) => void (s.present = Number(v)))}
        />
      </Group>
      <Group gap="xs" wrap="nowrap">
        <Text size="xs" c="dimmed" style={{ flex: 1 }}>
          {t('explore.seed')}: {spec.seed}
        </Text>
        <Tooltip label={t('canvas.newSeed')}>
          <ActionIcon
            variant="light"
            aria-label={t('canvas.newSeed')}
            onClick={() => setSpec((s) => void (s.seed = randomSeed()))}
          >
            <IconDice5 size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
      {running ? (
        <Stack gap={4}>
          <Progress value={progress ? (progress.done / progress.total) * 100 : 0} animated />
          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              {progress?.done.toLocaleString()} / {progress?.total.toLocaleString()}
            </Text>
            <Button size="xs" variant="light" color="red" leftSection={<IconPlayerStop size={14} />} onClick={cancel}>
              {t('explore.cancel')}
            </Button>
          </Group>
        </Stack>
      ) : (
        <Button
          leftSection={<IconSparkles size={18} />}
          onClick={start}
          variant="gradient"
          gradient={{ from: 'indigo', to: 'grape' }}
        >
          {spec.mode === 'mutate' ? t('explore.runMutate') : t('explore.run')}
        </Button>
      )}
      {error && (
        <Text size="xs" c="red">
          {error}
        </Text>
      )}
      {result && !compact && (
        <>
          <Text size="xs" c="dimmed">
            {result.backend === 'history'
              ? t('explore.restored')
              : t('explore.stats', {
                  n: result.generated.toLocaleString(),
                  rejected: result.rejected.toLocaleString(),
                  ms: Math.round(result.elapsedMs),
                  workers: result.workers,
                })}
          </Text>
          <SimpleGrid cols={2} spacing="xs">
            {result.candidates.map((c, i) => (
              <CandidateCard
                key={`${c.index}-${i}`}
                candidate={c}
                rank={i + 1}
                active={activeIndex === i}
                onApply={() => {
                  setComposition(c.composition);
                  setActive(i);
                  select(null);
                }}
              />
            ))}
          </SimpleGrid>
          <Text size="xs" c="dimmed">
            {t('explore.applyHint')}
          </Text>
        </>
      )}
    </Stack>
  );
}
