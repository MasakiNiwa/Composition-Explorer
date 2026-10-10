import { Box, Group, Paper, ScrollArea, Text, UnstyledButton } from '@mantine/core';
import {
  IconAdjustments,
  IconBox,
  IconChartRadar,
  IconPointer,
  IconFrame,
  IconGridDots,
  IconLine,
  IconPerspective,
  IconSparkles,
  IconStar,
  type Icon,
} from '@tabler/icons-react';
import { useEffect, useRef, useState, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { EvaluationPanel } from '@/components/evaluation/EvaluationPanel';
import { ConditionsPanel } from '@/components/exploration/ConditionsPanel';
import { ExplorePanel } from '@/components/exploration/ExplorePanel';
import { LibraryPanel } from '@/components/library/LibraryPanel';
import { useViewStore } from '@/state/viewStore';
import { CanvasView } from './CanvasView';
import { MobileShortcutBar } from './EditorToolbar';
import { BottomSheet } from './BottomSheet';
import { BOTTOM_NAV_SPACE, HEADER_HEIGHT } from '@/components/AppLayout';
import { CanvasPanel } from './panels/CanvasPanel';
import { GuidesPanel } from './panels/GuidesPanel';
import { HorizonPanel } from './panels/HorizonPanel';
import { InspectorPanel } from './panels/InspectorPanel';
import { ObjectsPanel } from './panels/ObjectsPanel';
import { PerspectivePanel } from './panels/PerspectivePanel';

type ToolKey =
  | 'selected'
  | 'explore'
  | 'horizon'
  | 'perspective'
  | 'objects'
  | 'canvas'
  | 'guides'
  | 'evaluation'
  | 'conditions'
  | 'library';

/**
 * Tool groups, ordered by how often they are used. Like a photo editor:
 * tap a group to open its controls in a sheet above the bar.
 */
const TOOLS: { key: Exclude<ToolKey, 'selected'>; icon: Icon; Panel: ComponentType; label: string }[] = [
  { key: 'explore', icon: IconSparkles, Panel: ExplorePanel, label: 'mobile.tools.explore' },
  { key: 'horizon', icon: IconLine, Panel: HorizonPanel, label: 'mobile.tools.horizon' },
  { key: 'perspective', icon: IconPerspective, Panel: PerspectivePanel, label: 'mobile.tools.perspective' },
  { key: 'objects', icon: IconBox, Panel: ObjectsPanel, label: 'mobile.tools.objects' },
  { key: 'canvas', icon: IconFrame, Panel: CanvasPanel, label: 'mobile.tools.canvas' },
  { key: 'guides', icon: IconGridDots, Panel: GuidesPanel, label: 'mobile.tools.guides' },
  { key: 'evaluation', icon: IconChartRadar, Panel: EvaluationPanel, label: 'mobile.tools.evaluation' },
  { key: 'conditions', icon: IconAdjustments, Panel: ConditionsPanel, label: 'mobile.tools.conditions' },
  { key: 'library', icon: IconStar, Panel: LibraryPanel, label: 'mobile.tools.library' },
];

const SELECTED_TOOL = {
  key: 'selected' as const,
  icon: IconPointer,
  Panel: InspectorPanel,
  label: 'mobile.tools.selected',
};

function ToolButton({
  icon: I,
  label,
  active,
  accent,
  onClick,
}: {
  icon: Icon;
  label: string;
  active: boolean;
  accent?: boolean;
  onClick: () => void;
}) {
  return (
    <UnstyledButton
      onClick={onClick}
      aria-pressed={active}
      style={{
        flex: '0 0 auto',
        width: 68,
        height: 56,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        borderRadius: 12,
        background: active ? 'var(--mantine-color-indigo-light)' : undefined,
        color: active || accent ? 'var(--mantine-color-indigo-6)' : 'var(--mantine-color-text)',
      }}
    >
      <I size={22} stroke={active ? 2.2 : 1.7} />
      <Text size="10px" fw={active ? 700 : 500} c="inherit" lh={1.1} ta="center">
        {label}
      </Text>
    </UnstyledButton>
  );
}

/**
 * Phone layout (fixed between the header and the bottom navigation): the
 * canvas fills the area and tool panels open as a bottom sheet over it, so
 * the canvas never shrinks. Shortcut bar and tool-group bar sit below.
 */
export function MobileEditor() {
  const { t } = useTranslation();
  const { selectedId, sheetTranslucent, setSheetTranslucent } = useViewStore();
  const [active, setActive] = useState<ToolKey | null>(null);
  const [shown, setShown] = useState<ToolKey | null>(null); // keeps content during the close animation
  const prevSelected = useRef<string | null>(null);

  // Selecting an object opens its controls; deselecting closes them.
  useEffect(() => {
    if (selectedId && selectedId !== prevSelected.current) setActive('selected');
    if (!selectedId && prevSelected.current) setActive((a) => (a === 'selected' ? null : a));
    prevSelected.current = selectedId;
  }, [selectedId]);
  useEffect(() => {
    if (active) setShown(active);
  }, [active]);

  const tools = selectedId ? [SELECTED_TOOL, ...TOOLS] : TOOLS;
  const current = [SELECTED_TOOL, ...TOOLS].find((x) => x.key === shown);

  return (
    <Box
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        top: HEADER_HEIGHT,
        bottom: BOTTOM_NAV_SPACE,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <Box p={6} h="100%">
          <Paper withBorder bg="var(--mantine-color-default-hover)" p={6} h="100%">
            <CanvasView />
          </Paper>
        </Box>
        {current && (
          <BottomSheet
            open={active !== null}
            onClose={() => setActive(null)}
            title={t(current.label)}
            icon={current.icon}
            translucent={sheetTranslucent}
            onToggleTranslucent={() => setSheetTranslucent(!sheetTranslucent)}
            labels={{ close: t('mobile.close'), translucent: t('mobile.translucent') }}
          >
            <current.Panel />
          </BottomSheet>
        )}
      </Box>

      <Box
        style={{ borderTop: '1px solid var(--mantine-color-default-border)', background: 'var(--mantine-color-body)' }}
      >
        <MobileShortcutBar />
      </Box>
      <ScrollArea
        type="never"
        style={{
          borderTop: '1px solid var(--mantine-color-default-border)',
          background: 'var(--mantine-color-body)',
          flexShrink: 0,
        }}
      >
        <Group gap={2} wrap="nowrap" px={4} py={4}>
          {tools.map((x) => (
            <ToolButton
              key={x.key}
              icon={x.icon}
              label={t(x.label)}
              active={active === x.key}
              accent={x.key === 'selected'}
              onClick={() => setActive((a) => (a === x.key ? null : x.key))}
            />
          ))}
        </Group>
      </ScrollArea>
    </Box>
  );
}
