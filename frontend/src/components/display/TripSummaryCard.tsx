import { format } from 'date-fns';
import type { Trip } from '@/types';

interface TripSummaryCardProps {
  trip: Trip;
}

export function TripSummaryCard({ trip }: TripSummaryCardProps) {
  const days = Math.round(
    (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24),
  );

  const stats = [
    { label: 'Destination', value: trip.destination },
    {
      label: 'Dates',
      value: `${format(new Date(trip.startDate), 'MMM d')} – ${format(new Date(trip.endDate), 'MMM d, yyyy')}`,
    },
    { label: 'Days', value: `${days}` },
    { label: 'Distance', value: `${trip.totalDistance.toLocaleString()} km` },
    { label: 'Total cost', value: `€${trip.totalCost.toLocaleString()}` },
  ];

  return (
    <div className="surface-2 rounded-container border border-lead/40 p-32">
      <h2 className="text-heading font-display font-w360 text-starlight">{trip.destination}</h2>

      <div className="mt-24 grid grid-cols-2 gap-24 sm:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="text-caption text-silver">{stat.label}</p>
            <p className="mt-4 text-body font-w480 text-starlight">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
