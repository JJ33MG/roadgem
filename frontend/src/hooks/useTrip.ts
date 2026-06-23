import { useEffect, useState } from 'react';
import { tripsApi } from '@/lib/api';
import type { TripDetail } from '@/types';

export function useTrip(tripId: string | undefined) {
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) return;

    setIsLoading(true);
    tripsApi
      .getById(tripId)
      .then((res) => setTrip(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load trip'))
      .finally(() => setIsLoading(false));
  }, [tripId]);

  return { trip, isLoading, error };
}
