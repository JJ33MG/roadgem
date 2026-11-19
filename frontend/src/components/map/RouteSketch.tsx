type Point = { lat: number; lng: number; label: string };

type Props = { stops: Point[]; gems?: Point[]; activeLeg?: number };

const W = 420;
const H = 520;
const PAD = 48;

/** Projects coordinates into the sketch box, keeping the route's own proportions. */
export function project(points: { lat: number; lng: number }[]) {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const spanX = Math.max(maxLng - minLng, 0.01);
  const spanY = Math.max(maxLat - minLat, 0.01);
  const scale = Math.min((W - 2 * PAD) / spanX, (H - 2 * PAD) / spanY);
  const offX = (W - spanX * scale) / 2;
  const offY = (H - spanY * scale) / 2;
  return (p: { lat: number; lng: number }) => ({ x: offX + (p.lng - minLng) * scale, y: H - (offY + (p.lat - minLat) * scale) });
}

/** The route drawn from the real coordinates: nights as ink dots, gems as accent rings, the day's leg lit. */
export function RouteSketch({ stops, gems = [], activeLeg }: Props) {
  if (stops.length < 2) return null;
  const at = project([...stops, ...gems]);
  const pts = stops.map(at);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const leg = activeLeg !== undefined && pts[activeLeg] && pts[activeLeg + 1] ? [pts[activeLeg], pts[activeLeg + 1]] : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={`Route from ${stops[0].label} to ${stops[stops.length - 1].label}`}>
      <rect width={W} height={H} fill="var(--color-paper-2)" />
      <path d={path} stroke="var(--color-paper)" strokeWidth="14" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={path} stroke="var(--color-rule-2)" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {leg && <path d={`M${leg[0].x} ${leg[0].y} L${leg[1].x} ${leg[1].y}`} stroke="var(--color-accent)" strokeWidth="5" strokeLinecap="round" />}
      {gems.map((g) => {
        const p = at(g);
        return <circle key={`g-${g.label}`} cx={p.x} cy={p.y} r="6" fill="var(--color-paper)" stroke="var(--color-accent)" strokeWidth="3" />;
      })}
      {pts.map((p, i) => (
        <g key={`s-${stops[i].label}-${i}`}>
          <circle cx={p.x} cy={p.y} r={i === 0 || i === pts.length - 1 ? 8 : 6} fill="var(--color-ink)" />
          <text x={p.x + 12} y={p.y + 5} fontFamily="var(--font-body)" fontSize="14" fontWeight="500" fill="var(--color-ink)">
            {stops[i].label.split(',')[0]}
          </text>
        </g>
      ))}
    </svg>
  );
}
