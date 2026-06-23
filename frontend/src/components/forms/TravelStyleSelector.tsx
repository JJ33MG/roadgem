import clsx from 'clsx';
import type { TravelStyle } from '@/types';

const TRAVEL_STYLES: { value: TravelStyle; label: string }[] = [
  { value: 'adventure', label: 'Adventure' },
  { value: 'relaxation', label: 'Relaxation' },
  { value: 'culture', label: 'Culture' },
  { value: 'food', label: 'Food' },
  { value: 'solo', label: 'Solo' },
  { value: 'family', label: 'Family' },
];

interface TravelStyleSelectorProps {
  value: TravelStyle | null;
  onChange: (value: TravelStyle) => void;
}

export function TravelStyleSelector({ value, onChange }: TravelStyleSelectorProps) {
  return (
    <div>
      <p className="mb-8 text-body-sm text-silver">Travel style</p>
      <div className="flex flex-wrap gap-12">
        {TRAVEL_STYLES.map((style) => (
          <button
            key={style.value}
            type="button"
            onClick={() => onChange(style.value)}
            className={clsx(
              'rounded-btn border px-20 py-8 text-body-sm transition-colors',
              value === style.value
                ? 'border-mercury-blue bg-mercury-blue text-white'
                : 'border-lead text-starlight hover:border-mercury-blue',
            )}
          >
            {style.label}
          </button>
        ))}
      </div>
    </div>
  );
}
