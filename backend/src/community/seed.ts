// Before the soft launch the feed is filled with moments by the RoamGem team: well-rated gems from the gem
// library with a real photo from Wikimedia Commons and its credit. Labelled as the team; no likes, no fake people.
import { randomBytes } from 'node:crypto';
import axios from 'axios';
import bcrypt from 'bcrypt';
import type { PrismaClient } from '@prisma/client';
import { commonsPhotoNear } from '../utils/commonsPhoto';

type Place = { placeId: string; name: string; lat: number; lng: number; address: string; rating: number; reviews: number; types: string };
type Photo = { bytes: Buffer; type: string; credit: string };
export type FetchPhoto = (place: Place) => Promise<Photo | null>;

const TEAM_EMAIL = 'team@roamgem.com';
const KINDS: [string, string][] = [
  ['observation_deck', 'A viewpoint'], ['hiking_area', 'A hiking spot'], ['national_park', 'A national park'], ['beach', 'A beach'],
  ['botanical_garden', 'A garden'], ['museum', 'A museum'], ['historical_landmark', 'A historic landmark'], ['park', 'A park'],
  ['zoo', 'A zoo'], ['aquarium', 'An aquarium'], ['tourist_attraction', 'A sight'],
];

export function captionFor(p: { types: string; rating: number; reviews: number }): string {
  const types = p.types.split(',').map((t) => t.trim());
  const kind = KINDS.find(([t]) => types.includes(t))?.[1] ?? 'A gem';
  return `${kind} rated ${p.rating.toFixed(1)} by ${p.reviews.toLocaleString('en')} travellers on Google.`;
}

const countryOf = (address: string) => (address.split(',').pop() ?? '').trim().toLowerCase();

/** Places from as many countries as possible: one per country in turn. */
function spread<T extends { address: string }>(places: T[]): T[] {
  const byCountry = new Map<string, T[]>();
  for (const p of places) byCountry.set(countryOf(p.address), [...(byCountry.get(countryOf(p.address)) ?? []), p]);
  const queues = [...byCountry.values()];
  const out: T[] = [];
  for (let i = 0; out.length < places.length; i++) for (const q of queues) if (q[i]) out.push(q[i]);
  return out;
}

export const commonsPhoto: FetchPhoto = async (place) => {
  const url = await commonsPhotoNear(place.lat, place.lng, place.name);
  if (!url) return null;
  const res = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer', timeout: 10_000, maxContentLength: 2_000_000, headers: { 'User-Agent': 'RoamGem/1.0 (road trip planner)' } }).catch(() => null);
  const type = String(res?.headers['content-type'] ?? '').split(';')[0];
  if (!res || !['image/jpeg', 'image/png', 'image/webp'].includes(type)) return null;
  const source = url.includes('wikipedia') ? 'Wikipedia' : 'Wikimedia Commons';
  return { bytes: Buffer.from(res.data), type, credit: `Photo: ${source}` };
};

export async function seedTeamMoments(db: PrismaClient, opts: { fetchPhoto?: FetchPhoto; target?: number } = {}): Promise<{ created: number }> {
  const fetchPhoto = opts.fetchPhoto ?? commonsPhoto;
  const target = opts.target ?? 50;
  const team = await db.user.upsert({
    where: { email: TEAM_EMAIL },
    create: { email: TEAM_EMAIL, name: 'RoamGem team', isTeam: true, password: await bcrypt.hash(randomBytes(24).toString('hex'), 10) },
    update: { isTeam: true },
  });
  let have = await db.post.count({ where: { userId: team.id } });
  if (have >= target) return { created: 0 };
  const done = new Set((await db.post.findMany({ where: { userId: team.id }, select: { gem: { select: { placeId: true } } } })).map((p) => p.gem.placeId));
  const places = spread(await db.placeGem.findMany({ where: { rating: { gte: 4.5 }, reviews: { gte: 200 } }, orderBy: { reviews: 'desc' }, take: 600 }));
  let created = 0;
  for (const p of places) {
    if (have >= target) break;
    if (done.has(p.placeId)) continue;
    const photo = await fetchPhoto(p).catch(() => null);
    if (!photo) continue;
    const gem = await db.gem.upsert({
      where: { placeId: p.placeId },
      create: { placeId: p.placeId, name: p.name, lat: p.lat, lng: p.lng, address: p.address, status: 'official' },
      update: {},
    });
    await db.post.create({
      data: { userId: team.id, gemId: gem.id, caption: captionFor(p), photo: photo.bytes, photoType: photo.type, credit: photo.credit, distanceM: 0, status: 'public', points: 0, reviewedAt: new Date() },
    });
    done.add(p.placeId);
    have++;
    created++;
  }
  return { created };
}
