import { ActionIcon, Button, FileButton, Group, Menu, Text, Tooltip } from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconBraces,
  IconDownload,
  IconEraser,
  IconFileTypePng,
  IconFileTypeSvg,
  IconLayersSubtract,
  IconMessageCode,
  IconPhoto,
  IconPlus,
  IconStack2,
  IconTrash,
  IconUpload,
  IconUserPlus,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import { parseComposition, PROP_KINDS } from '@/core/model/composition';
import { compositionPrompt } from '@/core/prompt/prompt';
import { exportAiMap, exportJson, exportPng, exportSvg } from '@/render/export';
import { useCompositionStore } from '@/state/compositionStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useViewStore } from '@/state/viewStore';

/** Editor commands shared by the desktop toolbar and the mobile shortcut bar. */
function useEditorActions() {
  const { t } = useTranslation();
  const composition = useCompositionStore((s) => s.composition);
  const { clear, loadSample, setComposition } = useCompositionStore();
  const { undo, redo, pastStates, futureStates } = useStore(useCompositionStore.temporal);
  const { guides, showGrid, showHorizon, select } = useViewStore();
  const { palette, exportSize, exportGuides } = useSettingsStore();
  const sceneOpts = { palette, showGrid, showHorizon, guides: exportGuides ? guides : [] };

  const notifyError = (e: unknown) =>
    notifications.show({ color: 'red', message: String(e instanceof Error ? e.message : e) });
  const run = async (fn: () => void | Promise<void>) => {
    try {
      await fn();
    } catch (e) {
      notifyError(e);
    }
  };

  return {
    t,
    exportSize,
    canUndo: pastStates.length > 0,
    canRedo: futureStates.length > 0,
    undo: () => undo(),
    redo: () => redo(),
    loadSample: () => {
      loadSample();
      select(null);
    },
    confirmClear: () =>
      modals.openConfirmModal({
        title: t('toolbar.clearTitle'),
        children: <Text size="sm">{t('toolbar.clearBody')}</Text>,
        labels: { confirm: t('toolbar.clear'), cancel: t('common.cancel') },
        confirmProps: { color: 'red' },
        onConfirm: () => {
          clear();
          select(null);
          notifications.show({ message: t('toolbar.cleared') });
        },
      }),
    importJson: async (file: File | null) => {
      if (!file) return;
      try {
        const parsed = parseComposition(JSON.parse(await file.text()));
        if (!parsed.ok) throw new Error(parsed.error);
        setComposition(parsed.value);
        select(null);
        notifications.show({ color: 'teal', message: t('toolbar.imported') });
      } catch (e) {
        notifications.show({
          color: 'red',
          title: t('toolbar.importFailed'),
          message: String(e instanceof Error ? e.message : e),
        });
      }
    },
    exportPng: () => run(() => exportPng(composition, sceneOpts, exportSize)),
    exportSvg: () => run(() => exportSvg(composition, sceneOpts, exportSize)),
    exportJson: () => run(() => exportJson(composition)),
    exportDepth: () => run(() => exportAiMap(composition, 'depth', exportSize)),
    exportSegmentation: () => run(() => exportAiMap(composition, 'segmentation', exportSize)),
    copyPrompt: () =>
      run(async () => {
        const text = compositionPrompt(composition);
        try {
          await navigator.clipboard.writeText(text);
          notifications.show({ title: t('toolbar.promptCopied'), message: text });
        } catch {
          notifications.show({ title: t('toolbar.prompt'), message: text, autoClose: false });
        }
      }),
  };
}

type Actions = ReturnType<typeof useEditorActions>;

function ExportMenu({ a, target }: { a: Actions; target: ReactNode }) {
  const { t } = a;
  return (
    <Menu shadow="md" position="bottom-end">
      <Menu.Target>{target}</Menu.Target>
      <Menu.Dropdown>
        <Menu.Item leftSection={<IconFileTypePng size={16} />} onClick={a.exportPng}>
          PNG ({a.exportSize}px)
        </Menu.Item>
        <Menu.Item leftSection={<IconFileTypeSvg size={16} />} onClick={a.exportSvg}>
          SVG
        </Menu.Item>
        <Menu.Item leftSection={<IconBraces size={16} />} onClick={a.exportJson}>
          JSON
        </Menu.Item>
        <Menu.Divider />
        <Menu.Label>{t('toolbar.aiExports')}</Menu.Label>
        <Menu.Item leftSection={<IconStack2 size={16} />} onClick={a.exportDepth}>
          {t('toolbar.depthMap')}
        </Menu.Item>
        <Menu.Item leftSection={<IconLayersSubtract size={16} />} onClick={a.exportSegmentation}>
          {t('toolbar.segmentation')}
        </Menu.Item>
        <Menu.Item leftSection={<IconMessageCode size={16} />} onClick={a.copyPrompt}>
          {t('toolbar.copyPrompt')}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

/** Desktop toolbar above the canvas. */
export function EditorToolbar() {
  const a = useEditorActions();
  const { t } = a;
  return (
    <Group gap={6} justify="space-between" wrap="wrap">
      <Group gap={4} wrap="nowrap">
        <Tooltip label={`${t('toolbar.undo')} (Ctrl+Z)`}>
          <ActionIcon variant="default" size="lg" disabled={!a.canUndo} onClick={a.undo} aria-label={t('toolbar.undo')}>
            <IconArrowBackUp size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={`${t('toolbar.redo')} (Ctrl+Shift+Z)`}>
          <ActionIcon variant="default" size="lg" disabled={!a.canRedo} onClick={a.redo} aria-label={t('toolbar.redo')}>
            <IconArrowForwardUp size={18} />
          </ActionIcon>
        </Tooltip>
        <Button variant="default" color="red" leftSection={<IconEraser size={18} />} onClick={a.confirmClear}>
          {t('toolbar.clear')}
        </Button>
        <Tooltip label={t('toolbar.sample')}>
          <ActionIcon variant="default" size="lg" aria-label={t('toolbar.sample')} onClick={a.loadSample}>
            <IconPhoto size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>
      <Group gap={4} wrap="nowrap">
        <FileButton onChange={a.importJson} accept="application/json,.json">
          {(props) => (
            <Button {...props} variant="default" leftSection={<IconUpload size={18} />}>
              {t('toolbar.import')}
            </Button>
          )}
        </FileButton>
        <ExportMenu a={a} target={<Button leftSection={<IconDownload size={18} />}>{t('toolbar.export')}</Button>} />
      </Group>
    </Group>
  );
}

function Shortcut({
  label,
  onClick,
  disabled,
  color,
  children,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  color?: string;
  children: ReactNode;
}) {
  return (
    <ActionIcon
      variant="subtle"
      color={color ?? 'gray'}
      size={40}
      radius="xl"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </ActionIcon>
  );
}

/** Mobile: one row of icon shortcuts just above the tool groups. */
export function MobileShortcutBar() {
  const a = useEditorActions();
  const { t } = a;
  const { addFigure, addProp, removeItem } = useCompositionStore();
  const { selectedId, select } = useViewStore();

  return (
    <Group gap={0} justify="space-between" wrap="nowrap" px={4}>
      <Shortcut label={t('toolbar.undo')} disabled={!a.canUndo} onClick={a.undo}>
        <IconArrowBackUp size={22} />
      </Shortcut>
      <Shortcut label={t('toolbar.redo')} disabled={!a.canRedo} onClick={a.redo}>
        <IconArrowForwardUp size={22} />
      </Shortcut>
      <Shortcut label={t('objects.addFigure')} onClick={() => select(addFigure())}>
        <IconUserPlus size={22} />
      </Shortcut>
      <Menu shadow="md" position="top" width={180}>
        <Menu.Target>
          <ActionIcon variant="subtle" color="gray" size={40} radius="xl" aria-label={t('objects.addProp')}>
            <IconPlus size={22} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>{t('objects.addProp')}</Menu.Label>
          {PROP_KINDS.map((k) => (
            <Menu.Item key={k} onClick={() => select(addProp(k))}>
              {t(`props.${k}`)}
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>
      <Shortcut
        label={t('common.delete')}
        color="red"
        disabled={!selectedId}
        onClick={() => {
          if (!selectedId) return;
          removeItem(selectedId);
          select(null);
        }}
      >
        <IconTrash size={22} />
      </Shortcut>
      <Shortcut label={t('toolbar.clear')} onClick={a.confirmClear}>
        <IconEraser size={22} />
      </Shortcut>
      <FileButton onChange={a.importJson} accept="application/json,.json">
        {(props) => (
          <ActionIcon {...props} variant="subtle" color="gray" size={40} radius="xl" aria-label={t('toolbar.import')}>
            <IconUpload size={22} />
          </ActionIcon>
        )}
      </FileButton>
      <ExportMenu
        a={a}
        target={
          <ActionIcon variant="light" size={40} radius="xl" aria-label={t('toolbar.export')}>
            <IconDownload size={22} />
          </ActionIcon>
        }
      />
    </Group>
  );
}
