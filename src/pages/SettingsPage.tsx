import {
  Anchor,
  Badge,
  Button,
  Card,
  Container,
  Group,
  NumberInput,
  SegmentedControl,
  Stack,
  Switch,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { detectCapabilities, probeWebGpu } from '@/lib/capabilities';
import { useBackendStore } from '@/compute/colab';
import { useInstallStore } from '@/lib/install';
import { IconDeviceMobileDown } from '@tabler/icons-react';
import { REPO_URL } from '@/lib/links';
import { useSettingsStore, type ColorScheme, type Language } from '@/state/settingsStore';
import type { PaletteName } from '@/core/scene/palette';
import { AdaptiveSelect } from '@/components/common/AdaptiveSelect';

export function SettingsPage() {
  const { t } = useTranslation();
  const s = useSettingsStore();
  const caps = useMemo(() => detectCapabilities(), []);
  const colab = useBackendStore((s) => s.colab);
  const install = useInstallStore();
  const [gpu, setGpu] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    void probeWebGpu().then(setGpu);
  }, []);

  const yesNo = (v: boolean) => (
    <Badge color={v ? 'teal' : 'gray'} variant="light">
      {v ? t('settings.available') : t('settings.unavailable')}
    </Badge>
  );

  const resetAll = () =>
    modals.openConfirmModal({
      title: t('settings.resetAllTitle'),
      children: <Text size="sm">{t('settings.resetAllBody')}</Text>,
      labels: { confirm: t('settings.resetAll'), cancel: t('common.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: () => {
        for (const key of Object.keys(localStorage)) if (key.startsWith('ce.')) localStorage.removeItem(key);
        location.reload();
      },
    });

  return (
    <Container size="sm" py="lg">
      <Stack gap="lg">
        <Title order={2}>{t('settings.title')}</Title>

        <Card withBorder>
          <Title order={4} mb="sm">
            {t('settings.general')}
          </Title>
          <Stack>
            <AdaptiveSelect
              label={t('settings.language')}
              value={s.language}
              allowDeselect={false}
              data={[
                { value: 'auto', label: t('settings.auto') },
                { value: 'ja', label: '日本語' },
                { value: 'en', label: 'English' },
              ]}
              onChange={(v) => v && s.set({ language: v as Language })}
            />
            <div>
              <Text size="sm" fw={500} mb={4}>
                {t('settings.colorScheme')}
              </Text>
              <SegmentedControl
                value={s.colorScheme}
                onChange={(v) => s.set({ colorScheme: v as ColorScheme })}
                data={[
                  { value: 'auto', label: t('settings.auto') },
                  { value: 'light', label: t('settings.light') },
                  { value: 'dark', label: t('settings.dark') },
                ]}
              />
            </div>
          </Stack>
        </Card>

        <Card withBorder>
          <Title order={4} mb="sm">
            {t('pwa.title')}
          </Title>
          <Stack gap="xs">
            {install.installed ? (
              <Badge color="teal" variant="light">
                {t('pwa.installed')}
              </Badge>
            ) : install.canInstall ? (
              <Button
                leftSection={<IconDeviceMobileDown size={18} />}
                onClick={() => void install.install()}
                w="fit-content"
              >
                {t('pwa.install')}
              </Button>
            ) : (
              <Text size="sm">{t('pwa.manual')}</Text>
            )}
            <Text size="sm" c="dimmed">
              {t('pwa.hint')}
            </Text>
          </Stack>
        </Card>

        <Card withBorder>
          <Title order={4} mb="sm">
            {t('settings.rendering')}
          </Title>
          <Stack>
            <div>
              <Text size="sm" fw={500} mb={4}>
                {t('settings.palette')}
              </Text>
              <SegmentedControl
                value={s.palette}
                onChange={(v) => s.set({ palette: v as PaletteName })}
                data={[
                  { value: 'color', label: t('settings.paletteColor') },
                  { value: 'mono', label: t('settings.paletteMono') },
                ]}
              />
            </div>
            <NumberInput
              label={t('settings.exportSize')}
              description={t('settings.exportSizeHint')}
              value={s.exportSize}
              min={256}
              max={8192}
              step={256}
              suffix=" px"
              onChange={(v) =>
                typeof v === 'number' &&
                s.set({
                  exportSize: Math.min(8192, Math.max(256, Math.round(v))),
                })
              }
            />
            <Switch
              label={t('settings.exportGuides')}
              checked={s.exportGuides}
              onChange={(e) => s.set({ exportGuides: e.currentTarget.checked })}
            />
          </Stack>
        </Card>

        <Card withBorder>
          <Title order={4} mb="sm">
            {t('settings.performance')}
          </Title>
          <Stack>
            <NumberInput
              label={t('settings.workerCount')}
              description={t('settings.workerCountHint', { cores: caps.cores })}
              value={s.workerCount}
              min={0}
              max={64}
              allowDecimal={false}
              onChange={(v) => typeof v === 'number' && s.set({ workerCount: Math.max(0, Math.min(64, v)) })}
            />
            <Switch
              label={t('settings.useGpu')}
              description={t('settings.useGpuHint')}
              checked={s.useGpu}
              onChange={(e) => s.set({ useGpu: e.currentTarget.checked })}
            />
            <Table withRowBorders={false} verticalSpacing={4}>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td>{t('settings.cores')}</Table.Td>
                  <Table.Td>{caps.cores}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>Web Workers</Table.Td>
                  <Table.Td>{yesNo(caps.workers)}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>OffscreenCanvas</Table.Td>
                  <Table.Td>{yesNo(caps.offscreenCanvas)}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>WebGL2</Table.Td>
                  <Table.Td>{yesNo(caps.webgl2)}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>WebGPU</Table.Td>
                  <Table.Td>
                    {gpu === undefined ? '…' : yesNo(!!gpu)}{' '}
                    {gpu && (
                      <Text span size="xs" c="dimmed">
                        {gpu}
                      </Text>
                    )}
                  </Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </Stack>
        </Card>

        <Card withBorder>
          <Title order={4} mb="sm">
            {t('settings.backend')}
          </Title>
          <Stack gap="xs">
            <Group gap="xs">
              <Badge color={colab ? 'orange' : 'indigo'} variant="light">
                {colab ? 'Google Colab' : t('settings.backendBrowser')}
              </Badge>
              {colab && <Text size="sm">GPU: {colab.gpu ?? t('settings.noGpu')}</Text>}
            </Group>
            <Text size="sm" c="dimmed">
              {colab ? t('settings.colabHint') : t('settings.browserHint')}
            </Text>
            {!colab && (
              <Anchor
                size="sm"
                href="https://colab.research.google.com/github/MasakiNiwa/Composition-Explorer/blob/main/colab/Composition_Explorer_Colab.ipynb"
                target="_blank"
                rel="noreferrer"
              >
                {t('settings.openColab')}
              </Anchor>
            )}
            <Anchor size="xs" href={`${REPO_URL}/tree/main/colab`} target="_blank" rel="noreferrer">
              colab/README.md
            </Anchor>
          </Stack>
        </Card>

        <Card withBorder>
          <Title order={4} mb="sm">
            {t('settings.reset')}
          </Title>
          <Group>
            <Button
              variant="default"
              onClick={() => {
                s.reset();
                notifications.show({ message: t('settings.resetDone') });
              }}
            >
              {t('settings.resetSettings')}
            </Button>
            <Button color="red" variant="light" onClick={resetAll}>
              {t('settings.resetAll')}
            </Button>
          </Group>
        </Card>
      </Stack>
    </Container>
  );
}
