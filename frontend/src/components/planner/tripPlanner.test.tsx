import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const gen = vi.hoisted(() => ({ isLoading: false }));
vi.mock('@/hooks/useTripGeneration', () => ({
  useTripGeneration: () => ({ isLoading: gen.isLoading, error: null, limitReached: false, generateTrip: vi.fn(async () => null), dismissLimit: () => {} }),
}));
vi.mock('@/lib/apiClient', () => ({
  apiClient: { get: vi.fn(async () => ({ data: { km: 400, from: { lat: 52.37, lng: 4.9 }, to: { lat: 50.85, lng: 4.35 } } })) },
}));
vi.mock('./PlanningProgress', () => ({ PlanningProgress: (p: { from?: unknown; to?: unknown }) => <p data-testid="progress">{JSON.stringify(p)}</p> }));
import { TripPlanner } from './TripPlanner';
import { DEFAULT_PLAN } from '@/lib/tripPlan';

describe('TripPlanner', () => {
  it('shows the globe progress with both ends while the trip is made', async () => {
    const { rerender } = render(<MemoryRouter><TripPlanner initial={{ ...DEFAULT_PLAN, from: 'Amsterdam', to: 'Brussels' }} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Plan my trip' }));
    gen.isLoading = true;
    await waitFor(() => {
      rerender(<MemoryRouter><TripPlanner initial={{ ...DEFAULT_PLAN, from: 'Amsterdam', to: 'Brussels' }} /></MemoryRouter>);
      expect(screen.getByTestId('progress')).toHaveTextContent('"from":{"lat":52.37,"lng":4.9}');
    });
    gen.isLoading = false;
  });
});
