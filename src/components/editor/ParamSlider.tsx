import { Group, NumberInput, Slider, Stack, Text } from '@mantine/core';

interface Props {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  /** Display multiplier (e.g. 100 for percentages). */
  displayScale?: number;
  unit?: string;
  precision?: number;
  disabled?: boolean;
}

/** Slider + numeric input pair: drag for feel, type for precision. */
export function ParamSlider({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.01,
  displayScale = 1,
  unit = '',
  precision = 0,
  disabled,
}: Props) {
  const ds = displayScale;
  return (
    <Stack gap={2}>
      <Group justify="space-between" gap="xs" wrap="nowrap">
        <Text size="sm">{label}</Text>
        <NumberInput
          size="xs"
          w={92}
          value={Number((value * ds).toFixed(precision))}
          min={min * ds}
          max={max * ds}
          step={step * ds}
          decimalScale={precision}
          suffix={unit}
          disabled={disabled}
          onChange={(v) => {
            const num = typeof v === 'number' ? v : parseFloat(v);
            if (Number.isFinite(num)) onChange(Math.min(max, Math.max(min, num / ds)));
          }}
          aria-label={label}
        />
      </Group>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={onChange}
        disabled={disabled}
        label={(v) => `${(v * ds).toFixed(precision)}${unit}`}
        aria-label={label}
      />
    </Stack>
  );
}
