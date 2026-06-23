import { useState } from 'react';
import { Star } from 'lucide-react';
import { baseURL } from '@/lib/apiClient';
import type { RestaurantOption } from '@/types';

interface RestaurantOptionCardProps {
  restaurant: RestaurantOption;
  onSelect: (restaurant: RestaurantOption) => void;
}

export function RestaurantOptionCard({ restaurant, onSelect }: RestaurantOptionCardProps) {
  const [errored, setErrored] = useState(false);

  return (
    <div className="overflow-hidden rounded-container border border-lead/40">
      {restaurant.imageUrl && !errored ? (
        <img
          src={`${baseURL}${restaurant.imageUrl}`}
          alt={restaurant.name}
          loading="lazy"
          onError={() => setErrored(true)}
          className="h-40 w-full object-cover"
        />
      ) : (
        <div aria-hidden className="h-40 w-full bg-gradient-to-br from-mercury-blue/30 via-plum/20 to-deep-space" />
      )}
      <div className="p-16">
        <p className="text-body-sm font-w480 text-starlight">{restaurant.name}</p>
        <p className="mt-4 text-caption text-silver">
          {restaurant.cuisine} &middot; {'€'.repeat(restaurant.priceLevel)}
        </p>
        <div className="mt-8 flex items-center gap-4 text-caption text-silver">
          <Star size={14} className="fill-mercury-blue text-mercury-blue" />
          {restaurant.rating.toFixed(1)}
        </div>
        <button onClick={() => onSelect(restaurant)} className="btn-header mt-12 w-full text-caption">
          Book restaurant
        </button>
      </div>
    </div>
  );
}
