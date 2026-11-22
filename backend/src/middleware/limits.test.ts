import express from 'express';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { limit, generateLimit } from './limits';

let server: any;
afterEach(() => server?.close());

async function serve(mw: express.RequestHandler, userId?: string) {
  const app = express();
  app.use((req: any, _res, next) => { req.userId = userId; next(); });
  app.get('/x', mw, (_req, res) => res.json({ ok: true }));
  server = app.listen(0);
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}/x`;
}

describe('limits on costly routes', () => {
  it('refuses with 429 and a clear message after the allowed number of requests', async () => {
    const url = await serve(limit('t1', 2, 60_000));
    expect((await fetch(url)).status).toBe(200);
    expect((await fetch(url)).status).toBe(200);
    const r = await fetch(url);
    expect(r.status).toBe(429);
    expect(((await r.json()) as { error: string }).error).toMatch(/Too many requests/);
  });

  it('lets a visitor without an account plan 3 trips an hour', async () => {
    const url = await serve(generateLimit());
    for (let i = 0; i < 3; i++) expect((await fetch(url)).status).toBe(200);
    const r = await fetch(url);
    expect(r.status).toBe(429);
    expect(((await r.json()) as { error: string }).error).toMatch(/Make a free account/);
  });
});
