import { useEffect, useState } from 'react';
import { accommodationsApi } from '@/lib/api';
import type { AccommodationOption, AccommodationType } from '@/types';

interface UseAccommodationsParams {
  lat: number | undefined;
  lng: number | undefined;
  location: string;
  types?: AccommodationType[];
  checkin?: string;
  checkout?: string;
  enabled?: boolean;
}

export function useAccommodations({ lat, lng, location, types, checkin, checkout, enabled = true }: UseAccommodationsParams) {
  const [accommodations, setAccommodations] = useState<AccommodationOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || lat === undefined || lng === undefined) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    accommodationsApi
      .search({ lat, lng, location, types, checkin, checkout })
      .then((res) => {
        if (cancelled) return;
        setAccommodations(res.data.accommodations);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load accommodations');
        setAccommodations([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lat, lng, location, types?.join(','), checkin, checkout, enabled]);

  return { accommodations, isLoading, error };
}
