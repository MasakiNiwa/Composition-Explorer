import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ja from './locales/ja.json';

export const SUPPORTED_LANGUAGES = ['ja', 'en'] as const;

export function detectLanguage(): 'ja' | 'en' {
  const nav = typeof navigator !== 'undefined' ? navigator.language : 'en';
  return nav.toLowerCase().startsWith('ja') ? 'ja' : 'en';
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ja: { translation: ja } },
  lng: detectLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
