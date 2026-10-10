import { Button, Group, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRegisterSW } from 'virtual:pwa-register/react';

/** Registers the service worker and offers a reload when a new version is ready. */
export function PwaUpdater() {
  const { t } = useTranslation();
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (!offlineReady) return;
    notifications.show({ color: 'teal', message: t('pwa.offlineReady') });
    setOfflineReady(false);
  }, [offlineReady, setOfflineReady, t]);

  useEffect(() => {
    if (!needRefresh) return;
    notifications.show({
      id: 'pwa-update',
      autoClose: false,
      title: t('pwa.updateTitle'),
      message: (
        <Group justify="space-between" mt={4}>
          <Text size="sm">{t('pwa.updateBody')}</Text>
          <Button size="xs" onClick={() => void updateServiceWorker(true)}>
            {t('pwa.reload')}
          </Button>
        </Group>
      ),
    });
  }, [needRefresh, updateServiceWorker, t]);

  return null;
}
