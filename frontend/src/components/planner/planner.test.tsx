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
    expect(screen.getByRole('button', { name: 'Holiday homes' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('submits the typed route with the planner values', () => {
    const onSubmit = vi.fn();
    render(<PlannerPanel onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('From'), { target: { value: 'Madrid' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: 'Brussels' } });
    fireEvent.click(screen.getByRole('button', { name: 'Plan my trip' }));
    expect(onSubmit).toHaveBeenCalledWith({ ...DEFAULT_PLAN, from: 'Madrid', to: 'Brussels', startDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) });
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

  it('checks the distance before planning and offers more days when they are too few', async () => {
    const onSubmit = vi.fn();
    const estimateKm = vi.fn().mockResolvedValue(1580);
    render(<PlannerPanel onSubmit={onSubmit} estimateKm={estimateKm} initial={{ ...DEFAULT_PLAN, days: 3, from: 'Madrid', to: 'Brussels' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Plan my trip' }));
    expect(await screen.findByText('About 5 days at 350 km a day')).toBeInTheDocument();
    expect(estimateKm).toHaveBeenCalledWith('Madrid', 'Brussels');
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Plan it in 5 days' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ days: 5 }));
  });

  it('can plan anyway with the days the traveller chose', async () => {
    const onSubmit = vi.fn();
    render(<PlannerPanel onSubmit={onSubmit} estimateKm={async () => 1580} initial={{ ...DEFAULT_PLAN, days: 3, from: 'Madrid', to: 'Brussels' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Plan my trip' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Keep 3 days' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ days: 3 }));
  });

  it('plans straight away when the distance fits or cannot be checked', async () => {
    const onSubmit = vi.fn();
    render(<PlannerPanel onSubmit={onSubmit} estimateKm={async () => null} initial={{ ...DEFAULT_PLAN, from: 'Madrid', to: 'Toledo' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Plan my trip' }));
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });

  it('starts with the vehicle: a campervan drives 280 km a day and sleeps at campsites', () => {
    const onSubmit = vi.fn();
    render(<PlannerPanel onSubmit={onSubmit} initial={{ ...DEFAULT_PLAN, from: 'Amsterdam', to: 'Garda' }} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Campervan' }));
    expect(screen.getByText('280 km')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Campsites' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Hotels' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Plan my trip' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ vehicle: 'campervan', kmPerDay: 280, stayTypes: ['campsite'] }));
  });

  it('keeps the form short: the finer settings sit in a closed Adjust section', () => {
    const { container } = render(<PlannerPanel onSubmit={() => {}} />);
    const adjust = container.querySelector('details');
    expect(adjust).not.toBeNull();
    expect(adjust).not.toHaveAttribute('open');
    expect(within(adjust as HTMLElement).getByText('Adjust')).toBeInTheDocument();
    expect(within(adjust as HTMLElement).getByRole('slider', { name: 'Kilometres a day' })).toBeInTheDocument();
  });

  it('asks when they leave and how many travel, and sends both', () => {
    const onSubmit = vi.fn();
    render(<PlannerPanel onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('From'), { target: { value: 'Madrid' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: 'Brussels' } });
    expect(screen.getByLabelText('Travellers')).toHaveValue(2);
    fireEvent.change(screen.getByLabelText('Leaving on'), { target: { value: '2027-05-01' } });
    fireEvent.change(screen.getByLabelText('Travellers'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Plan my trip' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ startDate: '2027-05-01', travellers: 4 }));
  });

  it('refuses a leaving day in the past', () => {
    const onSubmit = vi.fn();
    render(<PlannerPanel onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('From'), { target: { value: 'Madrid' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: 'Brussels' } });
    fireEvent.change(screen.getByLabelText('Leaving on'), { target: { value: '2020-01-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Plan my trip' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Pick a day from today on');
    expect(onSubmit).not.toHaveBeenCalled();
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
