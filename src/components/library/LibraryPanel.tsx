import {
  ActionIcon,
  Button,
  Card,
  Divider,
  Group,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconHistory, IconPhotoUp, IconStar, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Thumbnail } from '@/components/exploration/Thumbnail';
import { useCompositionStore } from '@/state/compositionStore';
import { useExplorationStore } from '@/state/explorationStore';
import { useLibraryStore } from '@/state/libraryStore';
import { useViewStore } from '@/state/viewStore';

export function LibraryPanel() {
  const { t, i18n } = useTranslation();
  const { favorites, history, addFavorite, removeFavorite, renameFavorite, removeHistory, clearHistory, isFavorite } =
    useLibraryStore();
  const composition = useCompositionStore((s) => s.composition);
  const setComposition = useCompositionStore((s) => s.setComposition);
  const restore = useExplorationStore((s) => s.restore);
  const { select, setRightTab } = useViewStore();
  const fmtDate = (ms: number) => new Date(ms).toLocaleString(i18n.language);
  const load = (c: typeof composition) => {
    setComposition(c);
    select(null);
  };

  return (
    <Stack gap="sm">
      <Button
        variant="light"
        color="yellow"
        leftSection={<IconStar size={16} />}
        disabled={isFavorite(composition)}
        onClick={() => {
          addFavorite(composition);
          notifications.show({ message: t('library.added') });
        }}
      >
        {t('library.addCurrent')}
      </Button>

      <Text fw={600} size="sm">
        {t('library.favorites')} ({favorites.length})
      </Text>
      {favorites.length === 0 && (
        <Text size="xs" c="dimmed">
          {t('library.noFavorites')}
        </Text>
      )}
      <SimpleGrid cols={2} spacing="xs">
        {favorites.map((f) => (
          <Card key={f.id} withBorder padding={4}>
            <UnstyledButton onClick={() => load(f.composition)} style={{ display: 'block', width: '100%' }}>
              <Thumbnail composition={f.composition} uid={`fav-${f.id}`} />
            </UnstyledButton>
            <TextInput
              size="xs"
              mt={4}
              variant="unstyled"
              placeholder={t('library.untitled')}
              value={f.name}
              onChange={(e) => renameFavorite(f.id, e.currentTarget.value)}
            />
            <Group justify="space-between" gap={2} wrap="nowrap">
              <Text size="10px" c="dimmed" truncate>
                {fmtDate(f.createdAt)}
              </Text>
              <ActionIcon
                size="sm"
                variant="subtle"
                color="red"
                aria-label={t('common.delete')}
                onClick={() => removeFavorite(f.id)}
              >
                <IconTrash size={14} />
              </ActionIcon>
            </Group>
          </Card>
        ))}
      </SimpleGrid>

      <Divider />
      <Group justify="space-between">
        <Text fw={600} size="sm">
          {t('library.history')} ({history.length})
        </Text>
        {history.length > 0 && (
          <Button
            size="compact-xs"
            variant="subtle"
            color="red"
            onClick={() =>
              modals.openConfirmModal({
                title: t('library.clearHistory'),
                labels: { confirm: t('library.clearHistory'), cancel: t('common.cancel') },
                confirmProps: { color: 'red' },
                onConfirm: clearHistory,
              })
            }
          >
            {t('library.clearHistory')}
          </Button>
        )}
      </Group>
      {history.length === 0 && (
        <Text size="xs" c="dimmed">
          {t('library.noHistory')}
        </Text>
      )}
      {history.map((h) => (
        <Card key={h.id} withBorder padding="xs">
          <Group gap="xs" wrap="nowrap" align="flex-start">
            <div style={{ width: 56, flexShrink: 0 }}>
              <Thumbnail composition={h.template} uid={`hist-${h.id}`} />
            </div>
            <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
              <Text size="xs" fw={600}>
                {h.mode === 'mutate' ? t('explore.modeMutate') : t('explore.modeExplore')} · {h.candidates.length}
                {t('library.candidatesSuffix')}
              </Text>
              <Text size="10px" c="dimmed">
                {fmtDate(h.createdAt)} · seed {h.seed} · D {Math.round(h.discovery * 100)}%
              </Text>
              <Group gap={4} mt={2}>
                <Tooltip label={t('library.showResults')}>
                  <ActionIcon
                    size="sm"
                    variant="light"
                    aria-label={t('library.showResults')}
                    onClick={() => {
                      restore(h);
                      setRightTab('explore');
                    }}
                  >
                    <IconHistory size={14} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label={t('library.loadTemplate')}>
                  <ActionIcon
                    size="sm"
                    variant="light"
                    aria-label={t('library.loadTemplate')}
                    onClick={() => load(h.template)}
                  >
                    <IconPhotoUp size={14} />
                  </ActionIcon>
                </Tooltip>
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  color="red"
                  aria-label={t('common.delete')}
                  onClick={() => removeHistory(h.id)}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Group>
            </Stack>
          </Group>
        </Card>
      ))}
    </Stack>
  );
}
