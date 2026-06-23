import { Clock, MapPin } from 'lucide-react';
import type { ItineraryItem } from '@/types';

interface ActivityCardProps {
  item: ItineraryItem;
  onBookHotel?: () => void;
  onBookRestaurant?: () => void;
}

export function ActivityCard({ item, onBookHotel, onBookRestaurant }: ActivityCardProps) {
  return (
    <div className="rounded-container border border-lead/40 p-16">
      <div className="flex items-start justify-between gap-12">
        <div>
          <p className="text-body-sm font-w480 text-starlight">{item.locationName}</p>
          <p className="mt-4 text-body-sm text-silver">{item.description}</p>
        </div>
        <p className="whitespace-nowrap text-body-sm font-w480 text-starlight">
          &euro;{item.cost.toLocaleString()}
        </p>
      </div>

      <div className="mt-12 flex items-center gap-16 text-caption text-silver">
        <span className="flex items-center gap-4">
          <Clock size={14} /> {item.duration} min
        </span>
        <span className="flex items-center gap-4">
          <MapPin size={14} /> {item.activityType}
        </span>
      </div>

      {(item.activityType === 'accommodation' || item.activityType === 'restaurant') && (
        <div className="mt-12 flex gap-12">
          {item.activityType === 'accommodation' && onBookHotel && (
            <button onClick={onBookHotel} className="btn-header text-caption">
              Book hotel
            </button>
          )}
          {item.activityType === 'restaurant' && onBookRestaurant && (
            <button onClick={onBookRestaurant} className="btn-header text-caption">
              Book restaurant
            </button>
          )}
        </div>
      )}
    </div>
  );
}
