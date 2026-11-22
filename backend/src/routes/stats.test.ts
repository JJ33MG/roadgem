import express from 'express';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../utils/prisma', () => ({ prisma: {} }));
import { buildStats, statsRouter } from './stats';

function fakePrisma() {
  const since = (where: any) => Boolean(where?.createdAt?.gte);
  return {
    user: { count: vi.fn(async ({ where }: any = {}) => (where?.subscriptionTier === 'premium' ? 2 : since(where) ? 5 : 40)) },
    trip: { count: vi.fn(async ({ where }: any = {}) => (since(where) ? 12 : 90)) },
    affiliateClick: {
      count: vi.fn(async () => 7),
      groupBy: vi.fn(async () => [{ partner: 'booking', _count: { _all: 5 } }, { partner: 'airbnb', _count: { _all: 2 } }]),
    },
    post: { count: vi.fn(async ({ where }: any = {}) => (where?.status === 'pending' ? 3 : 8)) },
    placeGem: { count: vi.fn(async () => 1234) },
    gemSearch: { count: vi.fn(async () => 210) },
  };
}

describe('buildStats', () => {
  it('counts totals and the last 7 days from now', async () => {
    const p = fakePrisma();
    const now = new Date('2026-11-19T12:00:00Z');
    process.env.BOOKING_AFFILIATE_ID = '123';
    const s = await buildStats(p as any, now);
    delete process.env.BOOKING_AFFILIATE_ID;
    expect(s).toEqual({
      generatedAt: now.toISOString(),
      users: { total: 40, last7d: 5 },
      trips: { total: 90, last7d: 12 },
      plus: 2,
      affiliateClicks: { last7d: 7, byPartner: { booking: 5, airbnb: 2 } },
      community: { pending: 3, approved: 8 },
      gems: { library: 1234, seedSearches: 210, seedBudget: 0 },
      setup: { mapsStatic: 'unknown', stripe: false, partners: ['booking'], adminEmails: false },
      health: { errors24h: 0, lastError: null },
    });
    expect(p.trip.count.mock.calls[1][0].where.createdAt.gte.toISOString()).toBe('2026-11-12T12:00:00.000Z');
  });
});

describe('GET /api/stats', () => {
  let url = '';
  let server: any;
  beforeEach(async () => {
    process.env.STATS_TOKEN = 's3cret-token-for-tests';
    const app = express();
    app.use('/api/stats', statsRouter(fakePrisma() as any));
    server = app.listen(0);
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/stats`;
  });
  afterEach(() => server.close());

  it('refuses without the token', async () => {
    expect((await fetch(url)).status).toBe(401);
  });

  it('refuses a wrong token', async () => {
    expect((await fetch(url, { headers: { 'x-stats-token': 'nope' } })).status).toBe(401);
  });

  it('refuses everything when no token is configured', async () => {
    delete process.env.STATS_TOKEN;
    expect((await fetch(url, { headers: { 'x-stats-token': '' } })).status).toBe(401);
  });

  it('answers with the stats for the right token', async () => {
    const res = await fetch(url, { headers: { 'x-stats-token': 's3cret-token-for-tests' } });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ users: { total: 40 }, plus: 2 });
  });
});
