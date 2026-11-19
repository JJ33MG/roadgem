import { useId } from 'react';

type Props = { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (value: number) => void };

/** A labelled range with its value set in tabular figures beside the label. */
export function SliderField({ label, value, min, max, step = 1, unit, onChange }: Props) {
  const id = useId();
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-12 gap-y-4">
      <label htmlFor={id} className="text-ink" style={{ fontWeight: 500 }}>{label}</label>
      <span className="num text-ink" aria-hidden="true">{unit ? `${value} ${unit}` : value}</span>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={unit ? `${value} ${unit}` : String(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="col-span-2 h-[28px] w-full"
        style={{ accentColor: 'var(--color-accent)' }}
      />
    </div>
  );
}
