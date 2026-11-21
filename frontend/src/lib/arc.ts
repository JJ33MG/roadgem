export type LngLat = [number, number];

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** Points along the great circle from a to b (spherical interpolation): the arc the globe draws while a trip is made. */
export function greatCircle(a: LngLat, b: LngLat, n = 64): LngLat[] {
  const [l1, p1, l2, p2] = [rad(a[0]), rad(a[1]), rad(b[0]), rad(b[1])];
  const d = 2 * Math.asin(Math.sqrt(Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin((l2 - l1) / 2) ** 2));
  if (d === 0) return Array.from({ length: n }, () => [a[0], a[1]] as LngLat);
  return Array.from({ length: n }, (_, i) => {
    const f = i / (n - 1);
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2);
    const y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2);
    const z = A * Math.sin(p1) + B * Math.sin(p2);
    return [deg(Math.atan2(y, x)), deg(Math.atan2(z, Math.sqrt(x * x + y * y)))] as LngLat;
  });
}
