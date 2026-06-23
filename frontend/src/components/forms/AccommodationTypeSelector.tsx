import { Building2, Users, Tent, Home } from 'lucide-react';
import clsx from 'clsx';
import type { AccommodationType } from '@/types';

const ACCOMMODATION_TYPES: { value: AccommodationType; label: string; icon: typeof Building2 }[] = [
  { value: 'hotel', label: 'Hotels', icon: Building2 },
  { value: 'hostel', label: 'Hostels', icon: Users },
  { value: 'campsite', label: 'Campsites', icon: Tent },
  { value: 'airbnb', label: 'Airbnb', icon: Home },
];

interface AccommodationTypeSelectorProps {
  value: AccommodationType[];
  onChange: (value: AccommodationType[]) => void;
}

export function AccommodationTypeSelector({ value, onChange }: AccommodationTypeSelectorProps) {
  function toggle(type: AccommodationType) {
    if (value.includes(type)) {
      onChange(value.filter((t) => t !== type));
    } else {
      onChange([...value, type]);
    }
  }

  return (
    <div>
      <p className="mb-8 text-body-sm text-silver">Overnight stay preferences</p>
      <div className="flex flex-wrap gap-12">
        {ACCOMMODATION_TYPES.map(({ value: type, label, icon: Icon }) => {
          const isSelected = value.includes(type);
          return (
            <button
              key={type}
              type="button"
              onClick={() => toggle(type)}
              className={clsx(
                'flex items-center gap-8 rounded-btn border px-20 py-8 text-body-sm transition-colors',
                isSelected
                  ? 'border-mercury-blue bg-mercury-blue text-white'
                  : 'border-lead text-starlight hover:border-mercury-blue'
              )}
            >
              <Icon size={16} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
