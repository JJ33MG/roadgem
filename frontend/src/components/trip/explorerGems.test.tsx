import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ explorerGems: vi.fn() }));
vi.mock('@/lib/community', () => api);
import { ExplorerGems } from './ExplorerGems';

describe('Explorer gems on a trip', () => {
  it('tells free members how many travellers found on this road, with Plus', async () => {
    api.explorerGems.mockResolvedValueOnce({ locked: true, count: 2 });
    render(<MemoryRouter><ExplorerGems tripId="t1" /></MemoryRouter>);
    expect(await screen.findByText('2 Explorer gems on this road, found by travellers. They come with Plus.')).toBeInTheDocument();
  });
  it('lists them for Plus', async () => {
    api.explorerGems.mockResolvedValueOnce({ gems: [{ id: 'g', name: 'Hidden waterfall', lat: 1, lng: 2, description: 'Behind the mill.' }] });
    render(<MemoryRouter><ExplorerGems tripId="t1" /></MemoryRouter>);
    expect(await screen.findByText('Hidden waterfall')).toBeInTheDocument();
  });
  it('shows nothing when there are none', async () => {
    api.explorerGems.mockResolvedValueOnce({ locked: true, count: 0 });
    const { container } = render(<MemoryRouter><ExplorerGems tripId="t1" /></MemoryRouter>);
    await new Promise((r) => setTimeout(r, 0));
    expect(container).toBeEmptyDOMElement();
  });
});
