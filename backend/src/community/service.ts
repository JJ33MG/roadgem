// The community game on top of the database: posts, suggestions, moderation, likes, feed and board.
import type { PrismaClient } from '@prisma/client';
import { hasPlus } from '../utils/billing';
import { decodePhoto, metresBetween, onTheSpot, POINTS, pointsFor, readyToBeOfficial, type Point } from './rules';

type GemRef = { gemId: string } | { placeId: string; name: string; lat: number; lng: number; address?: string };

export class CommunityError extends Error {
  status = 400;
  expose = true;
}
/** Photos a day for members without Plus. */
export const FREE_POSTS_A_DAY = 1;

const fail = (msg: string, status = 400) => Object.assign(new CommunityError(msg), { status });

const clean = (s: unknown, max: number) => (typeof s === 'string' ? s.trim().slice(0, max) : '');
const point = (p: unknown): Point => {
  const q = p as Point | null;
  if (!q || !Number.isFinite(q.lat) || !Number.isFinite(q.lng) || Math.abs(q.lat) > 90 || Math.abs(q.lng) > 180) {
    throw fail('Your location is needed to check you are at the gem.');
  }
  return { lat: q.lat, lng: q.lng };
};

async function gemFor(db: PrismaClient, ref: GemRef) {
  if ('gemId' in ref) {
    const gem = await db.gem.findUnique({ where: { id: ref.gemId } });
    if (!gem || gem.status === 'rejected') throw fail('This gem is not available.', 404);
    return gem;
  }
  const at = point({ lat: ref.lat, lng: ref.lng });
  const placeId = clean(ref.placeId, 300);
  const name = clean(ref.name, 120);
  if (!placeId || !name) throw fail('This gem is missing its place.');
  return db.gem.upsert({
    where: { placeId },
    create: { placeId, name, lat: at.lat, lng: at.lng, address: clean(ref.address, 200), status: 'official' },
    update: {},
  });
}

export async function createPost(
  db: PrismaClient,
  input: { userId: string; gem: GemRef; at: unknown; photo: unknown; caption: unknown; challenge: unknown; monthly?: unknown; plus?: boolean },
) {
  const plus = input.plus === true;
  if (input.monthly === true && !plus) throw fail('The monthly challenge comes with Plus.', 403);
  if (!plus) {
    const today = await db.post.count({ where: { userId: input.userId, createdAt: { gte: new Date(Date.now() - 86_400_000) } } });
    if (today >= FREE_POSTS_A_DAY) throw fail('Free members post one photo a day. Plus posts without limit.', 429);
  }
  const gem = await gemFor(db, input.gem);
  const at = point(input.at);
  if (!onTheSpot(gem, at)) throw fail('Photos count only when you are at the gem (within 300 m). Try again when you are there.');
  const { bytes, type } = decodePhoto(input.photo);
  return db.post.create({
    data: {
      userId: input.userId,
      gemId: gem.id,
      caption: clean(input.caption, 280),
      photo: bytes,
      photoType: type,
      distanceM: Math.round(metresBetween(gem, at)),
      challenge: input.challenge === true,
      monthly: input.monthly === true,
    },
    select: { id: true, status: true, distanceM: true, gemId: true },
  });
}

export async function suggestGem(
  db: PrismaClient,
  input: { userId: string; name: unknown; description: unknown; category: unknown; at: unknown; photo: unknown; plus?: boolean },
) {
  if (input.plus !== true) throw fail('Suggesting new gems comes with Plus.', 403);
  const name = clean(input.name, 120);
  const description = clean(input.description, 400);
  if (name.length < 3) throw fail('Give the gem a name.');
  if (description.length < 15) throw fail('Say in a sentence what makes it special.');
  const at = point(input.at);
  decodePhoto(input.photo); // check before creating anything
  const gem = await db.gem.create({
    data: { name, description, category: clean(input.category, 30) || 'other', lat: at.lat, lng: at.lng, status: 'suggested', finderId: input.userId },
  });
  const post = await createPost(db, { userId: input.userId, gem: { gemId: gem.id }, at, photo: input.photo, caption: description, challenge: false, plus: true });
  return { gem, post };
}

/** A suggestion becomes official once enough different travellers posted and liked it. */
export async function checkOfficial(db: PrismaClient, gemId: string) {
  const gem = await db.gem.findUnique({ where: { id: gemId } });
  if (!gem || gem.status !== 'suggested') return gem;
  const posts = await db.post.findMany({ where: { gemId, status: 'public' }, select: { userId: true, _count: { select: { likes: true } } } });
  const visitors = new Set(posts.map((p) => p.userId)).size;
  const likes = posts.reduce((n, p) => n + p._count.likes, 0);
  if (!readyToBeOfficial({ visitors, likes })) return gem;
  return db.gem.update({ where: { id: gemId }, data: { status: 'official', officialAt: new Date() } });
}

export type Decision = 'approve' | 'approve_photo' | 'reject';

/** approve: points as posted; approve_photo: public, but the challenge did not count; reject: hidden. */
export async function review(db: PrismaClient, postId: string, decision: Decision, note?: string) {
  const post = await db.post.findUnique({ where: { id: postId }, include: { user: true } });
  if (!post) throw fail('Post not found.', 404);
  // Plus members (at the moment of approval) get double points.
  const times = hasPlus(post.user) ? 2 : 1;
  const updated = await db.post.update({
    where: { id: postId },
    data:
      decision !== 'reject'
        ? decision === 'approve'
          ? { status: 'public', points: pointsFor(post) * times, reviewedAt: new Date() }
          : { status: 'public', challenge: false, points: pointsFor({ challenge: false }) * times, reviewedAt: new Date() }
        : { status: 'rejected', points: 0, reviewedAt: new Date(), ...(note ? { aiNote: note.slice(0, 300) } : {}) },
    select: { id: true, status: true, points: true, gemId: true },
  });
  // The first approved photo of a suggestion keeps it alive; a rejected only photo rejects the suggestion.
  if (decision !== 'reject') await checkOfficial(db, updated.gemId);
  return updated;
}

export async function toggleLike(db: PrismaClient, postId: string, userId: string) {
  const post = await db.post.findUnique({ where: { id: postId }, select: { status: true, userId: true, gemId: true } });
  if (!post || post.status !== 'public') throw fail('This post is not public.', 404);
  if (post.userId === userId) throw fail('You cannot like your own post.');
  const key = { postId_userId: { postId, userId } };
  const had = await db.like.findUnique({ where: key });
  if (had) await db.like.delete({ where: key });
  else await db.like.create({ data: { postId, userId } });
  const likes = await db.like.count({ where: { postId } });
  if (!had) await checkOfficial(db, post.gemId);
  return { liked: !had, likes };
}

export async function feed(db: PrismaClient, viewerId: string | null, before?: Date, take = 20) {
  const posts = await db.post.findMany({
    where: { status: 'public', ...(before ? { createdAt: { lt: before } } : {}) },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(take, 1), 50),
    select: {
      id: true, caption: true, challenge: true, points: true, createdAt: true,
      user: { select: { name: true } },
      gem: { select: { id: true, name: true, status: true, address: true, lat: true, lng: true } },
      _count: { select: { likes: true } },
      likes: viewerId ? { where: { userId: viewerId }, select: { userId: true } } : false,
    },
  });
  return posts.map((p) => ({
    id: p.id,
    caption: p.caption,
    challenge: p.challenge,
    points: p.points,
    createdAt: p.createdAt,
    by: p.user.name,
    gem: p.gem,
    likes: p._count.likes,
    likedByMe: Array.isArray(p.likes) && p.likes.length > 0,
    photoUrl: `/api/community/posts/${p.id}/photo`,
  }));
}

/** Explorers by points: approved photos and challenges, check-ins on the road, plus 200 for every found gem that turned official. */
export async function board(db: PrismaClient, take = 20) {
  const [byPosts, found, byCheckIns] = await Promise.all([
    db.post.groupBy({ by: ['userId'], where: { status: 'public' }, _sum: { points: true }, _count: { _all: true } }),
    db.gem.groupBy({ by: ['finderId'], where: { status: 'official', finderId: { not: null } }, _count: { _all: true } }),
    db.checkIn.groupBy({ by: ['userId'], _sum: { points: true } }),
  ]);
  const totals = new Map<string, { points: number; photos: number; gems: number }>();
  for (const r of byPosts) totals.set(r.userId, { points: r._sum.points ?? 0, photos: r._count._all, gems: 0 });
  for (const r of found) {
    const t = totals.get(r.finderId!) ?? { points: 0, photos: 0, gems: 0 };
    t.points += POINTS.foundGem * r._count._all;
    t.gems = r._count._all;
    totals.set(r.finderId!, t);
  }
  // Check-ins on the road count too.
  for (const r of byCheckIns) {
    const t = totals.get(r.userId) ?? { points: 0, photos: 0, gems: 0 };
    t.points += r._sum.points ?? 0;
    totals.set(r.userId, t);
  }
  const top = [...totals.entries()].sort((a, b) => b[1].points - a[1].points).slice(0, take);
  const users = await db.user.findMany({ where: { id: { in: top.map(([id]) => id) } }, select: { id: true, name: true } });
  const nameOf = new Map(users.map((u) => [u.id, u.name]));
  return top.map(([id, t], i) => ({ rank: i + 1, userId: id, name: nameOf.get(id) ?? 'Traveller', ...t }));
}
