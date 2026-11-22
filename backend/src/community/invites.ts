// Invite a friend: the friend gets 2 weeks of Plus, the inviter 1 week per friend (at most 8 a year).
import { randomInt } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { hasPlus } from '../utils/billing';

export const INVITEE_DAYS = 14;
export const INVITER_DAYS = 7;
export const INVITER_REWARDS_A_YEAR = 8;
const DAY = 86_400_000;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I: easy to read aloud

/** The user's invite code, made once. */
export async function inviteCodeFor(db: PrismaClient, userId: string): Promise<string> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { inviteCode: true } });
  if (user?.inviteCode) return user.inviteCode;
  for (;;) {
    const code = Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
    try {
      await db.user.update({ where: { id: userId }, data: { inviteCode: code } });
      return code;
    } catch {
      // Taken (unique): try another.
    }
  }
}

/** Plus for `days` more, counted from the end of Plus already running (else from now). */
async function addPlus(db: PrismaClient, userId: string, days: number, now: Date) {
  const u = await db.user.findUnique({ where: { id: userId } });
  if (!u) return;
  if (u.subscriptionTier === 'premium' && !u.subscriptionExpires) return; // Plus without an end date already
  if (u.stripeSubscriptionId) {
    // A paying member: the days wait after the paid period (a renewal resets the period end, not these).
    await db.user.update({ where: { id: userId }, data: { plusBonusDays: { increment: days } } });
    return;
  }
  const from = hasPlus(u, now) && u.subscriptionExpires && u.subscriptionExpires > now ? u.subscriptionExpires : now;
  await db.user.update({ where: { id: userId }, data: { subscriptionTier: 'premium', subscriptionExpires: new Date(from.getTime() + days * DAY) } });
}

export async function acceptInvite(db: PrismaClient, i: { code: string; inviteeId: string; now?: Date }) {
  const now = i.now ?? new Date();
  const none = { inviteeDays: 0, inviterDays: 0 };
  const inviter = await db.user.findUnique({ where: { inviteCode: i.code.trim().toUpperCase() } });
  if (!inviter || inviter.id === i.inviteeId) return none;
  try {
    await db.invite.create({ data: { inviterId: inviter.id, inviteeId: i.inviteeId } });
  } catch {
    return none; // this friend was invited before
  }
  await db.user.update({ where: { id: i.inviteeId }, data: { invitedById: inviter.id } });
  await addPlus(db, i.inviteeId, INVITEE_DAYS, now);
  const rewarded = await db.invite.count({ where: { inviterId: inviter.id, rewarded: true, createdAt: { gte: new Date(now.getTime() - 365 * DAY) } } });
  if (rewarded >= INVITER_REWARDS_A_YEAR) return { inviteeDays: INVITEE_DAYS, inviterDays: 0 };
  await db.invite.update({ where: { inviteeId: i.inviteeId }, data: { rewarded: true } });
  await addPlus(db, inviter.id, INVITER_DAYS, now);
  return { inviteeDays: INVITEE_DAYS, inviterDays: INVITER_DAYS };
}
