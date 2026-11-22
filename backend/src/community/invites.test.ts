// Runs against Postgres when TEST_DATABASE_URL is set.
import { PrismaClient } from '@prisma/client';
import { afterAll, describe, expect, it } from 'vitest';
import { acceptInvite, inviteCodeFor } from './invites';

const url = process.env.TEST_DATABASE_URL;
const DAY = 86_400_000;

describe.skipIf(!url)('invites', () => {
  const db = url ? new PrismaClient({ datasources: { db: { url } } }) : (undefined as unknown as PrismaClient);
  let n = 0;
  const user = (data: Record<string, unknown> = {}) => db.user.create({ data: { email: `inv${++n}-${Date.now()}@test.local`, password: 'x', name: `u${n}`, ...data } });
  afterAll(() => db?.$disconnect());
  const now = new Date('2027-03-01T12:00:00Z');

  it('gives the friend 2 weeks of Plus and the inviter 1 week, on top of Plus they have', async () => {
    const inviter = await user({ subscriptionTier: 'premium', subscriptionExpires: new Date(now.getTime() + 10 * DAY) });
    const code = await inviteCodeFor(db, inviter.id);
    expect(code).toMatch(/^[A-Z2-9]{8}$/);
    expect(await inviteCodeFor(db, inviter.id)).toBe(code);
    const friend = await user();
    expect(await acceptInvite(db, { code, inviteeId: friend.id, now })).toEqual({ inviteeDays: 14, inviterDays: 7 });
    const f = await db.user.findUnique({ where: { id: friend.id } });
    expect(f).toMatchObject({ subscriptionTier: 'premium', invitedById: inviter.id });
    expect(f!.subscriptionExpires!.getTime()).toBe(now.getTime() + 14 * DAY);
    const i = await db.user.findUnique({ where: { id: inviter.id } });
    expect(i!.subscriptionExpires!.getTime()).toBe(now.getTime() + 17 * DAY);
  });

  it('gives nothing for your own code, an unknown code or a second acceptance', async () => {
    const a = await user();
    const code = await inviteCodeFor(db, a.id);
    expect(await acceptInvite(db, { code, inviteeId: a.id, now })).toEqual({ inviteeDays: 0, inviterDays: 0 });
    expect(await acceptInvite(db, { code: 'NOPE2345', inviteeId: a.id, now })).toEqual({ inviteeDays: 0, inviterDays: 0 });
    const b = await user();
    await acceptInvite(db, { code, inviteeId: b.id, now });
    expect(await acceptInvite(db, { code, inviteeId: b.id, now })).toEqual({ inviteeDays: 0, inviterDays: 0 });
  });

  it('rewards the inviter for at most 8 friends a year', async () => {
    const inviter = await user();
    const code = await inviteCodeFor(db, inviter.id);
    const results = [];
    for (let k = 0; k < 9; k++) results.push(await acceptInvite(db, { code, inviteeId: (await user()).id, now }));
    expect(results.filter((r) => r.inviterDays === 7)).toHaveLength(8);
    expect(results[8]).toEqual({ inviteeDays: 14, inviterDays: 0 });
  });
});
