export type LatLngTuple = [number, number];

/** Google's encoded polyline format (precision 5). */
export function decodePolyline(encoded: string): LatLngTuple[] {
  const out: LatLngTuple[] = [];
  let i = 0, lat = 0, lng = 0;
  while (i < encoded.length) {
    for (const axis of [0, 1]) {
      let shift = 0, result = 0, b: number;
      do {
        b = encoded.charCodeAt(i++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20 && i < encoded.length);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += delta; else lng += delta;
    }
    out.push([Math.round(lat) / 1e5, Math.round(lng) / 1e5]);
  }
  return out;
}

type StopIn = { location: string; latitude: number; longitude: number };
type GemIn = { name: string; latitude: number; longitude: number };

const placed = (lat: unknown, lng: unknown) =>
  typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);

/** What the trip map draws: the road (stored line, else straight between stops), the nights and the gems. */
export function mapData<G extends GemIn>(stops: StopIn[], gems: G[], route: string | undefined) {
  const s = stops.filter((x) => placed(x.latitude, x.longitude)).map((x) => ({ label: x.location.split(',')[0].trim(), at: [x.latitude, x.longitude] as LatLngTuple }));
  const line = route ? decodePolyline(route) : s.map((x) => x.at);
  return { line, stops: s, gems: gems.filter((g) => placed(g.latitude, g.longitude)) };
}
