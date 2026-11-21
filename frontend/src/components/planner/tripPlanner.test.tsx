import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const gen = vi.hoisted(() => ({ isLoading: false, error: null as string | null }));
vi.mock('@/hooks/useTripGeneration', () => ({
  useTripGeneration: () => ({ isLoading: gen.isLoading, error: gen.error, limitReached: false, generateTrip: vi.fn(async () => null), dismissLimit: () => {} }),
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
      // On its own light panel: on the homepage the planner sits on the dark band.
      expect(within(screen.getByRole('region', { name: 'Planning your trip' })).getByTestId('progress')).toHaveTextContent('"from":{"lat":52.37,"lng":4.9}');
    });
    gen.isLoading = false;
  });

  it('shows a planning error on a light panel, readable on the dark homepage band', () => {
    gen.error = 'Could not reach the server. Check your connection and try again.';
    render(<MemoryRouter><TripPlanner /></MemoryRouter>);
    const box = screen.getByRole('region', { name: 'Your trip was not planned' });
    expect(within(box).getByRole('alert')).toHaveTextContent('Could not reach the server');
    gen.error = null;
  });
});
