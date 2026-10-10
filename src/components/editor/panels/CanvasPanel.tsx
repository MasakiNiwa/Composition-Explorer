import { ActionIcon, Group, NumberInput, Stack, TextInput, Tooltip } from '@mantine/core';
import { IconArrowsExchange, IconDice5 } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ASPECT_PRESETS } from '@/core/model/composition';
import { randomSeed } from '@/core/random/prng';
import { useCompositionStore } from '@/state/compositionStore';
import { AdaptiveSelect } from '@/components/common/AdaptiveSelect';

export function CanvasPanel() {
  const { t } = useTranslation();
  const c = useCompositionStore((s) => s.composition);
  const update = useCompositionStore((s) => s.update);
  const current = `${c.canvas.aspectW}:${c.canvas.aspectH}`;
  const isPreset = ASPECT_PRESETS.some((p) => p.label === current);

  return (
    <Stack gap="sm">
      <TextInput
        label={t('canvas.name')}
        value={c.name}
        placeholder={t('canvas.namePlaceholder')}
        onChange={(e) => {
          const v = e.currentTarget.value;
          update((d) => void (d.name = v));
        }}
      />
      <Group align="flex-end" gap="xs" wrap="nowrap">
        <AdaptiveSelect
          label={t('canvas.aspect')}
          data={[...ASPECT_PRESETS.map((p) => p.label), ...(isPreset ? [] : [current])]}
          value={current}
          allowDeselect={false}
          style={{ flex: 1 }}
          onChange={(v) => {
            if (!v) return;
            const [w, h] = v.split(':').map(Number);
            update((d) => void (d.canvas = { aspectW: w, aspectH: h }));
          }}
        />
        <Tooltip label={t('canvas.swap')}>
          <ActionIcon
            variant="light"
            size="lg"
            aria-label={t('canvas.swap')}
            onClick={() =>
              update(
                (d) =>
                  void (d.canvas = {
                    aspectW: d.canvas.aspectH,
                    aspectH: d.canvas.aspectW,
                  }),
              )
            }
          >
            <IconArrowsExchange size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>
      <Group gap="xs" grow>
        <NumberInput
          label={t('canvas.ratioW')}
          min={0.1}
          max={100}
          value={c.canvas.aspectW}
          onChange={(v) => typeof v === 'number' && v > 0 && update((d) => void (d.canvas.aspectW = v))}
        />
        <NumberInput
          label={t('canvas.ratioH')}
          min={0.1}
          max={100}
          value={c.canvas.aspectH}
          onChange={(v) => typeof v === 'number' && v > 0 && update((d) => void (d.canvas.aspectH = v))}
        />
      </Group>
      <Group align="flex-end" gap="xs" wrap="nowrap">
        <NumberInput
          label={t('canvas.seed')}
          description={t('canvas.seedHint')}
          value={c.seed}
          min={0}
          max={4294967295}
          allowDecimal={false}
          style={{ flex: 1 }}
          onChange={(v) => typeof v === 'number' && update((d) => void (d.seed = Math.max(0, Math.floor(v))))}
        />
        <Tooltip label={t('canvas.newSeed')}>
          <ActionIcon
            variant="light"
            size="lg"
            aria-label={t('canvas.newSeed')}
            onClick={() => update((d) => void (d.seed = randomSeed()))}
          >
            <IconDice5 size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Stack>
  );
}
