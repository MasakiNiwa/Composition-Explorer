import {
  Accordion,
  Anchor,
  Badge,
  Button,
  Card,
  Code,
  Container,
  Group,
  List,
  Loader,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconBrandGithub, IconExternalLink, IconSearch } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PAGES_URL, REPO_URL } from '@/lib/links';
import { REFERENCES } from '@/lib/references';

interface PackageLicense {
  name: string;
  version: string;
  license: string;
  author: string;
  repository: string;
  licenseText: string;
  noticeText?: string;
}

function useThirdParty() {
  const [data, setData] = useState<PackageLicense[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    fetch('./third-party-licenses.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { packages: PackageLicense[] }) => setData(j.packages))
      .catch(() => setError(true));
  }, []);
  return { data, error };
}

export function AboutPage() {
  const { t } = useTranslation();
  const { data, error } = useThirdParty();
  const [query, setQuery] = useState('');
  const filtered = useMemo(
    () => (data ?? []).filter((p) => p.name.toLowerCase().includes(query.toLowerCase())),
    [data, query],
  );

  return (
    <Container size="md" py="lg">
      <Stack gap="lg">
        <Title order={2}>{t('about.title')}</Title>

        <Card withBorder>
          <Stack gap="xs">
            <Group gap="xs">
              <img src="./favicon.svg" width={40} height={40} alt="" />
              <div>
                <Title order={3}>Composition Explorer</Title>
                <Text size="sm" c="dimmed">
                  {t('about.tagline')}
                </Text>
              </div>
            </Group>
            <Table withRowBorders={false} verticalSpacing={4}>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td w={140}>{t('about.version')}</Table.Td>
                  <Table.Td>
                    <Badge variant="light">v{__APP_VERSION__}</Badge>
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>{t('about.commit')}</Table.Td>
                  <Table.Td>
                    <Code>{__GIT_SHA__}</Code>
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>{t('about.built')}</Table.Td>
                  <Table.Td>{new Date(__BUILD_DATE__).toLocaleString()}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>{t('about.license')}</Table.Td>
                  <Table.Td>
                    <Anchor href={`${REPO_URL}/blob/main/LICENSE`} target="_blank" rel="noreferrer">
                      MIT License
                    </Anchor>{' '}
                    © 2026 Masaki28
                  </Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
            <Group gap="xs">
              <Button
                component="a"
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
                leftSection={<IconBrandGithub size={18} />}
              >
                {t('about.repo')}
              </Button>
              <Button
                component="a"
                href={`${REPO_URL}/releases`}
                target="_blank"
                rel="noreferrer"
                variant="default"
                leftSection={<IconExternalLink size={18} />}
              >
                {t('about.changelog')}
              </Button>
              <Button
                component="a"
                href={PAGES_URL}
                target="_blank"
                rel="noreferrer"
                variant="default"
                leftSection={<IconExternalLink size={18} />}
              >
                GitHub Pages
              </Button>
            </Group>
          </Stack>
        </Card>

        <Card withBorder>
          <Title order={4} mb="xs">
            {t('about.philosophy')}
          </Title>
          <Text size="sm">{t('about.philosophyBody')}</Text>
        </Card>

        <Card withBorder>
          <Title order={4} mb="xs">
            {t('about.references')}
          </Title>
          <Text size="sm" c="dimmed" mb="xs">
            {t('about.referencesHint')}
          </Text>
          <List size="sm" spacing={6}>
            {REFERENCES.map((r) => (
              <List.Item key={r.title}>
                {r.url ? (
                  <Anchor href={r.url} target="_blank" rel="noreferrer">
                    {r.title}
                  </Anchor>
                ) : (
                  r.title
                )}
                {r.note && (
                  <Text span size="xs" c="dimmed">
                    {' '}
                    — {r.note}
                  </Text>
                )}
              </List.Item>
            ))}
          </List>
        </Card>

        <Card withBorder>
          <Title order={4} mb="xs">
            {t('about.credits')}
          </Title>
          <Text size="sm" c="dimmed" mb="sm">
            {t('about.creditsHint')}{' '}
            <Anchor href={`${REPO_URL}/blob/main/THIRD_PARTY_NOTICES.md`} target="_blank" rel="noreferrer">
              THIRD_PARTY_NOTICES.md
            </Anchor>
          </Text>
          {!data && !error && <Loader size="sm" />}
          {error && <Text c="red">{t('about.creditsError')}</Text>}
          {data && (
            <Stack gap="xs">
              <TextInput
                leftSection={<IconSearch size={16} />}
                placeholder={t('about.search')}
                value={query}
                onChange={(e) => setQuery(e.currentTarget.value)}
              />
              <Text size="xs" c="dimmed">
                {t('about.packages', { count: data.length })}
              </Text>
              <Accordion variant="contained" chevronPosition="left">
                {filtered.map((p) => (
                  <Accordion.Item key={`${p.name}@${p.version}`} value={`${p.name}@${p.version}`}>
                    <Accordion.Control>
                      <Group justify="space-between" wrap="nowrap" gap="xs">
                        <Text size="sm" truncate>
                          {p.name}{' '}
                          <Text span c="dimmed" size="xs">
                            {p.version}
                          </Text>
                        </Text>
                        <Badge size="sm" variant="light">
                          {p.license}
                        </Badge>
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      {p.repository && (
                        <Anchor
                          href={p.repository.startsWith('http') ? p.repository : undefined}
                          size="sm"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {p.repository}
                        </Anchor>
                      )}
                      <pre className="ce-pre">{p.licenseText || t('about.noLicenseText')}</pre>
                      {p.noticeText && <pre className="ce-pre">{p.noticeText}</pre>}
                    </Accordion.Panel>
                  </Accordion.Item>
                ))}
              </Accordion>
            </Stack>
          )}
        </Card>
      </Stack>
    </Container>
  );
}
