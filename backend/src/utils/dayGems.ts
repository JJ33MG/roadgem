// Gems for every day of a trip (Jarne, 26 Nov): each day gets its own, from that day's road or, on a day
// spent in one town, from around that town. A place without a photo never becomes a gem.
import { kmBetween, nearLine, pickGems, samplePoints, toGem, type LatLng, type PlaceCandidate, type RoadLine, type RouteGem } from './routeGems';

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(',')[0].trim();

/** For each day, the index of the stop where the traveller sleeps (as the page works it out). */
export function nightIndexes(stops: { location: string }[], overnights: string[], days: number): number[] {
  const last = Math.max(0, stops.length - 1);
  return Array.from({ length: days }, (_, i) => {
    const named = fold(overnights[i] ?? '');
    const hit = named ? stops.findIndex((st) => { const f = fold(st.location); return !!f && (f.startsWith(named) || named.startsWith(f)); }) : -1;
    return hit >= 0 ? hit : Math.min(i + 1, last);
  });
}

const nearest = (line: LatLng[], p: LatLng) => line.reduce((best, q, i) => (kmBetween(q, p) < kmBetween(line[best], p) ? i : best), 0);

/** Points around a town (the town and four about 10 km away), for a day spent there. */
const around = (p: LatLng): LatLng[] => [p, { lat: p.lat + 0.09, lng: p.lng }, { lat: p.lat - 0.09, lng: p.lng }, { lat: p.lat, lng: p.lng + 0.13 }, { lat: p.lat, lng: p.lng - 0.13 }];

type DayGem = RouteGem & { day: number };

export async function findDayGems(o: {
  road: RoadLine;
  stops: LatLng[];
  /** Per day, the index of tonight's stop (nightIndexes). */
  nights: number[];
  perDay: number;
  at: (p: LatLng) => Promise<PlaceCandidate[]>;
}): Promise<DayGem[]> {
  const used = new Set<string>();
  const out: DayGem[] = [];
  const line = o.road.points.length > 1 ? o.road.points : o.stops;
  for (let d = 1; d <= o.nights.length; d++) {
    const a = o.stops[d === 1 ? 0 : o.nights[d - 2]];
    const b = o.stops[o.nights[d - 1]];
    if (!a || !b) continue;
    const driving = kmBetween(a, b) > 15;
    let segment: LatLng[] = [b];
    let points = around(b);
    if (driving) {
      const [i, j] = [nearest(line, a), nearest(line, b)].sort((x, y) => x - y);
      segment = line.slice(i, j + 1);
      if (segment.length < 2) segment = [a, b];
      points = samplePoints(segment, 40, 8);
    }
    const found = (await Promise.all(points.map((p) => o.at(p).catch(() => [] as PlaceCandidate[])))).flat();
    const fresh = found.filter((c) => c.photoRef && !used.has(c.placeId));
    // Close to the road (or the town) first; wider when that gives too few.
    let picks = pickGems(nearLine(fresh, segment, driving ? 15 : 20), o.perDay);
    if (picks.length < o.perDay) {
      const more = pickGems(nearLine(fresh, segment, 35).filter((c) => !picks.some((p) => p.placeId === c.placeId)), o.perDay - picks.length);
      picks = [...picks, ...more];
    }
    for (const c of picks) {
      used.add(c.placeId);
      out.push({ ...toGem(c), day: d });
    }
  }
  return out;
}
