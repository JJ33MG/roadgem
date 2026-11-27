// POST /api/feedback: the feedback button on every page (27 Nov, ready for testers).
import { Router, Response } from 'express';
import { prisma } from '../utils/prisma';
import { optionalAuth, AuthRequest } from '../middleware/auth';
import { rateLimiter } from './track';
import { parseFeedback, tellBrain } from '../utils/brain';

const router = Router();
const allow = rateLimiter(10, 60 * 60_000); // ten a hour per visitor

router.post('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  const fb = parseFeedback((req.body ?? {}) as Record<string, unknown>);
  if (!fb) return res.status(400).json({ error: 'Write a short message first.' });
  if (!allow(req.ip ?? 'unknown')) return res.status(429).json({ error: 'Thanks! That is a lot of feedback for one hour: try again later.' });
  const user = req.userId ? await prisma.user.findUnique({ where: { id: req.userId }, select: { email: true } }).catch(() => null) : null;
  const email = fb.email || user?.email || '';
  await prisma.feedback.create({ data: { ...fb, email, userId: req.userId ?? null } }).catch(() => undefined);
  void tellBrain({ kind: 'feedback', type: fb.type, message: fb.message, page: fb.page, email });
  res.status(201).json({ ok: true });
});

export default router;
