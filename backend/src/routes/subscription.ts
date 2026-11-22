import { Router, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/status', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      subscriptionTier: user.subscriptionTier,
      subscriptionExpires: user.subscriptionExpires,
    });
  } catch (err) {
    next(err);
  }
});

/** Plus without paying: only for testing, with ALLOW_DIRECT_UPGRADE=true (never on the live site). */
export const directUpgradeAllowed = (env: Record<string, string | undefined> = process.env) => env.ALLOW_DIRECT_UPGRADE === 'true';

router.post('/upgrade', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!directUpgradeAllowed()) return res.status(403).json({ error: 'Plus is started through checkout.' });
  try {
    const expires = new Date();
    expires.setMonth(expires.getMonth() + 1);

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { subscriptionTier: 'premium', subscriptionExpires: expires },
    });

    res.json({
      subscriptionTier: user.subscriptionTier,
      subscriptionExpires: user.subscriptionExpires,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/downgrade', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { subscriptionTier: 'free', subscriptionExpires: null },
    });

    res.json({
      subscriptionTier: user.subscriptionTier,
      subscriptionExpires: user.subscriptionExpires,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
