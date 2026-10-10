import { Box, Card, Paper, ScrollArea, Stack, Tabs, Text, Title } from '@mantine/core';
import { IconChartRadar, IconSparkles } from '@tabler/icons-react';
import { useHotkeys, useMediaQuery } from '@mantine/hooks';
import { useTranslation } from 'react-i18next';
import { CanvasView } from '@/components/editor/CanvasView';
import { EditorToolbar } from '@/components/editor/EditorToolbar';
import { ParameterPanels } from '@/components/editor/ParameterPanels';
import { InspectorPanel } from '@/components/editor/panels/InspectorPanel';
import { RoadmapCard } from '@/components/editor/RoadmapCard';
import { EvaluationPanel } from '@/components/evaluation/EvaluationPanel';
import { ExplorePanel } from '@/components/exploration/ExplorePanel';
import { useCompositionStore } from '@/state/compositionStore';
import { useViewStore } from '@/state/viewStore';

function useEditorHotkeys() {
  const { removeItem, duplicateItem } = useCompositionStore();
  const { selectedId, select } = useViewStore();
  const temporal = useCompositionStore.temporal.getState;
  useHotkeys([
    ['mod+Z', () => temporal().undo()],
    ['mod+shift+Z', () => temporal().redo()],
    ['mod+Y', () => temporal().redo()],
    ['Escape', () => select(null)],
    ['mod+D', () => selectedId && select(duplicateItem(selectedId))],
    ['Delete', () => selectedId && (removeItem(selectedId), select(null))],
    ['Backspace', () => selectedId && (removeItem(selectedId), select(null))],
  ]);
}

export function EditorPage() {
  const { t } = useTranslation();
  const desktop = useMediaQuery('(min-width: 62em)', true);
  const selectedId = useViewStore((s) => s.selectedId);
  useEditorHotkeys();

  const inspector = (
    <Card withBorder padding="sm">
      <Title order={6} mb="xs">
        {t('sections.inspector')}
      </Title>
      <InspectorPanel />
    </Card>
  );

  const analysis = (
    <Card withBorder padding="sm">
      <Tabs defaultValue="explore" keepMounted={false}>
        <Tabs.List grow mb="sm">
          <Tabs.Tab value="explore" leftSection={<IconSparkles size={16} />}>
            {t('sections.explore')}
          </Tabs.Tab>
          <Tabs.Tab value="evaluation" leftSection={<IconChartRadar size={16} />}>
            {t('sections.evaluation')}
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="explore">
          <ExplorePanel />
        </Tabs.Panel>
        <Tabs.Panel value="evaluation">
          <EvaluationPanel />
        </Tabs.Panel>
      </Tabs>
    </Card>
  );

  if (desktop) {
    return (
      <Box
        style={{
          display: 'grid',
          gridTemplateColumns: '320px 1fr 340px',
          height: 'calc(100dvh - 56px)',
        }}
      >
        <ScrollArea
          style={{
            borderRight: '1px solid var(--mantine-color-default-border)',
          }}
        >
          <Box p="sm">
            <ParameterPanels />
          </Box>
        </ScrollArea>
        <Stack gap="sm" p="sm" style={{ minWidth: 0, minHeight: 0 }}>
          <EditorToolbar />
          <Paper withBorder bg="var(--mantine-color-default-hover)" p="md" style={{ flex: 1, minHeight: 0 }}>
            <CanvasView />
          </Paper>
          <Text size="xs" c="dimmed" ta="center">
            {t('editor.canvasHint')}
          </Text>
        </Stack>
        <ScrollArea
          style={{
            borderLeft: '1px solid var(--mantine-color-default-border)',
          }}
        >
          <Stack p="sm" gap="sm">
            {selectedId && inspector}
            {analysis}
            <RoadmapCard />
          </Stack>
        </ScrollArea>
      </Box>
    );
  }

  return (
    <Stack gap="sm" p="sm">
      <EditorToolbar />
      <Paper withBorder bg="var(--mantine-color-default-hover)" p="xs" h="min(60dvh, 560px)">
        <CanvasView />
      </Paper>
      <Text size="xs" c="dimmed" ta="center">
        {t('editor.canvasHint')}
      </Text>
      {selectedId && inspector}
      {analysis}
      <ParameterPanels />
      <RoadmapCard />
    </Stack>
  );
}
