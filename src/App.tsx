import { Center, Loader, MantineProvider, localStorageColorSchemeManager } from '@mantine/core';
import { lazy, Suspense, type ReactNode } from 'react';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { SettingsSync } from './components/SettingsSync';
import { EditorPage } from './pages/EditorPage';
import { theme } from './theme';

// Secondary pages are code-split so the editor loads first.
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const HelpPage = lazy(() => import('./pages/HelpPage').then((m) => ({ default: m.HelpPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })));

const page = (node: ReactNode) => (
  <Suspense
    fallback={
      <Center h={200}>
        <Loader />
      </Center>
    }
  >
    {node}
  </Suspense>
);

const colorSchemeManager = localStorageColorSchemeManager({
  key: 'ce.color-scheme',
});

// HashRouter: works on GitHub Pages and behind a Colab kernel proxy without
// server-side rewrites.
export function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="auto" colorSchemeManager={colorSchemeManager}>
      <Notifications position="bottom-center" />
      <SettingsSync />
      <ModalsProvider>
        <HashRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<EditorPage />} />
              <Route path="settings" element={page(<SettingsPage />)} />
              <Route path="help" element={page(<HelpPage />)} />
              <Route path="about" element={page(<AboutPage />)} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </HashRouter>
      </ModalsProvider>
    </MantineProvider>
  );
}
