/** A CSS colour as hex for MapLibre (which cannot read oklch). Accepts oklch(L% C H) and #rrggbb. */
export function oklchToHex(css: string): string | null {
  const v = css.trim();
  if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
  const m = /^oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)$/i.exec(v);
  if (!m) return null;
  const L = Number(m[1]) / 100;
  const C = Number(m[2]);
  const h = (Number(m[3]) * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
  const gamma = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
  return `#${lin.map((x) => Math.round(Math.min(1, Math.max(0, gamma(x))) * 255).toString(16).padStart(2, '0')).join('')}`;
}

/** A theme token's colour as hex, read from the page (falls back when the token is missing). */
export function tokenHex(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  return oklchToHex(getComputedStyle(document.documentElement).getPropertyValue(name)) ?? fallback;
}
