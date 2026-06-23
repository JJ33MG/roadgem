import { useState } from 'react';
import axios from 'axios';
import { apiClient } from '@/lib/apiClient';
import type { GeneratedTrip, TripSearchParams } from '@/types';

const TIMEOUT_MS = 90_000;

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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort('timeout'), TIMEOUT_MS);

    try {
      const res = await apiClient.post<GeneratedTrip>('/trips/generate', params, {
        signal: controller.signal,
      });
      setTrip(res.data);
      return res.data;
    } catch (err) {
      // Timeout — AbortController fired
      if (
        err instanceof DOMException && err.name === 'AbortError' ||
        (axios.isAxiosError(err) && err.code === 'ERR_CANCELED') ||
        (err instanceof Error && err.message === 'timeout')
      ) {
        setError(
          'This is taking longer than usual — the server might be busy. Please try again.',
        );
        return null;
      }

      if (axios.isAxiosError(err)) {
        if (err.response?.data?.code === 'TRIP_LIMIT_REACHED') {
          setLimitReached(true);
          setError(err.response.data.error);
          return null;
        }

        if (err.response?.status && err.response.status >= 500) {
          setError('Something went wrong on our end. Please try again in a moment.');
          return null;
        }

        // Network error (no response received)
        if (!err.response) {
          setError('Could not reach the server. Check your connection and try again.');
          return null;
        }
      }

      setError(err instanceof Error ? err.message : 'Failed to generate trip');
      return null;
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }

  function dismissLimit() {
    setLimitReached(false);
  }

  return { trip, isLoading, error, limitReached, generateTrip, dismissLimit };
}
