import { ActionIcon, Button, FileButton, Group, Menu, Text, Tooltip } from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconDownload,
  IconEraser,
  IconBraces,
  IconFileTypePng,
  IconFileTypeSvg,
  IconPhoto,
  IconUpload,
  IconStack2,
  IconLayersSubtract,
  IconMessageCode,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import { parseComposition } from '@/core/model/composition';
import { exportAiMap, exportJson, exportPng, exportSvg } from '@/render/export';
import { compositionPrompt } from '@/core/prompt/prompt';
import { useCompositionStore } from '@/state/compositionStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useViewStore } from '@/state/viewStore';

export function EditorToolbar() {
  const { t } = useTranslation();
  const composition = useCompositionStore((s) => s.composition);
  const { clear, loadSample, setComposition } = useCompositionStore();
  const { undo, redo, pastStates, futureStates } = useStore(useCompositionStore.temporal);
  const { guides, showGrid, showHorizon, select } = useViewStore();
  const { palette, exportSize, exportGuides } = useSettingsStore();
  const sceneOpts = {
    palette,
    showGrid,
    showHorizon,
    guides: exportGuides ? guides : [],
  };

  const confirmClear = () =>
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
    });

  const importJson = async (file: File | null) => {
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
  };

  const run = async (fn: () => void | Promise<void>) => {
    try {
      await fn();
    } catch (e) {
      notifications.show({
        color: 'red',
        message: String(e instanceof Error ? e.message : e),
      });
    }
  };

  return (
    <Group gap={6} justify="space-between" wrap="wrap">
      <Group gap={4} wrap="nowrap">
        <Tooltip label={`${t('toolbar.undo')} (Ctrl+Z)`}>
          <ActionIcon
            variant="default"
            size="lg"
            disabled={pastStates.length === 0}
            onClick={() => undo()}
            aria-label={t('toolbar.undo')}
          >
            <IconArrowBackUp size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={`${t('toolbar.redo')} (Ctrl+Shift+Z)`}>
          <ActionIcon
            variant="default"
            size="lg"
            disabled={futureStates.length === 0}
            onClick={() => redo()}
            aria-label={t('toolbar.redo')}
          >
            <IconArrowForwardUp size={18} />
          </ActionIcon>
        </Tooltip>
        <Button variant="default" color="red" leftSection={<IconEraser size={18} />} onClick={confirmClear}>
          {t('toolbar.clear')}
        </Button>
        <Tooltip label={t('toolbar.sample')}>
          <ActionIcon
            variant="default"
            size="lg"
            aria-label={t('toolbar.sample')}
            onClick={() => {
              loadSample();
              select(null);
            }}
          >
            <IconPhoto size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>
      <Group gap={4} wrap="nowrap">
        <FileButton onChange={importJson} accept="application/json,.json">
          {(props) => (
            <Button {...props} variant="default" leftSection={<IconUpload size={18} />}>
              {t('toolbar.import')}
            </Button>
          )}
        </FileButton>
        <Menu shadow="md" position="bottom-end">
          <Menu.Target>
            <Button leftSection={<IconDownload size={18} />}>{t('toolbar.export')}</Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconFileTypePng size={16} />}
              onClick={() => run(() => exportPng(composition, sceneOpts, exportSize))}
            >
              PNG ({exportSize}px)
            </Menu.Item>
            <Menu.Item
              leftSection={<IconFileTypeSvg size={16} />}
              onClick={() => run(() => exportSvg(composition, sceneOpts, exportSize))}
            >
              SVG
            </Menu.Item>
            <Menu.Item leftSection={<IconBraces size={16} />} onClick={() => run(() => exportJson(composition))}>
              JSON
            </Menu.Item>
            <Menu.Divider />
            <Menu.Label>{t('toolbar.aiExports')}</Menu.Label>
            <Menu.Item
              leftSection={<IconStack2 size={16} />}
              onClick={() => run(() => exportAiMap(composition, 'depth', exportSize))}
            >
              {t('toolbar.depthMap')}
            </Menu.Item>
            <Menu.Item
              leftSection={<IconLayersSubtract size={16} />}
              onClick={() => run(() => exportAiMap(composition, 'segmentation', exportSize))}
            >
              {t('toolbar.segmentation')}
            </Menu.Item>
            <Menu.Item
              leftSection={<IconMessageCode size={16} />}
              onClick={() =>
                run(async () => {
                  const text = compositionPrompt(composition);
                  try {
                    await navigator.clipboard.writeText(text);
                    notifications.show({ title: t('toolbar.promptCopied'), message: text });
                  } catch {
                    notifications.show({ title: t('toolbar.prompt'), message: text, autoClose: false });
                  }
                })
              }
            >
              {t('toolbar.copyPrompt')}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Group>
  );
}
