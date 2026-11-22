import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PricingPage } from './PricingPage';

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/hooks/useSubscription', () => ({ useSubscription: () => ({ isPremium: false }) }));
vi.mock('@/hooks/useManageSubscription', () => ({ useManageSubscription: () => ({ upgrade: vi.fn() }) }));

describe('PricingPage', () => {
  it('shows Free and Plus with their prices and what Plus adds', () => {
    const { container } = render(<MemoryRouter><PricingPage /></MemoryRouter>);
    expect(screen.getByText('€0')).toBeInTheDocument();
    expect(screen.getByText('€9')).toBeInTheDocument();
    expect(screen.getByText('€4.99')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Trip pass' })).toBeInTheDocument();
    expect(screen.getAllByText('The cheapest route, without toll roads').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Real costs per day: fuel, tolls and vignettes').length).toBeGreaterThan(0);
    expect(screen.getByText('Unlimited trips')).toBeInTheDocument();
    expect(screen.getAllByText('Every gem on the route').length).toBeGreaterThan(0);
    expect(screen.getAllByText('A printable PDF of the trip').length).toBeGreaterThan(0);
    expect(container.querySelector('[class*="gradient"]')).toBeNull();
    expect(screen.queryByText(/Roadgem/i)).toBeNull();
    expect(screen.getByRole('radio', { name: 'Yearly, €59' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Plan a trip, then get its pass' })).toHaveAttribute('href', '/plan');
  });
});
