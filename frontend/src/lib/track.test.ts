import { describe, expect, it, vi } from 'vitest';
import { goLink, partnerFor, trackClick } from './track';

describe('affiliate click tracking', () => {
  it('names the partner of a booking link', () => {
    expect(partnerFor('https://www.booking.com/searchresults.html?ss=Burgos')).toBe('booking');
    expect(partnerFor('https://www.airbnb.com/s/Burgos/homes')).toBe('airbnb');
    expect(partnerFor('https://www.rentalcars.com/en/?pickup-location=Madrid')).toBe('rentalcars');
    expect(partnerFor('https://example.com')).toBeNull();
  });

  it('sends a beacon with the partner and the trip', async () => {
    const beacon = vi.fn(() => true);
    Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true });
    trackClick('booking', 't1');
    expect(beacon).toHaveBeenCalledTimes(1);
    const [url, body] = beacon.mock.calls[0] as unknown as [string, Blob];
    expect(url).toMatch(/\/track\/click$/);
    const text = await new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.readAsText(body);
    });
    expect(JSON.parse(text)).toEqual({ partner: 'booking', tripId: 't1' });
  });

  it('sends partner links through the server, which credits and counts them', () => {
    const link = goLink('https://www.pitchup.com/campsites/spain/', 't1');
    expect(link).toMatch(/\/track\/go\/pitchup\?/);
    const q = new URLSearchParams(link.split('?')[1]);
    expect(q.get('to')).toBe('https://www.pitchup.com/campsites/spain/');
    expect(q.get('trip')).toBe('t1');
    expect(goLink('https://example.com/x')).toBe('https://example.com/x');
  });
});
