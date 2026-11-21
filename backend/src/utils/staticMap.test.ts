import { describe, expect, it } from 'vitest';
import { decodePolyline } from './routeGems';
import { encodePolyline, legOfLine, staticMapUrl } from './staticMap';

const line = Array.from({ length: 300 }, (_, i) => ({ lat: 40.4 + i * 0.01, lng: -3.7 + i * 0.012 }));
const stops = [line[0], line[150], line[299]].map((p, i) => ({ location: ['Madrid', 'Zaragoza', 'Barcelona'][i], latitude: p.lat, longitude: p.lng }));

describe('static Google map of a trip', () => {
  it('encodes a line that Google decodes back to the same points', () => {
    const back = decodePolyline(encodePolyline(line));
    expect(back).toHaveLength(300);
    expect(back[123].lat).toBeCloseTo(line[123].lat, 5);
    expect(back[299].lng).toBeCloseTo(line[299].lng, 5);
  });

  it('cuts the road of one day out of the whole route, from stop to stop', () => {
    const leg = legOfLine(line, stops[1], stops[2]);
    expect(leg[0]).toEqual(line[150]);
    expect(leg[leg.length - 1]).toEqual(line[299]);
  });

  it('draws the whole road, the day in ink on top, and numbered nights, with the key from the server', () => {
    const url = new URL(staticMapUrl({ line, stops, gems: [{ latitude: 41, longitude: -2 }], day: { from: 1, to: 2 } }, { width: 640, height: 400, key: 'K' }));
    expect(url.origin + url.pathname).toBe('https://maps.googleapis.com/maps/api/staticmap');
    expect(url.searchParams.get('size')).toBe('640x400');
    expect(url.searchParams.get('scale')).toBe('2');
    expect(url.searchParams.get('key')).toBe('K');
    const paths = url.searchParams.getAll('path');
    expect(paths).toHaveLength(2);
    expect(paths[0]).toMatch(/^color:0x035f5cff\|weight:5\|enc:/);
    expect(paths[1]).toMatch(/^color:0x191714ff\|weight:7\|enc:/);
    const markers = url.searchParams.getAll('markers').join(' ');
    expect(markers).toContain('label:S');
    expect(markers).toContain('label:1');
    expect(markers).toContain('41,-2');
  });

  it('stays under Google’s URL limit for a very long road', () => {
    const long = Array.from({ length: 20000 }, (_, i) => ({ lat: 36 + i * 0.001, lng: -9 + i * 0.0013 }));
    const url = staticMapUrl({ line: long, stops, gems: [] }, { width: 640, height: 400, key: 'K' });
    expect(url.length).toBeLessThan(15000);
  });
});
