// Counts clicks on booking and rental links (affiliate partners), sent by the browser as a beacon.
import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { optionalAuth, AuthRequest } from '../middleware/auth';

const router = Router();

/** The partners the site links to (see frontend/src/lib/track.ts). */
const PARTNERS = new Set(['booking', 'airbnb', 'rentalcars', 'autoeurope', 'viator', 'getyourguide']);
export const isKnownPartner = (p: unknown): p is string => typeof p === 'string' && PARTNERS.has(p);

/** A fixed-window counter per key, kept in memory (one instance; a restart resets it). */
export function rateLimiter(max: number, windowMs: number) {
  const hits = new Map<string, { start: number; count: number }>();
  return (key: string, now = Date.now()): boolean => {
    const h = hits.get(key);
    if (!h || now - h.start > windowMs) {
      if (hits.size > 10_000) hits.clear();
      hits.set(key, { start: now, count: 1 });
      return true;
    }
    h.count += 1;
    return h.count <= max;
  };
}

const allowClick = rateLimiter(30, 60_000);
const CUID = /^[a-z0-9]{20,40}$/;

router.post('/click', optionalAuth, async (req: AuthRequest, res: Response) => {
  const { partner, tripId } = (req.body ?? {}) as { partner?: unknown; tripId?: unknown };
  if (!isKnownPartner(partner)) return res.status(400).json({ error: 'Unknown partner' });
  if (!allowClick(req.ip ?? 'unknown')) return res.status(429).json({ error: 'Too many clicks' });
  try {
    await prisma.affiliateClick.create({
      data: { partner, tripId: typeof tripId === 'string' && CUID.test(tripId) ? tripId : null, userId: req.userId ?? null },
    });
  } catch {
    // A lost click count never breaks the visitor's way to the booking site.
  }
  res.status(204).end();
});

export default router;
