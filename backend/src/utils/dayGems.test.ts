import { describe, expect, it } from 'vitest';
import { findDayGems, nightIndexes } from './dayGems';
import { gemsFor } from './gems';
import type { PlaceCandidate } from './routeGems';

// Jarne, 26 Nov: "they have to have some gems every day", "a gem always needs a picture".
const place = (id: string, lat: number, lng: number, photo: string | null = `places/${id}/photos/p`): PlaceCandidate => ({
  placeId: id, name: id, rating: 4.6, reviews: 200, address: '', lat, lng, types: ['tourist_attraction'], photoRef: photo,
});

describe('nightIndexes: the stop each day ends at', () => {
  it('follows the overnight names, accents and country suffixes aside', () => {
    const stops = [{ location: 'Vienna, Austria' }, { location: 'Brno, Czechia' }, { location: 'Prague, Czech Republic' }];
    expect(nightIndexes(stops, ['Brno', 'Prague, Czech Republic', 'Prague'], 3)).toEqual([1, 2, 2]);
  });
  it('falls back to the next stop when a name is unknown', () => {
    expect(nightIndexes([{ location: 'A' }, { location: 'B' }], ['', 'Zzz'], 2)).toEqual([1, 1]);
  });
});

describe('findDayGems', () => {
  const stops = [{ lat: 48.2, lng: 16.37 }, { lat: 49.19, lng: 16.6 }];
  const road = { points: [stops[0], { lat: 48.7, lng: 16.5 }, stops[1]], encoded: '', legs: [] };
  const lib: PlaceCandidate[] = [
    place('road1', 48.5, 16.45), place('road2', 48.9, 16.55), place('nophoto', 48.6, 16.5, null),
    place('brno1', 49.2, 16.61), place('brno2', 49.18, 16.58), place('brno3', 49.21, 16.62),
  ];
  const at = async (p: { lat: number; lng: number }) => lib.filter((c) => Math.abs(c.lat - p.lat) < 0.4 && Math.abs(c.lng - p.lng) < 0.4);

  it('gives every day its own gems, also a day spent in one town, and marks the day', async () => {
    const gems = await findDayGems({ road, stops, nights: [1, 1], perDay: 2, at });
    const day1 = gems.filter((g) => g.day === 1).map((g) => g.placeId);
    const day2 = gems.filter((g) => g.day === 2).map((g) => g.placeId);
    expect(day1.length).toBe(2);
    expect(day2.length).toBe(2);
    expect(new Set([...day1, ...day2]).size).toBe(4); // never the same gem twice
  });

  it('never picks a place without a photo', async () => {
    const gems = await findDayGems({ road, stops, nights: [1, 1], perDay: 5, at, photo: async () => null });
    expect(gems.some((g) => g.placeId === 'nophoto')).toBe(false);
    expect(gems.every((g) => g.photoUrl)).toBe(true);
  });

  it('finds a photo elsewhere (Wikimedia Commons) when Google has none, and credits it', async () => {
    const gems = await findDayGems({ road, stops, nights: [1, 1], perDay: 5, at, photo: async (c) => (c.placeId === 'nophoto' ? 'https://upload.wikimedia.org/x.jpg' : null) });
    const g = gems.find((x) => x.placeId === 'nophoto')!;
    expect(g.photoUrl).toBe('https://upload.wikimedia.org/x.jpg');
    expect(g.photoCredit).toBe('Wikimedia Commons');
  });
});

describe('gemsFor with gems per day: the free plan shows the best gem of every day', () => {
  it('keeps one gem per day for free and counts the rest as locked', () => {
    const g = [{ day: 1, n: 'a' }, { day: 1, n: 'b' }, { day: 2, n: 'c' }, { day: 3, n: 'd' }, { day: 3, n: 'e' }];
    const free = gemsFor(g, false);
    expect(free.hiddenGems.map((x) => x.n)).toEqual(['a', 'c', 'd']);
    expect(free.lockedGems).toBe(2);
    expect(gemsFor(g, true).hiddenGems.length).toBe(5);
  });
});
