import { isLang } from '../i18n/lang';
import { hasPlus } from '../utils/billing';
import { acceptInvite } from '../community/invites';
import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../utils/prisma';
import { signToken } from '../utils/jwt';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name, invite } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'email, password, and name are required' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    let user = await prisma.user.create({
      data: { email, password: hashed, name },
    });
    // Signed up through a friend's link: both get Plus time (never blocks the sign-up).
    if (typeof invite === 'string' && invite.trim()) {
      const r = await acceptInvite(prisma, { code: invite, inviteeId: user.id }).catch(() => null);
      if (r?.inviteeDays) user = (await prisma.user.findUnique({ where: { id: user.id } })) ?? user;
    }

    const token = signToken({ userId: user.id });
    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        subscriptionTier: hasPlus(user) ? 'premium' : 'free',
        subscriptionExpires: user.subscriptionExpires,
        language: user.language,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken({ userId: user.id });
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        subscriptionTier: hasPlus(user) ? 'premium' : 'free',
        subscriptionExpires: user.subscriptionExpires,
        language: user.language,
      },
    });
  } catch (err) {
    next(err);
  }
});

// The language the traveller picked (used for their trips and the site on other devices).
router.patch('/me/language', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const language = req.body?.language;
    if (!isLang(language)) return res.status(400).json({ error: 'Unknown language.' });
    await prisma.user.update({ where: { id: req.userId }, data: { language } });
    res.json({ language });
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      subscriptionTier: hasPlus(user) ? 'premium' : 'free',
      subscriptionExpires: user.subscriptionExpires,
        language: user.language,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
