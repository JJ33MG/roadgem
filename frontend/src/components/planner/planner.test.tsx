import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_PLAN } from '@/lib/tripPlan';
import { FiltersSheet } from './FiltersSheet';
import { PlannerPanel } from './PlannerPanel';

describe('PlannerPanel', () => {
  it('starts on the approved defaults', () => {
    render(<PlannerPanel onSubmit={() => {}} />);
    expect(screen.getByText('350 km')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Gems a day' })).toHaveValue('3');
    expect(screen.getByRole('switch', { name: 'Road gems on the way' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: 'Campsites' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Hotels' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Airbnb and holiday homes' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('submits the typed route with the planner values', () => {
    const onSubmit = vi.fn();
    render(<PlannerPanel onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('From'), { target: { value: 'Madrid' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: 'Brussels' } });
    fireEvent.click(screen.getByRole('button', { name: 'Plan my trip' }));
    expect(onSubmit).toHaveBeenCalledWith({ ...DEFAULT_PLAN, from: 'Madrid', to: 'Brussels' });
  });

  it('hides the gems slider when gems are switched off', () => {
    render(<PlannerPanel onSubmit={() => {}} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Road gems on the way' }));
    expect(screen.queryByRole('slider', { name: 'Gems a day' })).toBeNull();
  });

  it('tells the traveller when the days are too few for the distance', () => {
    render(<PlannerPanel onSubmit={() => {}} routeKm={1580} initial={{ ...DEFAULT_PLAN, days: 3 }} />);
    expect(screen.getByText('About 5 days at 350 km a day')).toBeInTheDocument();
  });

  it('does not submit without a start and an end', () => {
    const onSubmit = vi.fn();
    render(<PlannerPanel onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Plan my trip' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Add where you start and where you end.')).toBeInTheDocument();
  });
});

describe('FiltersSheet', () => {
  it('lists all 24 filters and closes on Escape', () => {
    const onClose = vi.fn();
    render(<FiltersSheet open selected={[]} onChange={() => {}} onClose={onClose} />);
    const dialog = screen.getByRole('dialog', { name: 'All filters' });
    expect(within(dialog).getAllByRole('button', { pressed: false })).toHaveLength(24);
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
