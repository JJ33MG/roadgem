import type { Request, Response, NextFunction } from 'express';

type Failure = { status: number; body: { error: string } };

/** What the browser is told: client errors Express marks as safe, otherwise nothing from inside. */
export function errorResponse(err: unknown): Failure {
  const e = (err ?? {}) as { status?: number; expose?: boolean; headers?: unknown; message?: string };
  if (e.expose && typeof e.status === 'number' && e.status < 500) {
    return { status: e.status, body: { error: e.message || 'Bad request' } };
  }
  // An error from an outside API (Anthropic, Google) carries the upstream status and headers.
  if (typeof e.status === 'number' && e.headers) {
    return { status: 502, body: { error: 'Trip planning is not available right now. Please try again later.' } };
  }
  return { status: 500, body: { error: 'Something went wrong on our end.' } };
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error('Error:', err);
  const { status, body } = errorResponse(err);
  res.status(status).json(body);
}
