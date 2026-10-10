import {
  ActionIcon,
  AppShell,
  Badge,
  Box,
  Group,
  NavLink,
  Text,
  Tooltip,
  UnstyledButton,
  useComputedColorScheme,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconHelp, IconInfoCircle, IconLayoutDashboard, IconMoon, IconSettings, IconSun } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useBackendStore } from '@/compute/colab';
import { useSettingsStore } from '@/state/settingsStore';

const NAV = [
  { to: '/', key: 'nav.editor', icon: IconLayoutDashboard },
  { to: '/settings', key: 'nav.settings', icon: IconSettings },
  { to: '/help', key: 'nav.help', icon: IconHelp },
  { to: '/about', key: 'nav.about', icon: IconInfoCircle },
] as const;

/** Height of the mobile bottom navigation bar (excluding the safe-area inset). */
export const BOTTOM_NAV_HEIGHT = 60;
/** Total space reserved for the bottom navigation on phones. */
export const BOTTOM_NAV_SPACE = `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))`;
export const HEADER_HEIGHT = 56;

export function AppLayout() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const computed = useComputedColorScheme('light');
  const setSettings = useSettingsStore((s) => s.set);
  const colab = useBackendStore((s) => s.colab);
  // Phones: page navigation moves to a bottom bar.
  const desktopNav = useMediaQuery('(min-width: 48em)', true);

  return (
    <AppShell header={{ height: HEADER_HEIGHT }} padding={0}>
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <UnstyledButton component={Link} to="/" style={{ minWidth: 0 }}>
            <Group gap={8} wrap="nowrap">
              <img src="./favicon.svg" width={28} height={28} alt="" />
              <Text fw={700} size="lg" truncate>
                Composition Explorer
              </Text>
            </Group>
          </UnstyledButton>
          {desktopNav && (
            <Group gap={4} wrap="nowrap">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  component={Link}
                  to={n.to}
                  label={t(n.key)}
                  leftSection={<n.icon size={18} />}
                  active={pathname === n.to}
                  w="auto"
                  style={{ borderRadius: 8 }}
                />
              ))}
            </Group>
          )}
          <Group gap={4} wrap="nowrap">
            {colab && (
              <Tooltip label={t('settings.colabConnected', { gpu: colab.gpu ?? 'CPU' })}>
                <Badge color="orange" variant="light" component={Link} to="/settings" style={{ cursor: 'pointer' }}>
                  Colab
                </Badge>
              </Tooltip>
            )}
            <Tooltip label={t('nav.toggleTheme')}>
              <ActionIcon
                variant="subtle"
                size="lg"
                aria-label={t('nav.toggleTheme')}
                onClick={() => setSettings({ colorScheme: computed === 'dark' ? 'light' : 'dark' })}
              >
                {computed === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />}
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main style={desktopNav ? undefined : { paddingBottom: BOTTOM_NAV_SPACE }}>
        <Outlet />
      </AppShell.Main>

      {!desktopNav && (
        // Own fixed bar (not AppShell.Footer) so its size is exact on every browser.
        <Box
          component="nav"
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 200,
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            background: 'var(--mantine-color-body)',
            borderTop: '1px solid var(--mantine-color-default-border)',
          }}
        >
          <Group h={BOTTOM_NAV_HEIGHT} gap={0} grow wrap="nowrap">
            {NAV.map((n) => {
              const active = pathname === n.to;
              return (
                <UnstyledButton
                  key={n.to}
                  component={Link}
                  to={n.to}
                  aria-current={active ? 'page' : undefined}
                  style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    color: active ? 'var(--mantine-color-indigo-6)' : 'var(--mantine-color-dimmed)',
                  }}
                >
                  <n.icon size={22} stroke={active ? 2.2 : 1.6} />
                  <Text size="10px" fw={active ? 700 : 500} c="inherit">
                    {t(n.key)}
                  </Text>
                </UnstyledButton>
              );
            })}
          </Group>
        </Box>
      )}
    </AppShell>
  );
}
