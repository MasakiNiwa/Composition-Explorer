import { Button, SimpleGrid, Group, Stack, Switch, Text } from '@mantine/core';
import { IconCopy, IconRuler2, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { eyeLevelFigureHeight } from '@/core/geometry/camera';
import { LAYERS, POSES, type Layer, type Pose } from '@/core/model/composition';
import { useCompositionStore } from '@/state/compositionStore';
import { useViewStore } from '@/state/viewStore';
import { ParamSlider } from '../ParamSlider';
import { AdaptiveSelect } from '@/components/common/AdaptiveSelect';

export function InspectorPanel() {
  const { t } = useTranslation();
  const c = useCompositionStore((s) => s.composition);
  const { updateFigure, updateProp, removeItem, duplicateItem, snapFigureToEyeLevel } = useCompositionStore();
  const { selectedId, select } = useViewStore();
  const fig = c.figures.find((f) => f.id === selectedId);
  const prop = c.props.find((p) => p.id === selectedId);

  if (!fig && !prop) {
    return (
      <Text size="sm" c="dimmed">
        {t('inspector.none')}
      </Text>
    );
  }
  const item = (fig ?? prop)!;
  const locked = item.locked;
  const actions = (
    <Group gap="xs" grow>
      <Button
        size="xs"
        variant="light"
        leftSection={<IconCopy size={14} />}
        onClick={() => select(duplicateItem(item.id))}
      >
        {t('common.duplicate')}
      </Button>
      <Button
        size="xs"
        variant="light"
        color="red"
        leftSection={<IconTrash size={14} />}
        onClick={() => {
          removeItem(item.id);
          select(null);
        }}
      >
        {t('common.delete')}
      </Button>
    </Group>
  );
  const position = (set: (p: { x?: number; y?: number }) => void) => (
    <>
      <ParamSlider
        label={t('inspector.x')}
        value={item.x}
        min={-0.5}
        max={1.5}
        step={0.005}
        displayScale={100}
        unit="%"
        disabled={locked}
        onChange={(x) => set({ x })}
      />
      <ParamSlider
        label={t('inspector.y')}
        value={item.y}
        min={-0.5}
        max={Math.max(1.5, Math.min(8, item.y + 0.5))}
        step={0.005}
        displayScale={100}
        unit="%"
        disabled={locked}
        onChange={(y) => set({ y })}
      />
    </>
  );

  if (fig) {
    const ideal = eyeLevelFigureHeight(c, fig.y);
    return (
      <Stack gap="sm">
        <Text fw={600}>{t('objects.figure')}</Text>
        <Switch
          label={t('inspector.lock')}
          checked={fig.locked}
          onChange={(e) => updateFigure(fig.id, { locked: e.currentTarget.checked })}
        />
        {position((p) => updateFigure(fig.id, p))}
        <ParamSlider
          label={t('inspector.height')}
          value={fig.height}
          min={0.01}
          max={6}
          step={0.005}
          displayScale={100}
          unit="%"
          disabled={locked}
          onChange={(height) => updateFigure(fig.id, { height })}
        />
        <Button
          size="xs"
          variant="default"
          leftSection={<IconRuler2 size={14} />}
          disabled={locked || ideal == null}
          onClick={() => snapFigureToEyeLevel(fig.id)}
        >
          {t('inspector.snapEyeLevel')}
          {ideal != null && ` (${(ideal * 100).toFixed(1)}%)`}
        </Button>
        <ParamSlider
          label={t('inspector.facing')}
          value={fig.facing}
          min={-180}
          max={180}
          step={5}
          unit="°"
          disabled={locked}
          onChange={(facing) => updateFigure(fig.id, { facing })}
        />
        <ParamSlider
          label={t('inspector.tilt')}
          value={fig.tilt}
          min={-180}
          max={180}
          step={5}
          unit="°"
          disabled={locked}
          onChange={(tilt) => updateFigure(fig.id, { tilt })}
        />
        <ParamSlider
          label={t('inspector.roll')}
          value={fig.roll}
          min={-180}
          max={180}
          step={5}
          unit="°"
          disabled={locked}
          onChange={(roll) => updateFigure(fig.id, { roll })}
        />
        <Button
          size="xs"
          variant="default"
          disabled={locked || (fig.facing === 0 && fig.tilt === 0 && fig.roll === 0)}
          onClick={() => updateFigure(fig.id, { facing: 0, tilt: 0, roll: 0 })}
        >
          {t('inspector.resetRotation')}
        </Button>
        <div>
          <Text size="sm" mb={4}>
            {t('inspector.pose')}
          </Text>
          <SimpleGrid cols={3} spacing={4}>
            {POSES.map((p) => (
              <Button
                key={p}
                size="compact-sm"
                variant={fig.pose === p ? 'filled' : 'default'}
                disabled={locked}
                onClick={() => updateFigure(fig.id, { pose: p as Pose })}
              >
                {t(`poses.${p}`)}
              </Button>
            ))}
          </SimpleGrid>
        </div>
        {actions}
      </Stack>
    );
  }

  const p = prop!;
  return (
    <Stack gap="sm">
      <Text fw={600}>{t(`props.${p.kind}`)}</Text>
      <Switch
        label={t('inspector.lock')}
        checked={p.locked}
        onChange={(e) => updateProp(p.id, { locked: e.currentTarget.checked })}
      />
      <AdaptiveSelect
        label={t('inspector.layer')}
        value={p.layer}
        allowDeselect={false}
        disabled={locked}
        data={LAYERS.map((l) => ({ value: l, label: t(`layers.${l}`) }))}
        onChange={(v) => v && updateProp(p.id, { layer: v as Layer })}
      />
      {position((pos) => updateProp(p.id, pos))}
      <ParamSlider
        label={t('inspector.width')}
        value={p.width}
        min={0.01}
        max={3}
        step={0.005}
        displayScale={100}
        unit="%"
        disabled={locked}
        onChange={(width) => updateProp(p.id, { width })}
      />
      <ParamSlider
        label={t('inspector.height')}
        value={p.height}
        min={0.01}
        max={3}
        step={0.005}
        displayScale={100}
        unit="%"
        disabled={locked}
        onChange={(height) => updateProp(p.id, { height })}
      />
      <ParamSlider
        label={t('inspector.rotation')}
        value={p.rotation}
        min={-180}
        max={180}
        step={1}
        unit="°"
        disabled={locked}
        onChange={(rotation) => updateProp(p.id, { rotation })}
      />
      <Switch
        label={t('inspector.flip')}
        checked={p.flip}
        disabled={locked}
        onChange={(e) => updateProp(p.id, { flip: e.currentTarget.checked })}
      />
      {actions}
    </Stack>
  );
}
