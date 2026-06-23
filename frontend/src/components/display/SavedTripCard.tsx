import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import clsx from 'clsx';
import { DestinationImage } from '@/components/display/DestinationImage';
import type { Trip } from '@/types';

interface SavedTripCardProps {
  trip: Trip;
}

const STATUS_LABELS: Record<Trip['status'], string> = {
  draft: 'Draft',
  saved: 'Saved',
  archived: 'Archived',
};

export function SavedTripCard({ trip }: SavedTripCardProps) {
  return (
    <Link to={`/trips/${trip.id}`} className="card-interactive block overflow-hidden p-0">
      <DestinationImage query={trip.destination} alt={trip.destination} className="h-[120px] w-full" />
      <div className="p-24">
        <div className="flex items-center justify-between">
          <h3 className="text-heading-sm font-display font-w480 text-starlight">{trip.destination}</h3>
          <span className={clsx('badge', trip.status === 'saved' ? 'badge-premium' : 'badge-free')}>
            {STATUS_LABELS[trip.status]}
          </span>
        </div>

        <p className="mt-8 text-body-sm text-silver">
          {format(new Date(trip.startDate), 'MMM d')} – {format(new Date(trip.endDate), 'MMM d, yyyy')}
        </p>

        <p className="mt-12 text-body-sm font-w480 text-starlight">
          &euro;{trip.totalCost.toLocaleString()} &middot; {trip.totalDistance.toLocaleString()} km
        </p>
      </div>
    </Link>
  );
}
