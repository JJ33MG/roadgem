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
    expect(screen.getByText('Unlimited trips')).toBeInTheDocument();
    expect(screen.getByText('Every gem on the route')).toBeInTheDocument();
    expect(screen.getByText('A printable PDF of the trip')).toBeInTheDocument();
    expect(container.querySelector('[class*="gradient"]')).toBeNull();
    expect(screen.queryByText(/Roadgem/i)).toBeNull();
  });
});
