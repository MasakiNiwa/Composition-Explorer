/**
 * Floating controls drawn over the mobile canvas: evaluation score chip,
 * explore button (with settings), and the candidate strip.
 */
import { ActionIcon, Badge, Box, Group, Loader, RingProgress, ScrollArea, Text, UnstyledButton } from '@mantine/core';
import {
  IconAdjustmentsHorizontal,
  IconPlayerStopFilled,
  IconSparkles,
  IconStar,
  IconStarFilled,
  IconX,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Thumbnail } from '@/components/exploration/Thumbnail';
import { useCompositionStore } from '@/state/compositionStore';
import { useEvaluation } from '@/state/useEvaluation';
import { useExplorationStore } from '@/state/explorationStore';
import { useLibraryStore } from '@/state/libraryStore';
import { useRunExploration } from '@/state/useRunExploration';
import { useViewStore } from '@/state/viewStore';

const glass = {
  background: 'color-mix(in srgb, var(--mantine-color-body) 82%, transparent)',
  boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
} as const;

const scoreColor = (v: number) => (v >= 75 ? 'teal' : v >= 50 ? 'indigo' : v >= 25 ? 'yellow' : 'gray');

/** Live overall score; tap to open the evaluation sheet. */
export function ScoreChip({ onOpen }: { onOpen: () => void }) {
  const { t } = useTranslation();
  const ev = useEvaluation();
  const preset = useViewStore((s) => s.preset);
  return (
    <UnstyledButton
      onClick={onOpen}
      aria-label={t('mobile.openEvaluation')}
      style={{ ...glass, borderRadius: 999, padding: '2px 10px 2px 2px' }}
    >
      <Group gap={6} wrap="nowrap">
        <RingProgress
          size={34}
          thickness={4}
          roundCaps
          sections={[{ value: ev.overall, color: scoreColor(ev.overall) }]}
          label={
            <Text ta="center" fw={700} size="10px">
              {Math.round(ev.overall)}
            </Text>
          }
        />
        <Text size="xs" fw={600} maw={130} truncate>
          {t(`presets.${preset}`)}
        </Text>
      </Group>
    </UnstyledButton>
  );
}

/** Primary action: run exploration (or cancel); secondary: open its settings. */
export function ExploreFab({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { t } = useTranslation();
  const { running, progress, cancel, spec } = useExplorationStore();
  const run = useRunExploration();
  const pct = progress ? (progress.done / Math.max(1, progress.total)) * 100 : 0;
  return (
    <Group gap={8} wrap="nowrap">
      <ActionIcon
        size={44}
        radius="xl"
        variant="default"
        style={glass}
        aria-label={t('mobile.exploreSettings')}
        onClick={onOpenSettings}
      >
        <IconAdjustmentsHorizontal size={22} />
      </ActionIcon>
      <UnstyledButton
        onClick={() => (running ? cancel() : void run())}
        aria-label={running ? t('explore.cancel') : t('explore.run')}
        style={{
          height: 52,
          padding: '0 18px 0 14px',
          borderRadius: 26,
          color: 'white',
          background: running
            ? 'var(--mantine-color-red-6)'
            : 'linear-gradient(135deg, var(--mantine-color-indigo-6), var(--mantine-color-grape-6))',
          boxShadow: '0 4px 14px rgba(76,110,245,0.45)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {running ? <IconPlayerStopFilled size={20} /> : <IconSparkles size={22} />}
        <Text fw={700} size="sm" c="white">
          {running
            ? `${Math.round(pct)}%`
            : spec.mode === 'mutate'
              ? t('explore.modeMutate')
              : t('mobile.tools.explore')}
        </Text>
        {running && <Loader size={14} color="white" />}
      </UnstyledButton>
    </Group>
  );
}

/** Horizontal filmstrip of candidates; tap to load onto the canvas. */
export function CandidateStrip({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { result, activeIndex, setActive } = useExplorationStore();
  const setComposition = useCompositionStore((s) => s.setComposition);
  const select = useViewStore((s) => s.select);
  const favorites = useLibraryStore((s) => s.favorites);
  const { addFavorite, removeFavorite } = useLibraryStore();
  if (!result || result.candidates.length === 0) return null;

  return (
    <Box style={{ ...glass, borderRadius: 14, padding: 6 }}>
      <Group justify="space-between" px={4} mb={4} wrap="nowrap">
        <Text size="xs" fw={600}>
          {t('mobile.candidates', { n: result.candidates.length })}
        </Text>
        <ActionIcon size="sm" variant="subtle" color="gray" aria-label={t('mobile.close')} onClick={onClose}>
          <IconX size={16} />
        </ActionIcon>
      </Group>
      <ScrollArea type="never">
        <Group gap={6} wrap="nowrap">
          {result.candidates.map((c, i) => {
            const fav = favorites.find((f) => JSON.stringify(f.composition) === JSON.stringify(c.composition));
            const active = activeIndex === i;
            return (
              <Box key={`${c.index}-${i}`} style={{ position: 'relative', flex: '0 0 auto' }}>
                <UnstyledButton
                  onClick={() => {
                    setComposition(c.composition);
                    setActive(i);
                    select(null);
                  }}
                  style={{
                    display: 'block',
                    width: 64,
                    borderRadius: 8,
                    overflow: 'hidden',
                    outline: active
                      ? '3px solid var(--mantine-color-indigo-6)'
                      : '1px solid var(--mantine-color-default-border)',
                    outlineOffset: active ? 0 : -1,
                  }}
                  aria-label={`#${i + 1}`}
                >
                  <Thumbnail composition={c.composition} uid={`strip-${c.index}-${i}`} />
                </UnstyledButton>
                <Badge
                  size="xs"
                  variant="filled"
                  color="dark"
                  style={{ position: 'absolute', left: 2, top: 2, opacity: 0.8 }}
                >
                  {Math.round(c.score)}
                </Badge>
                <ActionIcon
                  size="sm"
                  radius="xl"
                  variant="filled"
                  color={fav ? 'yellow' : 'dark'}
                  style={{ position: 'absolute', right: 2, top: 2, opacity: fav ? 1 : 0.7 }}
                  aria-label={t('library.favorite')}
                  onClick={() =>
                    fav ? removeFavorite(fav.id) : addFavorite(c.composition, { metrics: c.metrics, tags: c.tags })
                  }
                >
                  {fav ? <IconStarFilled size={12} /> : <IconStar size={12} />}
                </ActionIcon>
              </Box>
            );
          })}
        </Group>
      </ScrollArea>
    </Box>
  );
}
