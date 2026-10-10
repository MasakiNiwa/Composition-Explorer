import { ActionIcon, Badge, Button, Group, Menu, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconLock, IconPlus, IconTrash, IconUser } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { LAYERS, PROP_KINDS } from '@/core/model/composition';
import { useCompositionStore } from '@/state/compositionStore';
import { useViewStore } from '@/state/viewStore';

export function ObjectsPanel() {
  const { t } = useTranslation();
  const c = useCompositionStore((s) => s.composition);
  const { addFigure, addProp, removeItem } = useCompositionStore();
  const { selectedId, select } = useViewStore();

  const rows = [
    ...c.figures.map((f, i) => ({
      id: f.id,
      label: `${t('objects.figure')} ${i + 1}`,
      layer: 'midground' as const,
      locked: f.locked,
      figure: true,
    })),
    ...c.props.map((p) => ({
      id: p.id,
      label: t(`props.${p.kind}`),
      layer: p.layer,
      locked: p.locked,
      figure: false,
    })),
  ];

  return (
    <Stack gap="xs">
      <Group gap="xs" grow>
        <Button size="xs" variant="light" leftSection={<IconUser size={16} />} onClick={() => select(addFigure())}>
          {t('objects.addFigure')}
        </Button>
        <Menu shadow="md" width={200} position="bottom-end">
          <Menu.Target>
            <Button size="xs" variant="light" leftSection={<IconPlus size={16} />}>
              {t('objects.addProp')}
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            {PROP_KINDS.map((k) => (
              <Menu.Item key={k} onClick={() => select(addProp(k))}>
                {t(`props.${k}`)}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      </Group>
      {rows.length === 0 && (
        <Text size="sm" c="dimmed">
          {t('objects.empty')}
        </Text>
      )}
      {LAYERS.slice()
        .reverse()
        .map((layer) => {
          const list = rows.filter((r) => r.layer === layer);
          if (list.length === 0) return null;
          return (
            <Stack key={layer} gap={2}>
              <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                {t(`layers.${layer}`)}
              </Text>
              {list.map((r) => (
                <Group
                  key={r.id}
                  gap="xs"
                  wrap="nowrap"
                  px={6}
                  py={2}
                  style={{
                    borderRadius: 6,
                    background: r.id === selectedId ? 'var(--mantine-color-indigo-light)' : undefined,
                  }}
                >
                  <UnstyledButton style={{ flex: 1 }} onClick={() => select(r.id)}>
                    <Group gap={6} wrap="nowrap">
                      <Text size="sm">{r.label}</Text>
                      {r.figure && (
                        <Badge size="xs" variant="light">
                          {t('objects.figureBadge')}
                        </Badge>
                      )}
                      {r.locked && <IconLock size={14} />}
                    </Group>
                  </UnstyledButton>
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    color="red"
                    aria-label={t('common.delete')}
                    onClick={() => {
                      removeItem(r.id);
                      if (selectedId === r.id) select(null);
                    }}
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </Group>
              ))}
            </Stack>
          );
        })}
    </Stack>
  );
}
