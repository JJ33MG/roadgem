import { Router, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { optionalAuth, requireAuth } from '../middleware/auth';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();
const prisma = new PrismaClient();
const claude = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

// ─── POST /api/community/gems — submit a gem ──────────────────────────────────
router.post('/gems', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { name, category, location, description } = req.body;

    if (!name || !category || !location || !description) {
      return res.status(400).json({ error: 'name, category, location and description are required' });
    }
    if (description.length < 30) {
      return res.status(400).json({ error: 'Description must be at least 30 characters' });
    }

    // Claude verification — quality check before storing
    const verifyPrompt = `You are reviewing a user-submitted hidden gem for a European road trip app called Routify.

Gem details:
- Name: "${name}"
- Category: "${category}"
- Location: "${location}"
- Description: "${description}"

Check for:
1. Is this a real, specific place (not generic like "a nice park")?
2. Is the description personal and authentic (not marketing copy)?
3. Is it actually hidden/local (not a famous tourist trap)?
4. Is the location in Europe?
5. Any inappropriate content?

Respond ONLY with a JSON object:
{
  "approved": boolean,
  "score": number (0-100, quality score),
  "feedback": "string (short, encouraging feedback in the brand voice: conversational, not corporate. If rejected, explain specifically what to improve)"
}`;

    const aiRes = await claude.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
      max_tokens: 256,
      messages: [{ role: 'user', content: verifyPrompt }],
    });

    let verification: { approved: boolean; score: number; feedback: string };
    try {
      const text = (aiRes.content[0] as any).text.trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      verification = jsonMatch ? JSON.parse(jsonMatch[0]) : { approved: false, score: 0, feedback: 'Could not verify.' };
    } catch {
      verification = { approved: false, score: 0, feedback: 'Verification failed — try again.' };
    }

    // Store the gem with status based on Claude's verdict
    const gem = await prisma.communityGem.create({
      data: {
        userId: req.userId,
        name,
        category,
        location,
        description,
        status: verification.approved ? 'approved' : 'rejected',
        aiScore: verification.score,
        aiFeedback: verification.feedback,
      },
    });

    // If approved, also add to DestinationGem pool so it shows in trips
    if (verification.approved) {
      await prisma.destinationGem.create({
        data: {
          destination: location.split(',')[0].trim(),
          name,
          description,
          address: location,
          category,
          whyHidden: description,
        },
      });
    }

    res.json({
      gemId: gem.id,
      status: gem.status,
      score: verification.score,
      feedback: verification.feedback,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/community/gems — list approved gems (public) ───────────────────
router.get('/gems', optionalAuth, async (_req: any, res: Response, next: NextFunction) => {
  try {
    const gems = await prisma.communityGem.findMany({
      where: { status: 'approved' },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ gems });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/community/my-gems — user's own submissions ────────────────────
router.get('/my-gems', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const gems = await prisma.communityGem.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ gems });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/community/leaderboard ─────────────────────────────────────────
router.get('/leaderboard', async (_req: any, res: Response, next: NextFunction) => {
  try {
    const leaders = await prisma.communityGem.groupBy({
      by: ['userId'],
      where: { status: 'approved' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });

    const userIds = leaders.map(l => l.userId).filter(Boolean) as string[];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });

    const result = leaders.map(l => ({
      userId: l.userId,
      name: users.find(u => u.id === l.userId)?.name ?? 'Anonymous',
      gemCount: l._count.id,
    }));

    res.json({ leaderboard: result });
  } catch (err) {
    next(err);
  }
});

export default router;
