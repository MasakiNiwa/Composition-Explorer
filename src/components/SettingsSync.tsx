import { useMantineColorScheme } from '@mantine/core';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { detectLanguage } from '@/i18n';
import { useSettingsStore } from '@/state/settingsStore';
import { useBackendStore } from '@/compute/colab';

/** Applies persisted settings (language, color scheme) to the running app. */
export function SettingsSync() {
  const language = useSettingsStore((s) => s.language);
  const colorScheme = useSettingsStore((s) => s.colorScheme);
  const { i18n } = useTranslation();
  const { setColorScheme } = useMantineColorScheme();

  useEffect(() => {
    const lng = language === 'auto' ? detectLanguage() : language;
    if (i18n.language !== lng) void i18n.changeLanguage(lng);
    document.documentElement.lang = lng;
  }, [language, i18n]);

  const detectBackend = useBackendStore((s) => s.detect);
  useEffect(() => {
    void detectBackend();
  }, [detectBackend]);

  useEffect(() => {
    setColorScheme(colorScheme);
  }, [colorScheme, setColorScheme]);

  return null;
}
