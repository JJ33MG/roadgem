// A real Google map image of a trip (Maps Static API): the road, the day's drive on top, the nights and the gems.
import type { LatLng } from './routeGems';

type Stop = { location: string; latitude: number; longitude: number };
type Gem = { latitude: number; longitude: number };
export type TripMapInput = { line: LatLng[]; stops: Stop[]; gems: Gem[]; day?: { from: number; to: number } };

// The theme's accent and ink (oklch tokens in the frontend), as hex for Google.
const ACCENT = '0x035f5c';
const INK = '0x191714';
const URL_BUDGET = 14000; // Google allows 16 384 characters; keep a margin

function encodeValue(v: number): string {
  let n = v < 0 ? ~(v << 1) : v << 1;
  let out = '';
  while (n >= 0x20) {
    out += String.fromCharCode((0x20 | (n & 0x1f)) + 63);
    n >>= 5;
  }
  return out + String.fromCharCode(n + 63);
}

/** Google's encoded polyline format (precision 5); the inverse of decodePolyline. */
export function encodePolyline(points: LatLng[]): string {
  let lat = 0, lng = 0, out = '';
  for (const p of points) {
    const la = Math.round(p.lat * 1e5), ln = Math.round(p.lng * 1e5);
    out += encodeValue(la - lat) + encodeValue(ln - lng);
    [lat, lng] = [la, ln];
  }
  return out;
}

const near = (line: LatLng[], p: LatLng) => {
  let best = 0, bestD = Infinity;
  line.forEach((q, i) => {
    const d = (q.lat - p.lat) ** 2 + (q.lng - p.lng) ** 2;
    if (d < bestD) [best, bestD] = [i, d];
  });
  return best;
};

/** The part of the route between two stops (the road of one day). */
type Point = LatLng | { latitude: number; longitude: number };
const ll = (p: Point): LatLng => ('lat' in p ? p : { lat: p.latitude, lng: p.longitude });

export function legOfLine(line: LatLng[], a: Point, b: Point): LatLng[] {
  const [i, j] = [near(line, ll(a)), near(line, ll(b))];
  return i <= j ? line.slice(i, j + 1) : line.slice(j, i + 1).reverse();
}

/** Every n-th point (keeping the last) until the encoded line fits the budget. */
function fit(points: LatLng[], budget: number): string {
  let step = 1;
  for (;;) {
    const thin = points.filter((_, i) => i % step === 0 || i === points.length - 1);
    const enc = encodePolyline(thin);
    if (enc.length <= budget || thin.length <= 2) return enc;
    step *= 2;
  }
}

const at = (s: { latitude: number; longitude: number }) => `${+s.latitude.toFixed(5)},${+s.longitude.toFixed(5)}`;

export function staticMapUrl(trip: TripMapInput, opts: { width: number; height: number; key: string }): string {
  const p = new URLSearchParams({ size: `${opts.width}x${opts.height}`, scale: '2', maptype: 'roadmap', language: 'en', key: opts.key });
  const stops = trip.stops.filter((s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude));
  const line = trip.line.length > 1 ? trip.line : stops.map((s) => ({ lat: s.latitude, lng: s.longitude }));
  const leg = trip.day && stops[trip.day.from] && stops[trip.day.to] && trip.day.from !== trip.day.to
    ? legOfLine(line, stops[trip.day.from], stops[trip.day.to])
    : [];
  const share = leg.length > 1 ? 0.6 : 1;
  p.append('path', `color:${ACCENT}ff|weight:5|enc:${fit(line, URL_BUDGET * share)}`);
  if (leg.length > 1) p.append('path', `color:${INK}ff|weight:7|enc:${fit(leg, URL_BUDGET * 0.35)}`);
  // Start S, then each night numbered; gems as small accent dots.
  stops.forEach((s, i) => p.append('markers', `size:mid|color:${i === 0 ? INK : ACCENT}|label:${i === 0 ? 'S' : String(Math.min(i, 9))}|${at(s)}`));
  const gems = trip.gems.filter((g) => Number.isFinite(g.latitude) && Number.isFinite(g.longitude)).slice(0, 30);
  if (gems.length) p.append('markers', `size:tiny|color:${ACCENT}|${gems.map(at).join('|')}`);
  return `https://maps.googleapis.com/maps/api/staticmap?${p.toString().replace(/%2C/g, ',').replace(/%7C/g, '|').replace(/%3A/g, ':')}`;
}
