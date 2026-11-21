import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { LngLat } from '@/lib/arc';
import { MapBoundary } from '@/components/map/MapBoundary';

const GlobeMap = lazy(() => import('@/components/map/GlobeMap').then((m) => ({ default: m.GlobeMap })));

export const PLANNING_STEPS = ['Calculating the route', 'Choosing where you sleep', 'Checking the gems', 'Adding up the costs'];
const STEP_MS = 6000;

type Point = { lat: number; lng: number };

/** While the trip is made (about half a minute): the globe turns to the route and the steps say what is happening. */
export function PlanningProgress({ from, to }: { from?: Point | null; to?: Point | null }) {
  const [step, setStep] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // On a phone the form fills the screen: bring the globe into view.
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    box.current?.scrollIntoView?.({ behavior: still ? 'auto' : 'smooth', block: 'center' });
  }, []);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(PLANNING_STEPS.length - 1, s + 1)), STEP_MS);
    return () => clearInterval(t);
  }, []);
  const arc: [LngLat, LngLat] | undefined = from && to ? [[from.lng, from.lat], [to.lng, to.lat]] : undefined;
  return (
    <div ref={box} className="mt-16 grid gap-12">
      <MapBoundary>
    <Suspense fallback={<div className="rt-map" aria-hidden="true" />}>
        <GlobeMap arc={arc} label="Your route on the globe while the trip is planned" />
      </Suspense>
    </MapBoundary>
      <p role="status" className="text-[18px] text-ink" style={{ fontWeight: 500 }}>
        {PLANNING_STEPS[step]}
      </p>
      <ol className="m-0 flex flex-wrap gap-8 p-0" style={{ listStyle: 'none' }} aria-hidden="true">
        {PLANNING_STEPS.map((s, i) => (
          <li key={s} className={`h-[6px] w-[48px] rounded-pill ${i <= step ? 'bg-accent' : 'bg-rule'}`} />
        ))}
      </ol>
    </div>
  );
}
