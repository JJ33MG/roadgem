// No manual review: the AI check publishes or rejects each community photo. A failed check leaves the post
// pending and the sweep tries again, so nothing goes public unchecked and nothing waits on a person.
import type { PrismaClient } from '@prisma/client';
import { checkPhoto, fallbackChallenge, type Verdict } from './aiCheck';
import { review, type Decision } from './service';
import { alertError } from '../utils/brain';

export function decide(v: Verdict | null, challenge: boolean): Decision | 'retry' {
  if (!v || v.failed) return 'retry';
  if (v.reject) return 'reject';
  if (!challenge) return 'approve';
  return v.challengeMet ? 'approve' : 'approve_photo';
}

type Check = typeof checkPhoto;

export async function autoReview(db: PrismaClient, postId: string, check: Check = checkPhoto): Promise<Decision | 'retry' | 'gone'> {
  const post = await db.post.findUnique({ where: { id: postId }, include: { gem: true } });
  if (!post || post.status !== 'pending') return 'gone';
  const v = await check(Buffer.from(post.photo), post.photoType, post.gem.name, post.gem.challenge || fallbackChallenge(post.gem.name), post.caption).catch(() => null);
  const d = decide(v, post.challenge);
  if (d === 'retry') {
    // Count the failed try; a photo that can never be checked is refused instead of waiting forever.
    const tried = await db.post.update({ where: { id: postId }, data: { checkAttempts: { increment: 1 } }, select: { checkAttempts: true } });
    if (tried.checkAttempts >= MAX_CHECKS) {
      await review(db, postId, 'reject', 'Could not be checked by the AI.');
      return 'reject';
    }
    return d;
  }
  await review(db, postId, d, d === 'reject' ? `AI: ${v?.note ?? ''}` : undefined);
  if (d !== 'reject' && v?.note) await db.post.update({ where: { id: postId }, data: { aiNote: v.note } });
  return d;
}

const SWEEP_MS = 10 * 60_000;
/** Tries before a photo that cannot be checked is refused (about 2 hours of sweeps). */
export const MAX_CHECKS = 12;
const STUCK_MS = 24 * 3_600_000;

/** Every 10 minutes: re-check up to 20 posts that are still pending; tell the Brain when one is stuck for a day. */
export async function sweepOnce(db: PrismaClient, now = new Date(), check: Check = checkPhoto) {
  const posts = await db.post.findMany({
    // 15 minutes: the first check (right after posting) has finished by then.
    where: { status: 'pending', createdAt: { lt: new Date(now.getTime() - 15 * 60_000) } },
    // Fewest tries first: photos that keep failing cannot block newer ones.
    orderBy: [{ checkAttempts: 'asc' }, { createdAt: 'asc' }],
    take: 20,
    select: { id: true, createdAt: true },
  });
  let stuck = 0;
  for (const p of posts) {
    const d = await autoReview(db, p.id, check).catch(() => 'retry' as const);
    if (d === 'retry' && now.getTime() - p.createdAt.getTime() > STUCK_MS) stuck++;
  }
  if (stuck) alertError(`Community photo check: ${stuck} photo(s) waited over a day, the AI check keeps failing.`);
  return { checked: posts.length, stuck };
}

export function startReviewSweep(db: PrismaClient): NodeJS.Timeout {
  const t = setInterval(() => void sweepOnce(db).catch(() => undefined), SWEEP_MS);
  t.unref?.();
  return t;
}
