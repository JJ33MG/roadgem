// Counts clicks on booking and rental links (affiliate partners), sent by the browser as a beacon.
import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { optionalAuth, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/click', optionalAuth, async (req: AuthRequest, res: Response) => {
  const { partner, tripId } = (req.body ?? {}) as { partner?: unknown; tripId?: unknown };
  if (typeof partner !== 'string' || !/^[a-z0-9_-]{1,30}$/.test(partner)) return res.status(400).json({ error: 'partner required' });
  try {
    await prisma.affiliateClick.create({
      data: { partner, tripId: typeof tripId === 'string' ? tripId.slice(0, 40) : null, userId: req.userId ?? null },
    });
  } catch {
    // A lost click count never breaks the visitor's way to the booking site.
  }
  res.status(204).end();
});

export default router;
