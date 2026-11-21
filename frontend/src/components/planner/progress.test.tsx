import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/map/GlobeMap', () => ({ GlobeMap: (p: { arc?: unknown }) => <div data-testid="globe" data-arc={JSON.stringify(p.arc ?? null)} /> }));
import { PlanningProgress, PLANNING_STEPS } from './PlanningProgress';

describe('PlanningProgress', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('walks through the steps while the trip is made, and draws the arc on the globe', async () => {
    expect(PLANNING_STEPS).toEqual(['Calculating the route', 'Choosing where you sleep', 'Checking the gems', 'Adding up the costs']);
    render(<PlanningProgress from={{ lat: 52.37, lng: 4.9 }} to={{ lat: 45.6, lng: 10.7 }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Calculating the route');
    act(() => { vi.advanceTimersByTime(6000); });
    expect(screen.getByRole('status')).toHaveTextContent('Choosing where you sleep');
    act(() => { vi.advanceTimersByTime(60000); });
    expect(screen.getByRole('status')).toHaveTextContent('Adding up the costs');
    vi.useRealTimers(); // the globe loads lazily: let the import resolve
    expect(await screen.findByTestId('globe')).toHaveAttribute('data-arc', JSON.stringify([[4.9, 52.37], [10.7, 45.6]]));
  });
});
