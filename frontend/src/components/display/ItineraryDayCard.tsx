import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import { ActivityCard } from './ActivityCard';
import type { ItineraryDay, TimeSlot } from '@/types';

const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
};

interface ItineraryDayCardProps {
  day: ItineraryDay;
  defaultExpanded?: boolean;
  onBookHotel?: (itemId: string) => void;
  onBookRestaurant?: (itemId: string) => void;
}

export function ItineraryDayCard({
  day,
  defaultExpanded = false,
  onBookHotel,
  onBookRestaurant,
}: ItineraryDayCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const slots: TimeSlot[] = ['morning', 'afternoon', 'evening'];

  return (
    <div className="border-b border-lead/40">
      <button
        onClick={() => setIsExpanded((open) => !open)}
        className="flex w-full items-center justify-between py-16 text-left"
      >
        <div>
          <p className="text-body-sm font-w480 text-starlight">Day {day.dayNumber}</p>
          <p className="text-caption text-silver">{format(new Date(day.date), 'EEEE, MMM d')}</p>
        </div>
        <ChevronDown
          size={20}
          className={clsx('text-silver transition-transform', isExpanded && 'rotate-180')}
        />
      </button>

      {isExpanded && (
        <div className="flex flex-col gap-24 pb-24">
          {slots.map((slot) => {
            const items = day.items.filter((item) => item.timeSlot === slot);
            if (items.length === 0) return null;

            return (
              <div key={slot}>
                <p className="mb-12 text-caption uppercase tracking-wide text-silver">
                  {TIME_SLOT_LABELS[slot]}
                </p>
                <div className="flex flex-col gap-12">
                  {items.map((item) => (
                    <ActivityCard
                      key={item.id}
                      item={item}
                      onBookHotel={onBookHotel ? () => onBookHotel(item.id) : undefined}
                      onBookRestaurant={onBookRestaurant ? () => onBookRestaurant(item.id) : undefined}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
