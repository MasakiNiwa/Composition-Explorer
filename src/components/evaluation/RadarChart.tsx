interface Props {
  values: number[];
  labels: string[];
  size?: number;
  /** Optional second series for comparison (e.g. a candidate). */
  compare?: number[];
}

/** Minimal SVG radar chart for 0–100 values. */
export function RadarChart({ values, labels, size = 220, compare }: Props) {
  const n = values.length;
  const c = size / 2;
  const r = size / 2 - 34;
  const pt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return [c + Math.cos(a) * r * (v / 100), c + Math.sin(a) * r * (v / 100)] as const;
  };
  const poly = (vals: number[]) => vals.map((v, i) => pt(i, v).join(',')).join(' ');
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      style={{ maxWidth: size, display: 'block', margin: '0 auto' }}
      role="img"
    >
      {[25, 50, 75, 100].map((ring) => (
        <polygon
          key={ring}
          points={poly(Array(n).fill(ring))}
          fill="none"
          stroke="var(--mantine-color-default-border)"
          strokeWidth={1}
        />
      ))}
      {values.map((_, i) => {
        const [x, y] = pt(i, 100);
        return (
          <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="var(--mantine-color-default-border)" strokeWidth={1} />
        );
      })}
      {compare && (
        <polygon
          points={poly(compare)}
          fill="var(--mantine-color-orange-4)"
          fillOpacity={0.2}
          stroke="var(--mantine-color-orange-6)"
          strokeWidth={1.5}
        />
      )}
      <polygon
        points={poly(values)}
        fill="var(--mantine-color-indigo-4)"
        fillOpacity={0.35}
        stroke="var(--mantine-color-indigo-6)"
        strokeWidth={2}
      />
      {labels.map((l, i) => {
        const [x, y] = pt(i, 122);
        return (
          <text
            key={l}
            x={x}
            y={y}
            fontSize={10}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--mantine-color-dimmed)"
          >
            {l}
          </text>
        );
      })}
    </svg>
  );
}
