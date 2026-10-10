import { Badge, Card, Group, List, Text, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';

/** Shows which phases are available and what comes next. */
export function RoadmapCard() {
  const { t } = useTranslation();
  const phases = [
    { key: 'phase1', done: true },
    { key: 'phase2', done: true },
    { key: 'phase3', done: false },
    { key: 'phase4', done: false },
    { key: 'phase5', done: false },
  ];
  return (
    <Card withBorder padding="sm">
      <Title order={6} mb="xs">
        {t('roadmap.title')}
      </Title>
      <List spacing={4} size="sm" listStyleType="none">
        {phases.map((p) => (
          <List.Item key={p.key}>
            <Group gap={6} wrap="nowrap">
              <Badge
                size="xs"
                style={{ flexShrink: 0 }}
                color={p.done ? 'teal' : 'gray'}
                variant={p.done ? 'filled' : 'light'}
              >
                {p.done ? t('roadmap.done') : t('roadmap.planned')}
              </Badge>
              <Text size="sm">{t(`roadmap.${p.key}`)}</Text>
            </Group>
          </List.Item>
        ))}
      </List>
    </Card>
  );
}
