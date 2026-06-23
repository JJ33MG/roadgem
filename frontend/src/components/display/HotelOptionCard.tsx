import { useState } from 'react';
import { Star } from 'lucide-react';
import clsx from 'clsx';
import { baseURL } from '@/lib/apiClient';
import type { HotelOption } from '@/types';

interface HotelOptionCardProps {
  hotel: HotelOption;
  onSelect: (hotel: HotelOption) => void;
}

export function HotelOptionCard({ hotel, onSelect }: HotelOptionCardProps) {
  const [errored, setErrored] = useState(false);

  return (
    <div className="overflow-hidden rounded-container border border-lead/40">
      {hotel.imageUrl && !errored ? (
        <img
          src={`${baseURL}${hotel.imageUrl}`}
          alt={hotel.name}
          loading="lazy"
          onError={() => setErrored(true)}
          className="h-40 w-full object-cover"
        />
      ) : (
        <div
          aria-hidden
          className={clsx('h-40 w-full bg-gradient-to-br from-mercury-blue/30 via-plum/20 to-deep-space')}
        />
      )}
      <div className="p-16">
        <p className="text-body-sm font-w480 text-starlight">{hotel.name}</p>
        <div className="mt-4 flex items-center gap-4 text-caption text-silver">
          <Star size={14} className="fill-mercury-blue text-mercury-blue" />
          {hotel.rating.toFixed(1)}
        </div>
        <p className="mt-8 text-body-sm text-starlight">
          &euro;{hotel.pricePerNight.toLocaleString()} <span className="text-silver">/ night</span>
        </p>
        <button onClick={() => onSelect(hotel)} className="btn-header mt-12 w-full text-caption">
          Book hotel
        </button>
      </div>
    </div>
  );
}
