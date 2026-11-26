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

const seen = new Map<string, number>();

export function watchGoogle(): void {
  axios.interceptors.response.use((res) => {
    const line = googleProblem(res.config?.url, res.data);
    const last = line ? seen.get(line) ?? 0 : 0;
    if (line && Date.now() - last > 10 * 60_000) {
      seen.set(line, Date.now());
      console.warn(line);
    }
    return res;
  });
}
