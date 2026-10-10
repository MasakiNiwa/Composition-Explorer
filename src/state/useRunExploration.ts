import { notifications } from '@mantine/notifications';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useCompositionStore } from './compositionStore';
import { useExplorationStore } from './explorationStore';
import { useSettingsStore } from './settingsStore';
import { useViewStore } from './viewStore';

/** Start an exploration from the current composition with the current preset. */
export function useRunExploration() {
  const { t } = useTranslation();
  return useCallback(async () => {
    const { setSpec, run } = useExplorationStore.getState();
    setSpec((s) => void (s.preset = useViewStore.getState().preset));
    await run(useCompositionStore.getState().composition, useSettingsStore.getState().workerCount);
    const { error } = useExplorationStore.getState();
    if (error) notifications.show({ color: 'red', title: t('explore.failed'), message: error });
  }, [t]);
}
