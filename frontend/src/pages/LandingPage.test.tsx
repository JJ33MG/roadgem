import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { LandingPage } from './LandingPage';

vi.mock('@/components/planner/TripPlanner', () => ({ TripPlanner: () => <form aria-label="Plan a trip" /> }));

describe('LandingPage', () => {
  it('says why the gems can be trusted', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 2, name: 'AI invents places. Routify checks them.' })).toBeInTheDocument();
  });
});
