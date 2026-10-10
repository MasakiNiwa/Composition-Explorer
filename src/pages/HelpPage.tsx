import { Accordion, Anchor, Container, Kbd, List, Stack, Table, Text, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { ISSUES_URL } from '@/lib/links';

interface HelpSection {
  title: string;
  body?: string;
  items?: string[];
}

const SHORTCUTS: [string[], string][] = [
  [['Ctrl/⌘', 'Z'], 'help.keys.undo'],
  [['Ctrl/⌘', 'Shift', 'Z'], 'help.keys.redo'],
  [['Ctrl/⌘', 'D'], 'help.keys.duplicate'],
  [['Delete'], 'help.keys.delete'],
  [['Esc'], 'help.keys.deselect'],
];

export function HelpPage() {
  const { t } = useTranslation();
  const sections = t('help.sections', { returnObjects: true }) as HelpSection[];
  return (
    <Container size="md" py="lg" className="ce-prose">
      <Stack gap="lg">
        <Title order={2}>{t('help.title')}</Title>
        <Text>{t('help.intro')}</Text>
        <Accordion multiple defaultValue={['0']} variant="separated">
          {Array.isArray(sections) &&
            sections.map((s, i) => (
              <Accordion.Item key={i} value={String(i)}>
                <Accordion.Control>
                  <Text fw={600}>{s.title}</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  {s.body && <Text mb="xs">{s.body}</Text>}
                  {s.items && (
                    <List spacing={4}>
                      {s.items.map((it, j) => (
                        <List.Item key={j}>{it}</List.Item>
                      ))}
                    </List>
                  )}
                </Accordion.Panel>
              </Accordion.Item>
            ))}
        </Accordion>
        <div>
          <Title order={4} mb="xs">
            {t('help.shortcuts')}
          </Title>
          <Table>
            <Table.Tbody>
              {SHORTCUTS.map(([keys, label]) => (
                <Table.Tr key={label}>
                  <Table.Td>
                    {keys.map((k, i) => (
                      <span key={k}>
                        {i > 0 && ' + '}
                        <Kbd>{k}</Kbd>
                      </span>
                    ))}
                  </Table.Td>
                  <Table.Td>{t(label)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>
        <Text size="sm" c="dimmed">
          {t('help.feedback')}{' '}
          <Anchor href={ISSUES_URL} target="_blank" rel="noreferrer">
            GitHub Issues
          </Anchor>
        </Text>
      </Stack>
    </Container>
  );
}
