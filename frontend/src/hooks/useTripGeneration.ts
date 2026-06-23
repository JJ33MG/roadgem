import { useState } from 'react';
import axios from 'axios';
import { tripsApi } from '@/lib/api';
import type { GeneratedTrip, TripSearchParams } from '@/types';

interface UseTripGenerationResult {
  trip: GeneratedTrip | null;
  isLoading: boolean;
  error: string | null;
  limitReached: boolean;
  generateTrip: (params: TripSearchParams) => Promise<GeneratedTrip | null>;
  dismissLimit: () => void;
}

export function useTripGeneration(): UseTripGenerationResult {
  const [trip, setTrip] = useState<GeneratedTrip | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  async function generateTrip(params: TripSearchParams): Promise<GeneratedTrip | null> {
    setIsLoading(true);
    setError(null);
    setLimitReached(false);

    try {
      const res = await tripsApi.generate(params);
      setTrip(res.data);
      return res.data;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.code === 'TRIP_LIMIT_REACHED') {
        setLimitReached(true);
        setError(err.response.data.error);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to generate trip');
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  function dismissLimit() {
    setLimitReached(false);
  }

  return { trip, isLoading, error, limitReached, generateTrip, dismissLimit };
}
