import i18n from '@/i18n';
import { useState, type ReactNode } from 'react';

type Props = {
  tripId: string;
  /** Stop indexes of the day being viewed: that part of the road is drawn on top. */
  from: number;
  to: number;
  /** Changes when the plan changes, so a browser never shows an old map. */
  version: string;
  /** Google Maps with the whole route, opened on a tap. */
  href: string;
  /** Shown when the image cannot load (no key, no signal). */
  fallback: ReactNode;
  className?: string;
};

/** A real Google map of the trip, drawn by the server (which holds the key). */
export function TripMapImage({ tripId, from, to, version, href, fallback, className = '' }: Props) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  const q = new URLSearchParams({ from: String(from), to: String(to), w: '640', h: '440', v: version });
  const src = `${import.meta.env.VITE_BACKEND_URL ?? ''}/api/trips/${encodeURIComponent(tripId)}/map?${q}`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`block overflow-hidden rounded-card border border-rule bg-paper-2 ${className}`}>
      <img
        src={src}
        alt={i18n.t('map.todayAlt')}
        width={640}
        height={440}
        className="block aspect-[640/440] h-auto w-full object-cover"
        onError={() => setFailed(true)}
      />
    </a>
  );
}
