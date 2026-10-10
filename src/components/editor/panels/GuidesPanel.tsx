import { Checkbox, Divider, Stack, Switch } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { GUIDE_KINDS, type GuideKind } from '@/core/scene/buildScene';
import { useViewStore } from '@/state/viewStore';

export function GuidesPanel() {
  const { t } = useTranslation();
  const { guides, setGuides, showGrid, setShowGrid, showHorizon, setShowHorizon } = useViewStore();
  return (
    <Stack gap="xs">
      <Checkbox.Group value={guides} onChange={(v) => setGuides(v as GuideKind[])}>
        <Stack gap={6}>
          {GUIDE_KINDS.map((g) => (
            <Checkbox key={g} value={g} label={t(`guides.${g}`)} />
          ))}
        </Stack>
      </Checkbox.Group>
      <Divider my={4} />
      <Switch label={t('guides.grid')} checked={showGrid} onChange={(e) => setShowGrid(e.currentTarget.checked)} />
      <Switch
        label={t('guides.horizon')}
        checked={showHorizon}
        onChange={(e) => setShowHorizon(e.currentTarget.checked)}
      />
    </Stack>
  );
}
