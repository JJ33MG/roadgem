// The community game API under /api/community (the older gem-suggestion routes live in community.ts).
import { Router, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { optionalAuth, requireAuth, AuthRequest } from '../middleware/auth';
import { isAdmin } from '../community/rules';
import { board, createPost, feed, review, suggestGem, toggleLike } from '../community/service';
import { fallbackChallenge, writeChallenge } from '../community/aiCheck';
import { autoReview } from '../community/autoReview';
import { rateLimiter } from './track';
import { checkIn, passport } from '../community/road';
import { explorerGemsNear, monthlyChallenge } from '../community/explorer';
import { inviteCodeFor } from '../community/invites';
import { pickOfTheWeek } from '../community/launch';
import { decodePolyline } from '../utils/routeGems';
import { hasPlus } from '../utils/billing';

const router = Router();

const allowPost = rateLimiter(12, 60 * 60_000);
type Handler = (req: AuthRequest, res: Response) => Promise<unknown>;
const wrap = (h: Handler) => (req: AuthRequest, res: Response, next: NextFunction) => h(req, res).catch(next);

async function adminOnly(req: AuthRequest, res: Response): Promise<boolean> {
  const me = req.userId ? await prisma.user.findUnique({ where: { id: req.userId }, select: { email: true } }) : null;
  if (!isAdmin(me?.email)) {
    res.status(403).json({ error: 'Only moderators can do this.' });
    return false;
  }
  return true;
}

router.post('/posts', requireAuth, wrap(async (req, res) => {
  if (!allowPost(req.userId!)) return res.status(429).json({ error: 'That is a lot of photos. Try again in an hour.' });
  const { gem, at, photo, caption, challenge, monthly } = req.body ?? {};
  const me = await prisma.user.findUnique({ where: { id: req.userId } });
  const ref = gem?.gemId ? { gemId: String(gem.gemId) } : { placeId: gem?.placeId, name: gem?.name, lat: Number(gem?.lat), lng: Number(gem?.lng), address: gem?.address };
  const post = await createPost(prisma, { userId: req.userId!, gem: ref, at, photo, caption, challenge, monthly, plus: hasPlus(me) });
  void autoReview(prisma, post.id).catch(() => {});
  res.status(201).json(post);
}));

router.post('/suggest', requireAuth, wrap(async (req, res) => {
  if (!allowPost(req.userId!)) return res.status(429).json({ error: 'That is a lot of photos. Try again in an hour.' });
  const { name, description, category, at, photo } = req.body ?? {};
  const me = await prisma.user.findUnique({ where: { id: req.userId } });
  const { gem, post } = await suggestGem(prisma, { userId: req.userId!, name, description, category, at, photo, plus: hasPlus(me) });
  void autoReview(prisma, post.id).catch(() => {});
  res.status(201).json({ gemId: gem.id, postId: post.id, status: post.status });
}));

router.get('/feed', optionalAuth, wrap(async (req, res) => {
  const q = String(req.query.period ?? 'week');
  const period = q === 'today' || q === 'route' ? q : 'week';
  const page = Number(req.query.page ?? 0) || 0;
  if (period !== 'route') return res.json(await feed(prisma, req.userId ?? null, { period, page }));
  if (!req.userId) return res.status(401).json({ error: 'Sign in to see posts along your route.' });
  const trips = await prisma.trip.findMany({ where: { userId: req.userId }, orderBy: { createdAt: 'desc' }, take: 5, select: { planner: true } });
  const routeLines = trips
    .map((t) => { try { return (JSON.parse(t.planner || '{}') as { route?: string }).route; } catch { return undefined; } })
    .filter((r): r is string => typeof r === 'string' && r.length > 0)
    .map((r) => decodePolyline(r));
  if (!routeLines.length) return res.json([]);
  res.json(await feed(prisma, req.userId, { period, page, routeLines }));
}));

router.post('/posts/:id/like', requireAuth, wrap(async (req, res) => {
  res.json(await toggleLike(prisma, req.params.id, req.userId!));
}));

router.get('/posts/:id/photo', optionalAuth, wrap(async (req, res) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id }, select: { photo: true, photoType: true, status: true, userId: true } });
  if (!post) return res.status(404).json({ error: 'Not found' });
  if (post.status !== 'public' && post.userId !== req.userId && !(await adminOnly(req, res))) return;
  res.set('Content-Type', post.photoType);
  res.set('Cache-Control', post.status === 'public' ? 'public, max-age=86400' : 'private, no-store');
  res.set('X-Content-Type-Options', 'nosniff');
  res.send(Buffer.from(post.photo));
}));

// On the road: a stamp in the trip passport for being at one of the trip's gems.
const allowCheckIn = rateLimiter(30, 60 * 60_000);
router.post('/checkins', requireAuth, wrap(async (req, res) => {
  if (!allowCheckIn(req.userId!)) return res.status(429).json({ error: 'That is a lot of check-ins. Try again in an hour.' });
  const me = await prisma.user.findUnique({ where: { id: req.userId } });
  const { tripId, placeId, at } = (req.body ?? {}) as { tripId?: unknown; placeId?: unknown; at?: { lat: number; lng: number } };
  res.json(await checkIn(prisma, { userId: req.userId!, tripId: String(tripId ?? ''), placeId: String(placeId ?? ''), at: at as never, plus: hasPlus(me), editKey: typeof req.headers['x-edit-key'] === 'string' ? req.headers['x-edit-key'] : undefined }));
}));

router.get('/passport/:tripId', requireAuth, wrap(async (req, res) => {
  res.json(await passport(prisma, req.userId!, req.params.tripId));
}));

// Plus: Explorer gems (found by travellers, now official) near this trip's road; free members see how many.
router.get('/explorer/:tripId', optionalAuth, wrap(async (req, res) => {
  const trip = await prisma.trip.findUnique({ where: { id: req.params.tripId } });
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  const planner = JSON.parse(trip.planner || '{}') as { route?: string; pass?: boolean };
  const line = planner.route ? decodePolyline(planner.route) : [];
  const rows = await prisma.gem.findMany({ where: { status: 'official', finderId: { not: null } }, select: { id: true, name: true, lat: true, lng: true, status: true, finderId: true, description: true } });
  const gems = explorerGemsNear(rows, line);
  const me = req.userId ? await prisma.user.findUnique({ where: { id: req.userId } }) : null;
  if (!hasPlus(me) && planner.pass !== true) return res.json({ locked: true, count: gems.length });
  res.json({ gems: gems.map(({ id, name, lat, lng, description }) => ({ id, name, lat, lng, description })) });
}));

// Your invite link: a friend who signs up through it gets 2 weeks of Plus, you 1 week.
router.get('/invite', requireAuth, wrap(async (req, res) => {
  const code = await inviteCodeFor(prisma, req.userId!);
  const site = process.env.FRONTEND_URL || 'https://routify-preview-production.up.railway.app';
  res.json({ code, url: `${site.replace(/\/+$/, '')}/signup?invite=${code}` });
}));

// Gems of the week: well-rated places from the gem library, so the community shows gems from day one.
router.get('/gems-of-the-week', wrap(async (_req, res) => {
  const rows = await prisma.placeGem.findMany({ where: { rating: { gte: 4.6 }, reviews: { gte: 100 } }, take: 500, orderBy: { reviews: 'desc' } });
  res.set('Cache-Control', 'public, max-age=3600');
  res.json(pickOfTheWeek(rows).map((g) => ({
    placeId: g.placeId, name: g.name, lat: g.lat, lng: g.lng, rating: g.rating, reviews: g.reviews, address: g.address,
    photoUrl: g.photoRef ? `/api/photos/image/${encodeURIComponent(g.photoRef)}` : null,
  })));
}));

router.get('/monthly', wrap(async (_req, res) => {
  res.json({ challenge: monthlyChallenge(), plusOnly: true });
}));

router.get('/board', wrap(async (_req, res) => {
  res.json(await board(prisma));
}));

router.get('/me', requireAuth, wrap(async (req, res) => {
  const [posts, me] = await Promise.all([
    prisma.post.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, status: true, points: true, challenge: true, createdAt: true, gem: { select: { name: true } } },
    }),
    prisma.user.findUnique({ where: { id: req.userId! }, select: { email: true } }),
  ]);
  const rank = (await board(prisma, 1000)).find((r) => r.userId === req.userId);
  res.json({ posts: posts.map((p) => ({ ...p, photoUrl: `/api/community/posts/${p.id}/photo` })), points: rank?.points ?? 0, rank: rank?.rank ?? null, moderator: isAdmin(me?.email) });
}));

/** The photo challenge of a gem, written once and kept. Google gems are added on first use. */
router.post('/challenge', requireAuth, wrap(async (req, res) => {
  const { gemId, placeId, name, lat, lng, address } = req.body ?? {};
  let gem = gemId ? await prisma.gem.findUnique({ where: { id: String(gemId) } }) : null;
  if (!gem && typeof placeId === 'string' && typeof name === 'string' && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
    gem = await prisma.gem.upsert({
      where: { placeId: placeId.slice(0, 300) },
      create: { placeId: placeId.slice(0, 300), name: name.slice(0, 120), lat: Number(lat), lng: Number(lng), address: String(address ?? '').slice(0, 200) },
      update: {},
    });
  }
  if (!gem) return res.status(404).json({ error: 'Gem not found' });
  if (!gem.challenge && gem.status === 'official') {
    gem = await prisma.gem.update({ where: { id: gem.id }, data: { challenge: await writeChallenge(gem.name, gem.address) } });
  }
  res.json({ gemId: gem.id, name: gem.name, status: gem.status, lat: gem.lat, lng: gem.lng, challenge: gem.challenge || fallbackChallenge(gem.name) });
}));

router.get('/moderation', requireAuth, wrap(async (req, res) => {
  if (!(await adminOnly(req, res))) return;
  const posts = await prisma.post.findMany({
    where: { status: 'pending' },
    orderBy: { createdAt: 'asc' },
    take: 50,
    select: {
      id: true, caption: true, challenge: true, distanceM: true, aiNote: true, createdAt: true,
      user: { select: { name: true } },
      gem: { select: { name: true, status: true, description: true, lat: true, lng: true } },
    },
  });
  res.json(posts.map((p) => ({ ...p, photoUrl: `/api/community/posts/${p.id}/photo` })));
}));

router.post('/posts/:id/review', requireAuth, wrap(async (req, res) => {
  if (!(await adminOnly(req, res))) return;
  const decision = req.body?.decision;
  if (decision !== 'approve' && decision !== 'approve_photo' && decision !== 'reject') return res.status(400).json({ error: 'decision must be approve, approve_photo or reject' });
  res.json(await review(prisma, req.params.id, decision));
}));

export default router;
