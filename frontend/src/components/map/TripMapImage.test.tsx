import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TripMapImage } from './TripMapImage';

describe('TripMapImage', () => {
  it('shows the Google map of the day, opening the route in Google Maps', () => {
    render(<TripMapImage tripId="t1" from={1} to={2} version="abc" href="https://maps.example/route" fallback={<p>globe</p>} />);
    const img = screen.getByRole('img', { name: 'Map of the route, today’s drive in dark' });
    expect(img.getAttribute('src')).toBe('/api/trips/t1/map?from=1&to=2&w=640&h=440&v=abc');
    expect(screen.getByRole('link', { name: /Map of the route/ })).toHaveAttribute('href', 'https://maps.example/route');
  });

  it('falls back to the globe when the image cannot load', () => {
    render(<TripMapImage tripId="t1" from={0} to={1} version="v" href="#" fallback={<p>globe</p>} />);
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByText('globe')).toBeInTheDocument();
  });
});
