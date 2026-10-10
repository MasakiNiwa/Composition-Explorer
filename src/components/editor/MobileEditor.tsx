import { Box, Group, Paper, SegmentedControl, Stack, Text, UnstyledButton } from '@mantine/core';
import {
  IconBox,
  IconChartRadar,
  IconPointer,
  IconFrame,
  IconGridDots,
  IconLine,
  IconPerspective,
  IconSparkles,
  type Icon,
} from '@tabler/icons-react';
import { useEffect, useRef, useState, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { EvaluationPanel } from '@/components/evaluation/EvaluationPanel';
import { ConditionsPanel } from '@/components/exploration/ConditionsPanel';
import { ExplorePanel } from '@/components/exploration/ExplorePanel';
import { LibraryPanel } from '@/components/library/LibraryPanel';
import { useViewStore } from '@/state/viewStore';
import { useExplorationStore } from '@/state/explorationStore';
import { CandidateStrip, ExploreFab, ScoreChip } from './MobileOverlays';
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

type ToolKey = 'selected' | 'horizon' | 'perspective' | 'objects' | 'canvas' | 'guides';
type SheetKey = ToolKey | 'explore' | 'evaluation';

interface ToolDef {
  key: SheetKey;
  icon: Icon;
  Panel: ComponentType;
  label: string;
}

/** Editing tool groups shown in the bottom bar (like a photo editor). */
const TOOLS: ToolDef[] = [
  { key: 'horizon', icon: IconLine, Panel: HorizonPanel, label: 'mobile.tools.horizon' },
  { key: 'perspective', icon: IconPerspective, Panel: PerspectivePanel, label: 'mobile.tools.perspective' },
  { key: 'objects', icon: IconBox, Panel: ObjectsPanel, label: 'mobile.tools.objects' },
  { key: 'canvas', icon: IconFrame, Panel: CanvasPanel, label: 'mobile.tools.canvas' },
  { key: 'guides', icon: IconGridDots, Panel: GuidesPanel, label: 'mobile.tools.guides' },
];
const SELECTED_TOOL: ToolDef = {
  key: 'selected',
  icon: IconPointer,
  Panel: InspectorPanel,
  label: 'mobile.tools.selected',
};

/** Explore settings, conditions and library in one sheet (opened from the explore button). */
function ExploreSheet({ onStarted }: { onStarted: () => void }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'settings' | 'conditions' | 'library'>('settings');
  return (
    <Stack gap="sm">
      <SegmentedControl
        fullWidth
        size="xs"
        value={tab}
        onChange={(v) => setTab(v as typeof tab)}
        data={[
          { value: 'settings', label: t('mobile.exploreTabs.settings') },
          { value: 'conditions', label: t('mobile.exploreTabs.conditions') },
          { value: 'library', label: t('mobile.exploreTabs.library') },
        ]}
      />
      {tab === 'settings' && <ExplorePanel compact onStarted={onStarted} />}
      {tab === 'conditions' && <ConditionsPanel />}
      {tab === 'library' && <LibraryPanel />}
    </Stack>
  );
}

const SHEETS: ToolDef[] = [
  SELECTED_TOOL,
  ...TOOLS,
  { key: 'explore', icon: IconSparkles, Panel: () => null, label: 'mobile.tools.explore' },
  { key: 'evaluation', icon: IconChartRadar, Panel: EvaluationPanel, label: 'mobile.tools.evaluation' },
];

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
        flex: '1 1 0',
        minWidth: 0,
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
      <Text size="10px" fw={active ? 700 : 500} c="inherit" lh={1.1} ta="center" truncate maw="100%">
        {label}
      </Text>
    </UnstyledButton>
  );
}

/**
 * Phone layout (fixed between the header and the bottom navigation):
 *   shortcut bar → canvas (score chip, explore button, candidate strip float
 *   over it; panels open as a bottom sheet over it) → editing tool groups.
 */
export function MobileEditor() {
  const { t } = useTranslation();
  const { selectedId, sheetTranslucent, setSheetTranslucent } = useViewStore();
  const result = useExplorationStore((s) => s.result);
  const [active, setActive] = useState<SheetKey | null>(null);
  const [shown, setShown] = useState<SheetKey | null>(null); // keeps content during the close animation
  const [stripHidden, setStripHidden] = useState(false);
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
  // New results → show the strip again.
  useEffect(() => setStripHidden(false), [result]);

  const tools = selectedId ? [SELECTED_TOOL, ...TOOLS] : TOOLS;
  const current = SHEETS.find((x) => x.key === shown);
  const toggle = (k: SheetKey) => setActive((a) => (a === k ? null : k));
  const sheetOpen = active !== null;

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
      <Box
        style={{
          borderBottom: '1px solid var(--mantine-color-default-border)',
          background: 'var(--mantine-color-body)',
        }}
      >
        <MobileShortcutBar />
      </Box>

      <Box style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <Box p={6} h="100%">
          <Paper withBorder bg="var(--mantine-color-default-hover)" p={6} h="100%">
            <CanvasView />
          </Paper>
        </Box>

        <Box style={{ position: 'absolute', top: 14, left: 14, zIndex: 3 }}>
          <ScoreChip onOpen={() => toggle('evaluation')} />
        </Box>
        {!sheetOpen && (
          <Stack gap={8} style={{ position: 'absolute', left: 12, right: 12, bottom: 12, zIndex: 3 }} align="stretch">
            <Group justify="flex-end">
              <ExploreFab onOpenSettings={() => toggle('explore')} />
            </Group>
            {!stripHidden && <CandidateStrip onClose={() => setStripHidden(true)} />}
          </Stack>
        )}

        {current && (
          <BottomSheet
            open={sheetOpen}
            onClose={() => setActive(null)}
            title={t(current.label)}
            icon={current.icon}
            translucent={sheetTranslucent}
            onToggleTranslucent={() => setSheetTranslucent(!sheetTranslucent)}
            labels={{ close: t('mobile.close'), translucent: t('mobile.translucent') }}
          >
            {current.key === 'explore' ? <ExploreSheet onStarted={() => setActive(null)} /> : <current.Panel />}
          </BottomSheet>
        )}
      </Box>

      <Group
        gap={2}
        wrap="nowrap"
        px={4}
        py={4}
        style={{ borderTop: '1px solid var(--mantine-color-default-border)', background: 'var(--mantine-color-body)' }}
      >
        {tools.map((x) => (
          <ToolButton
            key={x.key}
            icon={x.icon}
            label={t(x.label)}
            active={active === x.key}
            accent={x.key === 'selected'}
            onClick={() => toggle(x.key)}
          />
        ))}
      </Group>
    </Box>
  );
}
