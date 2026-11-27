// The community game's rules (spec: "Left to the builder"), kept free of the database so they are easy to test.

export type Point = { lat: number; lng: number };

export const SPOT_METRES = 300;
/** A moment may tag a gem this close to where the traveller is (camping nearby, the group at the lake). */
export const NEAR_GEM_METRES = 5000;

export type Period = 'today' | 'week' | 'month';
const PERIOD_DAYS: Record<Period, number> = { today: 1, week: 7, month: 30 };
/** The start of a rolling period: today = the last 24 h, week = 7 days, month = 30 days. */
export const periodStart = (period: Period, now = new Date()) => new Date(now.getTime() - PERIOD_DAYS[period] * 86_400_000);
export const POINTS = { photo: 10, challenge: 50, foundGem: 200 } as const;
export const OFFICIAL = { visitors: 10, likes: 20 } as const;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export function metresBetween(a: Point, b: Point): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

/** The photo counts only when the traveller is at the gem. */
export const onTheSpot = (gem: Point, traveller: Point) => metresBetween(gem, traveller) <= SPOT_METRES;

export const pointsFor = (post: { challenge: boolean }) => (post.challenge ? POINTS.challenge : POINTS.photo);

export const readyToBeOfficial = (s: { visitors: number; likes: number }) => s.visitors >= OFFICIAL.visitors && s.likes >= OFFICIAL.likes;

const SIGNATURES: [string, number[]][] = [
  ['image/jpeg', [0xff, 0xd8, 0xff]],
  ['image/png', [0x89, 0x50, 0x4e, 0x47]],
  ['image/webp', [0x52, 0x49, 0x46, 0x46]],
];

/** A data URL from the browser → the photo bytes, checked by their real file signature. */
export function decodePhoto(dataUrl: unknown): { bytes: Buffer; type: string } {
  const m = typeof dataUrl === 'string' ? /^data:image\/[a-z]+;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl) : null;
  if (!m) throw new Error('Add a photo (JPEG, PNG or WebP).');
  const bytes = Buffer.from(m[1], 'base64');
  if (bytes.length > MAX_PHOTO_BYTES) throw new Error('This photo is too large. Try again; the app makes it smaller.');
  const hit = SIGNATURES.find(([, sig]) => sig.every((b, i) => bytes[i] === b));
  if (!hit) throw new Error('This file is not a photo the app can use.');
  return { bytes, type: hit[0] };
}

export function isAdmin(email: string | undefined | null, list = process.env.ADMIN_EMAILS): boolean {
  if (!email || !list) return false;
  return list.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase());
}
