import { Accordion } from '@mantine/core';
import { IconBox, IconFrame, IconGridDots, IconLine, IconPerspective } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { CanvasPanel } from './panels/CanvasPanel';
import { GuidesPanel } from './panels/GuidesPanel';
import { HorizonPanel } from './panels/HorizonPanel';
import { ObjectsPanel } from './panels/ObjectsPanel';
import { PerspectivePanel } from './panels/PerspectivePanel';

const SECTIONS = [
  { value: 'canvas', icon: IconFrame, Panel: CanvasPanel },
  { value: 'horizon', icon: IconLine, Panel: HorizonPanel },
  { value: 'perspective', icon: IconPerspective, Panel: PerspectivePanel },
  { value: 'objects', icon: IconBox, Panel: ObjectsPanel },
  { value: 'guides', icon: IconGridDots, Panel: GuidesPanel },
] as const;

export function ParameterPanels() {
  const { t } = useTranslation();
  return (
    <Accordion multiple defaultValue={['horizon', 'objects']} variant="contained">
      {SECTIONS.map(({ value, icon: Icon, Panel }) => (
        <Accordion.Item key={value} value={value}>
          <Accordion.Control icon={<Icon size={18} />}>{t(`sections.${value}`)}</Accordion.Control>
          <Accordion.Panel>
            <Panel />
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}
