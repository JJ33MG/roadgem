import { useEffect, useState } from 'react';
import { tripsApi } from '@/lib/api';
import type { Trip } from '@/types';

export function useUserTrips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    tripsApi
      .getUserTrips()
      .then((res) => setTrips(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load trips'))
      .finally(() => setIsLoading(false));
  }, []);

  return { trips, isLoading, error };
}
