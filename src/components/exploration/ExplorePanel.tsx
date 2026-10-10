import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Progress,
  Select,
  SimpleGrid,
  Slider,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { IconDice5, IconPlayerStop, IconSparkles } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { PRESET_KEYS, type PresetKey } from '@/core/evaluation/presets';
import { randomSeed } from '@/core/random/prng';
import { useCompositionStore } from '@/state/compositionStore';
import { useExplorationStore } from '@/state/explorationStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useViewStore } from '@/state/viewStore';
import { Thumbnail } from './Thumbnail';

const CANDIDATE_COUNTS = [200, 500, 1000, 2000, 5000, 10000, 20000];

export function ExplorePanel() {
  const { t } = useTranslation();
  const { spec, setSpec, run, cancel, running, progress, result, error, activeIndex, setActive } =
    useExplorationStore();
  const composition = useCompositionStore((s) => s.composition);
  const setComposition = useCompositionStore((s) => s.setComposition);
  const workerCount = useSettingsStore((s) => s.workerCount);
  const { preset, setPreset, select } = useViewStore();

  const start = () => {
    setSpec((s) => void (s.preset = preset));
    void run(composition, workerCount);
  };

  return (
    <Stack gap="sm">
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
      <Select
        label={t('evaluation.preset')}
        value={preset}
        allowDeselect={false}
        data={PRESET_KEYS.map((k) => ({ value: k, label: t(`presets.${k}`) }))}
        onChange={(v) => v && setPreset(v as PresetKey)}
      />
      <Group gap="xs" grow align="flex-end">
        <Select
          label={t('explore.candidates')}
          value={String(spec.candidates)}
          allowDeselect={false}
          data={CANDIDATE_COUNTS.map((n) => ({ value: String(n), label: n.toLocaleString() }))}
          onChange={(v) => v && setSpec((s) => void (s.candidates = Number(v)))}
        />
        <Select
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
          {t('explore.run')}
        </Button>
      )}
      {error && (
        <Text size="xs" c="red">
          {error}
        </Text>
      )}
      {result && (
        <>
          <Text size="xs" c="dimmed">
            {t('explore.stats', {
              n: result.generated.toLocaleString(),
              rejected: result.rejected.toLocaleString(),
              ms: Math.round(result.elapsedMs),
              workers: result.workers,
            })}
          </Text>
          <SimpleGrid cols={2} spacing="xs">
            {result.candidates.map((c, i) => (
              <UnstyledButton
                key={c.index}
                onClick={() => {
                  setComposition(c.composition);
                  setActive(i);
                  select(null);
                }}
              >
                <Card
                  withBorder
                  padding={4}
                  style={{
                    borderColor: activeIndex === i ? 'var(--mantine-color-indigo-6)' : undefined,
                    borderWidth: activeIndex === i ? 2 : undefined,
                  }}
                >
                  <Thumbnail composition={c.composition} uid={`cand-${c.index}`} />
                  <Group gap={4} mt={4} justify="space-between" wrap="nowrap">
                    <Text size="xs" fw={700}>
                      #{i + 1}
                    </Text>
                    <Tooltip
                      label={t('explore.scoreTooltip', {
                        score: Math.round(c.score),
                        novelty: Math.round(c.novelty * 100),
                      })}
                    >
                      <Badge size="xs" variant="light">
                        {Math.round(c.score)}
                      </Badge>
                    </Tooltip>
                  </Group>
                  <Group gap={2} mt={2}>
                    {c.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} size="xs" variant="outline" color="gray" style={{ textTransform: 'none' }}>
                        {t(`tags.${tag}`)}
                      </Badge>
                    ))}
                  </Group>
                </Card>
              </UnstyledButton>
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
