import {
  ActionIcon,
  AppShell,
  Burger,
  Group,
  NavLink,
  Text,
  Tooltip,
  UnstyledButton,
  useComputedColorScheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconBrandGithub,
  IconHelp,
  IconInfoCircle,
  IconLayoutDashboard,
  IconMoon,
  IconSettings,
  IconSun,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { REPO_URL } from '@/lib/links';
import { useSettingsStore } from '@/state/settingsStore';

const NAV = [
  { to: '/', key: 'nav.editor', icon: IconLayoutDashboard },
  { to: '/settings', key: 'nav.settings', icon: IconSettings },
  { to: '/help', key: 'nav.help', icon: IconHelp },
  { to: '/about', key: 'nav.about', icon: IconInfoCircle },
] as const;

export function AppLayout() {
  const [opened, { toggle, close }] = useDisclosure();
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const computed = useComputedColorScheme('light');
  const setSettings = useSettingsStore((s) => s.set);

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{
        width: 240,
        breakpoint: 'sm',
        collapsed: { mobile: !opened, desktop: true },
      }}
      padding={0}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" aria-label={t('nav.menu')} />
            <UnstyledButton component={Link} to="/" onClick={close}>
              <Group gap={8} wrap="nowrap">
                <img src="./favicon.svg" width={28} height={28} alt="" />
                <Text fw={700} size="lg" visibleFrom="xs">
                  Composition Explorer
                </Text>
                <Text fw={700} size="lg" hiddenFrom="xs">
                  CE
                </Text>
              </Group>
            </UnstyledButton>
          </Group>
          <Group gap={4} visibleFrom="sm" wrap="nowrap">
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
          <Group gap={4} wrap="nowrap">
            <Tooltip label={t('nav.toggleTheme')}>
              <ActionIcon
                variant="subtle"
                size="lg"
                aria-label={t('nav.toggleTheme')}
                onClick={() =>
                  setSettings({
                    colorScheme: computed === 'dark' ? 'light' : 'dark',
                  })
                }
              >
                {computed === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />}
              </ActionIcon>
            </Tooltip>
            <Tooltip label="GitHub">
              <ActionIcon
                component="a"
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
                variant="subtle"
                size="lg"
                aria-label="GitHub"
              >
                <IconBrandGithub size={20} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            component={Link}
            to={n.to}
            label={t(n.key)}
            leftSection={<n.icon size={20} />}
            active={pathname === n.to}
            onClick={close}
          />
        ))}
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
