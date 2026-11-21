import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MapBoundary } from './MapBoundary';

function Broken(): JSX.Element {
  throw new Error('Failed to fetch dynamically imported module');
}

describe('MapBoundary', () => {
  it('shows a plain note instead of breaking the page when the map cannot load', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<MapBoundary><Broken /></MapBoundary>);
    expect(screen.getByText('The map is not available right now. The plan below has every stop.')).toBeInTheDocument();
  });
});
