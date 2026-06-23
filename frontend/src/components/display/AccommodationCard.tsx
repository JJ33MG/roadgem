import { Star, ExternalLink } from 'lucide-react';
import clsx from 'clsx';
import type { AccommodationOption } from '@/types';

export const ACCOMMODATION_TYPE_LABELS: Record<AccommodationOption['type'], string> = {
  hotel: 'Hotel',
  hostel: 'Hostel',
  campsite: 'Campsite',
  airbnb: 'Airbnb',
};

interface AccommodationCardProps {
  accommodation: AccommodationOption;
  selected?: boolean;
  onSelect?: (accommodation: AccommodationOption) => void;
}

export function AccommodationCard({ accommodation, selected, onSelect }: AccommodationCardProps) {
  return (
    <div
      className={clsx(
        'overflow-hidden rounded-container border transition-colors',
        selected ? 'border-mercury-blue' : 'border-starlight/10'
      )}
    >
      {accommodation.imageUrl ? (
        <img
          src={`${import.meta.env.VITE_BACKEND_URL}${accommodation.imageUrl}`}
          alt={accommodation.name}
          loading="lazy"
          className="h-[100px] w-full object-cover"
        />
      ) : (
        <div aria-hidden className="h-[100px] w-full bg-gradient-to-br from-mercury-blue/30 via-plum/20 to-deep-space" />
      )}

      <div className="p-12">
        <div className="flex items-center justify-between gap-8">
          <p className="truncate text-body-sm font-w480 text-starlight">{accommodation.name}</p>
          <span className="badge badge-free flex-shrink-0">{ACCOMMODATION_TYPE_LABELS[accommodation.type]}</span>
        </div>

        <div className="mt-4 flex items-center justify-between text-caption text-silver">
          {accommodation.rating > 0 ? (
            <span className="flex items-center gap-4">
              <Star size={14} className="fill-mercury-blue text-mercury-blue" />
              {accommodation.rating.toFixed(1)}
            </span>
          ) : (
            <span />
          )}
          <span className="text-body-sm font-w480 text-starlight">
            &euro;{accommodation.pricePerNight.toLocaleString()} <span className="text-silver">/ night</span>
          </span>
        </div>

        <div className="mt-12 flex gap-8">
          {onSelect && (
            <button onClick={() => onSelect(accommodation)} className="btn-header flex-1 text-caption">
              {selected ? 'Selected' : 'Add to itinerary'}
            </button>
          )}
          <a
            href={accommodation.affiliateUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="btn-header flex items-center gap-4 text-caption"
          >
            Book <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
