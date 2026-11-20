import { describe, expect, it } from 'vitest';
import { decodePolyline, mapData } from './polyline';

describe('decodePolyline', () => {
  it('decodes Google’s example polyline', () => {
    expect(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@')).toEqual([
      [38.5, -120.2],
      [40.7, -120.95],
      [43.252, -126.453],
    ]);
  });
});

describe('mapData', () => {
  const stops = [
    { location: 'Madrid, Spain', latitude: 40.4, longitude: -3.7 },
    { location: 'Burgos, Spain', latitude: 42.3, longitude: -3.7 },
  ];
  it('draws the stored road when there is one, else straight lines between the stops', () => {
    expect(mapData(stops, [], '_p~iF~ps|U_ulLnnqC').line).toEqual([[38.5, -120.2], [40.7, -120.95]]);
    expect(mapData(stops, [], undefined).line).toEqual([[40.4, -3.7], [42.3, -3.7]]);
  });

  it('keeps only stops and gems that have coordinates', () => {
    const d = mapData([...stops, { location: 'Nowhere', latitude: 0, longitude: 0 }], [
      { name: 'Gem', latitude: 41, longitude: -3.6 },
      { name: 'Lost', latitude: undefined as unknown as number, longitude: 2 },
    ], undefined);
    expect(d.stops.map((s) => s.label)).toEqual(['Madrid', 'Burgos']);
    expect(d.gems.map((g) => g.name)).toEqual(['Gem']);
  });
});
