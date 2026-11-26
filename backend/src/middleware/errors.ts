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

// Server errors of the last day, in memory, for the Brain's daily report (a restart resets them).
const DAY_MS = 86_400_000;
const errors: { at: number; message: string }[] = [];

export function recordServerError(err: unknown, at = Date.now()): void {
  const message = (err instanceof Error ? err.message : String(err)).replace(/\s+/g, ' ').trim().slice(0, 200);
  errors.push({ at, message });
  while (errors.length > 500) errors.shift();
}

export function recentErrors(now = Date.now()) {
  const recent = errors.filter((e) => now - e.at < DAY_MS);
  const last = recent[recent.length - 1];
  return { errors24h: recent.length, lastError: last ? { at: new Date(last.at).toISOString(), message: last.message } : null };
}

const redact = (text: string) => text.replace(/([?&](?:key|api_key|apikey|token)=)[^&\s'"]+/gi, '$1[hidden]');

/** One log line for an error: message, upstream status and URL for API errors, stack for our own; never a key. */
export function logLine(err: unknown): string {
  const e = (err ?? {}) as { message?: string; stack?: string; isAxiosError?: boolean; config?: { url?: string }; response?: { status?: number } };
  if (e.isAxiosError) return redact(`${e.message ?? 'Request failed'} (${e.response?.status ?? 'no response'}) ${e.config?.url ?? ''}`.trim());
  return redact(e.stack || e.message || String(err));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error('Error:', logLine(err));
  const { status, body } = errorResponse(err);
  if (status >= 500) recordServerError(err);
  res.status(status).json(body);
}
