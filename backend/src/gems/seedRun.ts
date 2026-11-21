// Fills the gem library once, in the background, when GEM_SEED_BUDGET (Google searches) is set.
// Progress lives in the database (GemSearch rows with source "seed"), so restarts continue, never repeat.
import { prisma } from '../utils/prisma';
import { geocode } from '../routes/route';
import { kmBetween, routeLine, type LatLng } from '../utils/routeGems';
import { CITIES } from './cities';
import { libraryDeps, seedGems } from './library';

/** Each city to its `n` nearest neighbours within `maxKm`, every pair once. */
export function cityPairs(points: LatLng[], n = 3, maxKm = 700): [LatLng, LatLng][] {
  const seen = new Set<string>();
  const out: [LatLng, LatLng][] = [];
  points.forEach((a, i) => {
    points
      .map((b, j) => ({ j, km: kmBetween(a, b) }))
      .filter((x) => x.j !== i && x.km <= maxKm)
      .sort((x, y) => x.km - y.km)
      .slice(0, n)
      .forEach(({ j }) => {
        const k = [i, j].sort((x, y) => x - y).join('-');
        if (!seen.has(k)) {
          seen.add(k);
          out.push([a, points[j]]);
        }
      });
  });
  return out;
}

export async function runGemSeed(): Promise<void> {
  const budget = Number(process.env.GEM_SEED_BUDGET ?? 0);
  if (!(budget > 0) || !process.env.GOOGLE_MAPS_API_KEY) return;
  const alreadySpent = await prisma.gemSearch.count({ where: { source: 'seed' } });
  if (alreadySpent >= budget) return console.log(`[gems] seed done (${alreadySpent} searches)`);
  console.log(`[gems] seeding: ${alreadySpent} of ${budget} searches used`);
  const points: LatLng[] = [];
  for (const city of CITIES) {
    const p = await geocode(city).catch(() => null);
    if (p) points.push(p);
  }
  const out = await seedGems(libraryDeps(prisma), {
    budget,
    alreadySpent,
    pairs: cityPairs(points),
    road: async (a, b) => (await routeLine([a, b])).points,
    log: (m) => console.log(m),
  });
  console.log(`[gems] seed run finished: ${out.calls} searches, ${await prisma.placeGem.count()} gems in the library`);
}
