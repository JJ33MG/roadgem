// Google's web services answer HTTP 200 with status REQUEST_DENIED when a key lacks a permission, and the code
// then sees "no results". This logs Google's own reason once per kind, so a key problem shows in the logs.
import axios from 'axios';

const QUIET = new Set(['OK', 'ZERO_RESULTS', 'NOT_FOUND']);

export function googleProblem(url: string | undefined, data: unknown): string | null {
  const m = url?.match(/maps\.googleapis\.com\/maps\/api\/([a-z_]+(?:\/[a-z_]+)?)/);
  const d = (data ?? {}) as { status?: string; error_message?: string };
  if (!m || !d.status || QUIET.has(d.status)) return null;
  return `[google] ${m[1]} ${d.status}${d.error_message ? `: ${d.error_message}` : ''}`;
}

/** A refused call to the new Places or Routes service, as one log line; null for other hosts. */
export function googleFailure(url: string | undefined, status: number | undefined, data: unknown): string | null {
  const m = url?.match(/(?:places|routes)\.googleapis\.com\/(?:v1\/|directions\/v2:)?([^?]+)/);
  if (!m) return null;
  const e = ((data ?? {}) as { error?: { status?: string; message?: string } }).error ?? {};
  const what = m[1].startsWith('places/') ? 'place details/photo' : m[1];
  return `[google] ${what} ${status ?? 'no answer'}${e.status ? ` ${e.status}` : ''}${e.message ? `: ${e.message}` : ''}`;
}

const seen = new Map<string, number>();
const logOnce = (line: string | null) => {
  if (!line) return;
  if (Date.now() - (seen.get(line) ?? 0) < 10 * 60_000) return;
  seen.set(line, Date.now());
  console.warn(line);
};

export function watchGoogle(): void {
  axios.interceptors.response.use(
    (res) => {
      logOnce(googleProblem(res.config?.url, res.data));
      return res;
    },
    (err) => {
      logOnce(googleFailure(err?.config?.url, err?.response?.status, err?.response?.data));
      return Promise.reject(err);
    },
  );
}
