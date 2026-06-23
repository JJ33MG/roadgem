import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useTrip } from '@/hooks/useTrip';
import { ActivityCard } from '@/components/display/ActivityCard';
import { LoadingSpinner } from '@/components/utility/LoadingSpinner';
import type { TimeSlot } from '@/types';

const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
};

export function DayDetailPage() {
  const { tripId, dayNumber } = useParams<{ tripId: string; dayNumber: string }>();
  const navigate = useNavigate();
  const { trip, isLoading } = useTrip(tripId);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  const day = trip?.itinerary.find((d) => d.dayNumber === Number(dayNumber));

  if (!day) {
    return (
      <div className="section py-80 text-center">
        <h2 className="text-heading font-display font-w360 text-starlight">Day not found</h2>
      </div>
    );
  }

  const slots: TimeSlot[] = ['morning', 'afternoon', 'evening'];

  return (
    <div className="section max-w-3xl py-40">
      <p className="text-caption text-silver">{trip?.destination}</p>
      <h1 className="text-heading font-display font-w360 text-starlight">
        Day {day.dayNumber} &middot; {format(new Date(day.date), 'EEEE, MMM d')}
      </h1>

      <div className="mt-32 flex flex-col gap-32">
        {slots.map((slot) => {
          const items = day.items.filter((item) => item.timeSlot === slot);
          if (items.length === 0) return null;

          return (
            <div key={slot}>
              <h2 className="mb-16 text-heading-sm font-display font-w480 text-starlight">
                {TIME_SLOT_LABELS[slot]}
              </h2>
              <div className="flex flex-col gap-12">
                {items.map((item) => (
                  <ActivityCard
                    key={item.id}
                    item={item}
                    onBookHotel={() => navigate(`/trips/${tripId}/hotels`)}
                    onBookRestaurant={() => navigate(`/trips/${tripId}/restaurants`)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
