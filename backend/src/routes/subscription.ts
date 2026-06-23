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

router.post('/upgrade', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
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
