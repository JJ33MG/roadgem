// Honest launch content: gems of the week from the gem library, and posts by the RoamGem team labelled as such.
import { createHash } from 'node:crypto';
import { isAdmin } from './rules';

type LibraryGem = { placeId: string; name: string; lat: number; lng: number; rating: number; reviews: number; address: string; photoRef: string | null };

const WEEK_MS = 7 * 86_400_000;
/** Weeks since a Monday (5 Jan 1970): changes every Monday 00:00 UTC. */
const weekOf = (now: Date) => Math.floor((now.getTime() - 4 * 86_400_000) / WEEK_MS);
const countryOf = (address: string) => address.split(',').pop()?.trim() ?? '';

/** 8 well-rated library gems for this week, the same all week, from as many countries as possible. */
export function pickOfTheWeek<T extends LibraryGem>(gems: T[], now = new Date(), count = 8): T[] {
  const week = weekOf(now);
  const order = [...gems].sort((a, b) =>
    createHash('sha1').update(`${week}:${a.placeId}`).digest('hex').localeCompare(createHash('sha1').update(`${week}:${b.placeId}`).digest('hex')),
  );
  const picked: T[] = [];
  const countries = new Set<string>();
  for (const g of order) {
    if (picked.length >= count) break;
    if (!countries.has(countryOf(g.address))) {
      picked.push(g);
      countries.add(countryOf(g.address));
    }
  }
  for (const g of order) {
    if (picked.length >= count) break;
    if (!picked.includes(g)) picked.push(g);
  }
  return picked;
}

/** The team account and the moderators post as "RoamGem team", so it is clear the post is ours. */
export function teamLabel(user: { isTeam: boolean; email: string; name: string }, admins = process.env.ADMIN_EMAILS) {
  return user.isTeam || isAdmin(user.email, admins) ? { team: true, by: 'RoamGem team' } : { team: false, by: user.name };
}
