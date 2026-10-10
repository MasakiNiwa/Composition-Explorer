import { ActionIcon, Badge, Card, Group, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { IconStar, IconStarFilled } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { Candidate } from '@/core/exploration/explore';
import { useLibraryStore } from '@/state/libraryStore';
import { Thumbnail } from './Thumbnail';

interface Props {
  candidate: Candidate;
  rank: number;
  active: boolean;
  onApply: () => void;
}

export function CandidateCard({ candidate: c, rank, active, onApply }: Props) {
  const { t } = useTranslation();
  const favorites = useLibraryStore((s) => s.favorites);
  const { addFavorite, removeFavorite } = useLibraryStore();
  const fav = favorites.find((f) => JSON.stringify(f.composition) === JSON.stringify(c.composition));

  return (
    <Card
      withBorder
      padding={4}
      style={{
        borderColor: active ? 'var(--mantine-color-indigo-6)' : undefined,
        borderWidth: active ? 2 : undefined,
      }}
    >
      <UnstyledButton onClick={onApply} style={{ display: 'block', width: '100%' }} aria-label={`#${rank}`}>
        <Thumbnail composition={c.composition} uid={`cand-${c.index}-${rank}`} />
      </UnstyledButton>
      <Group gap={4} mt={4} justify="space-between" wrap="nowrap">
        <Text size="xs" fw={700}>
          #{rank}
        </Text>
        <Group gap={2} wrap="nowrap">
          <Tooltip
            label={t('explore.scoreTooltip', { score: Math.round(c.score), novelty: Math.round(c.novelty * 100) })}
          >
            <Badge size="xs" variant="light">
              {Math.round(c.score)}
            </Badge>
          </Tooltip>
          <ActionIcon
            size="sm"
            variant="subtle"
            color="yellow"
            aria-label={t('library.favorite')}
            onClick={() =>
              fav ? removeFavorite(fav.id) : addFavorite(c.composition, { metrics: c.metrics, tags: c.tags })
            }
          >
            {fav ? <IconStarFilled size={14} /> : <IconStar size={14} />}
          </ActionIcon>
        </Group>
      </Group>
      <Group gap={2} mt={2}>
        {c.mutations?.map((m) => (
          <Badge key={m} size="xs" variant="light" color="grape" style={{ textTransform: 'none' }}>
            {t(`mutations.${m}`)}
          </Badge>
        ))}
        {c.tags.slice(0, c.mutations ? 2 : 3).map((tag) => (
          <Badge key={tag} size="xs" variant="outline" color="gray" style={{ textTransform: 'none' }}>
            {t(`tags.${tag}`)}
          </Badge>
        ))}
      </Group>
    </Card>
  );
}
