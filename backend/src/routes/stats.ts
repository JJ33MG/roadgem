// Numbers for the AI Agency Brain (repo ai-workflow): read daily with the STATS_TOKEN header.
import { timingSafeEqual } from 'node:crypto';
import { Router, Request, Response, NextFunction } from 'express';
import type { PrismaClient } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { PARTNERS } from '../utils/partners';
import { recentErrors } from '../middleware/errors';
import { mapStatus, type MapStatus } from './tripMap';

export interface RoutifyStats {
  generatedAt: string;
  users: { total: number; last7d: number };
  trips: { total: number; last7d: number };
  plus: number;
  affiliateClicks: { last7d: number; byPartner: Record<string, number> };
  community: { pending: number; approved: number };
  /** The gem library and how far its first fill (seed) has come. */
  gems: { library: number; seedSearches: number; seedBudget: number };
  /** What is set up, by name only (never a key): the Brain's launch list ticks these off. */
  setup: { mapsStatic: MapStatus; stripe: boolean; partners: string[]; adminEmails: boolean };
  /** Server errors (5xx) in the last 24 hours, and the latest one. */
  health: { errors24h: number; lastError: { at: string; message: string } | null };
}

const WEEK_MS = 7 * 86_400_000;

export async function buildStats(db: PrismaClient, now: Date): Promise<RoutifyStats> {
  const since = { createdAt: { gte: new Date(now.getTime() - WEEK_MS) } };
  const [users, users7, trips, trips7, plus, clicks7, byPartner, pending, approved, library, seedSearches] = await Promise.all([
    db.user.count(),
    db.user.count({ where: since }),
    db.trip.count(),
    db.trip.count({ where: since }),
    db.user.count({ where: { subscriptionTier: 'premium' } }),
    db.affiliateClick.count({ where: since }),
    db.affiliateClick.groupBy({ by: ['partner'], where: since, _count: { _all: true } }),
    db.post.count({ where: { status: 'pending' } }),
    db.post.count({ where: { status: 'public' } }),
    db.placeGem.count(),
    db.gemSearch.count({ where: { source: 'seed' } }),
  ]);
  const env = process.env;
  const set = (v?: string) => Boolean(v && !/YOUR_|^$/.test(v));
  return {
    generatedAt: now.toISOString(),
    users: { total: users, last7d: users7 },
    trips: { total: trips, last7d: trips7 },
    plus,
    affiliateClicks: { last7d: clicks7, byPartner: Object.fromEntries(byPartner.map((r) => [r.partner, r._count._all])) },
    community: { pending, approved },
    gems: { library, seedSearches, seedBudget: Number(env.GEM_SEED_BUDGET ?? 0) || 0 },
    setup: {
      mapsStatic: mapStatus(),
      stripe: set(env.STRIPE_SECRET_KEY) && set(env.STRIPE_PRICE_ID),
      partners: Object.entries(PARTNERS).filter(([, p]) => set(p.param && env[p.param.env]) || set(p.deeplinkEnv && env[p.deeplinkEnv])).map(([id]) => id),
      adminEmails: set(env.ADMIN_EMAILS),
    },
    health: recentErrors(now.getTime()),
  };
}

/** True only when a token is configured and the header matches it exactly. */
export function tokenMatches(header: unknown, configured = process.env.STATS_TOKEN): boolean {
  if (!configured || typeof header !== 'string' || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(configured);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function statsRouter(db: PrismaClient = prisma) {
  const router = Router();
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    if (!tokenMatches(req.headers['x-stats-token'])) return res.status(401).json({ error: 'Unauthorized' });
    try {
      res.json(await buildStats(db, new Date()));
    } catch (err) {
      next(err);
    }
  });
  return router;
}
