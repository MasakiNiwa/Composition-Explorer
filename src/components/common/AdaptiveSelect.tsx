import { NativeSelect, Select, type SelectProps } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';

type Item = string | { value: string; label: string };

interface Props extends Omit<SelectProps, 'data' | 'onChange' | 'value'> {
  data: Item[];
  value: string | null;
  onChange: (value: string | null) => void;
}

/**
 * Select that uses the platform picker on touch devices. Native pickers are
 * easier to use on phones and avoid floating dropdowns inside bottom sheets
 * (which can fight with the mobile viewport and flicker).
 */
export function AdaptiveSelect({ data, value, onChange, clearable, placeholder, ...rest }: Props) {
  const touch = useMediaQuery('(pointer: coarse)', false);
  if (!touch)
    return (
      <Select data={data} value={value} onChange={onChange} clearable={clearable} placeholder={placeholder} {...rest} />
    );
  const items = data.map((d) => (typeof d === 'string' ? { value: d, label: d } : d));
  const withEmpty = clearable || value == null ? [{ value: '', label: placeholder ?? '—' }, ...items] : items;
  const { label, description, size, disabled, style, w, mb, mt } = rest;
  return (
    <NativeSelect
      label={label}
      description={description}
      size={size}
      disabled={disabled}
      style={style}
      w={w}
      mb={mb}
      mt={mt}
      data={withEmpty}
      value={value ?? ''}
      onChange={(e) => onChange(e.currentTarget.value === '' ? null : e.currentTarget.value)}
    />
  );
}
