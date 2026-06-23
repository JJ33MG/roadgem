import { useEffect, useState } from 'react';
import { bookingsApi } from '@/lib/api';
import type { HotelOption, RestaurantOption } from '@/types';

export function useHotelOptions(tripId: string | undefined) {
  const [hotels, setHotels] = useState<HotelOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!tripId) return;
    bookingsApi
      .getHotelOptions(tripId)
      .then((res) => setHotels(res.data))
      .finally(() => setIsLoading(false));
  }, [tripId]);

  return { hotels, isLoading };
}

export function useRestaurantOptions(tripId: string | undefined) {
  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!tripId) return;
    bookingsApi
      .getRestaurantOptions(tripId)
      .then((res) => setRestaurants(res.data))
      .finally(() => setIsLoading(false));
  }, [tripId]);

  return { restaurants, isLoading };
}
