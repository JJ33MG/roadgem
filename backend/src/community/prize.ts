// The explorer of the month wins a year of Plus. The Brain asks for the winner on the 1st, Jarne approves on
// Telegram, then the Brain asks RoamGem to grant it. Granted once per month, whatever is retried.
import type { PrismaClient } from '@prisma/client';
import { board } from './service';

export function monthRange(month: string): { from: Date; to: Date } {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) throw new Error('month must look like 2026-11');
  const from = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1));
  const to = new Date(Date.UTC(Number(m[1]), Number(m[2]), 1) - 1);
  return { from, to };
}

export async function monthWinner(db: PrismaClient, month: string) {
  const [top] = await board(db, { ...monthRange(month), take: 1 });
  return top && top.points > 0 ? { userId: top.userId, name: top.name, points: top.points } : null;
}

const YEAR_MS = 365 * 86_400_000;

export async function grantYear(db: PrismaClient, userId: string, month: string, now = new Date()): Promise<{ granted: boolean }> {
  monthRange(month);
  return db.$transaction(async (tx) => {
    if (await tx.prizeGrant.findUnique({ where: { month } })) return { granted: false };
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw Object.assign(new Error('User not found.'), { status: 404 });
    await tx.prizeGrant.create({ data: { month, userId } });
    if (user.stripeSubscriptionId) {
      // A paying member keeps their subscription; the prize year is added as bonus days.
      await tx.user.update({ where: { id: userId }, data: { plusBonusDays: { increment: 365 } } });
    } else {
      const from = Math.max(now.getTime(), user.subscriptionTier === 'premium' && user.subscriptionExpires ? user.subscriptionExpires.getTime() : 0);
      await tx.user.update({ where: { id: userId }, data: { subscriptionTier: 'premium', subscriptionExpires: new Date(from + YEAR_MS) } });
    }
    return { granted: true };
  });
}
