import { useEffect, useRef, useCallback } from 'react';

interface GlobeStop {
  lat: number;
  lng: number;
  label: string;
}

interface GlobeGem {
  lat: number;
  lng: number;
  label: string;
  category?: string;
}

interface GlobeViewProps {
  stops?: GlobeStop[];
  gems?: GlobeGem[];
  autoRotate?: boolean;
}

// Approximate coords for popular European destinations
const DEST_COORDS: Record<string, { lat: number; lng: number }> = {
  'amsterdam': { lat: 52.37, lng: 4.89 },
  'rome': { lat: 41.90, lng: 12.50 },
  'lisbon': { lat: 38.72, lng: -9.14 },
  'barcelona': { lat: 41.39, lng: 2.15 },
  'berlin': { lat: 52.52, lng: 13.40 },
  'prague': { lat: 50.08, lng: 14.44 },
  'paris': { lat: 48.86, lng: 2.35 },
  'vienna': { lat: 48.21, lng: 16.37 },
  'porto': { lat: 41.16, lng: -8.63 },
  'madrid': { lat: 40.42, lng: -3.70 },
  'florence': { lat: 43.77, lng: 11.26 },
  'athens': { lat: 37.98, lng: 23.73 },
  'dubrovnik': { lat: 42.65, lng: 18.09 },
  'budapest': { lat: 47.50, lng: 19.04 },
  'bruges': { lat: 51.21, lng: 3.22 },
  'santorini': { lat: 36.40, lng: 25.46 },
  'amalfi': { lat: 40.63, lng: 14.60 },
  'sintra': { lat: 38.80, lng: -9.39 },
  'milan': { lat: 45.46, lng: 9.19 },
  'venice': { lat: 45.44, lng: 12.33 },
  'seville': { lat: 37.39, lng: -5.99 },
  'copenhagen': { lat: 55.68, lng: 12.57 },
  'stockholm': { lat: 59.33, lng: 18.07 },
  'oslo': { lat: 59.91, lng: 10.75 },
  'dublin': { lat: 53.33, lng: -6.25 },
  'edinburgh': { lat: 55.95, lng: -3.19 },
  'warsaw': { lat: 52.23, lng: 21.01 },
  'krakow': { lat: 50.06, lng: 19.94 },
  'zagreb': { lat: 45.81, lng: 15.98 },
  'ljubljana': { lat: 46.05, lng: 14.51 },
  'belgrade': { lat: 44.80, lng: 20.46 },
  'sofia': { lat: 42.70, lng: 23.32 },
  'bucharest': { lat: 44.43, lng: 26.10 },
  'tallinn': { lat: 59.44, lng: 24.75 },
  'riga': { lat: 56.95, lng: 24.11 },
  'vilnius': { lat: 54.69, lng: 25.28 },
  'brussels': { lat: 50.85, lng: 4.35 },
  'zurich': { lat: 47.38, lng: 8.54 },
  'geneva': { lat: 46.20, lng: 6.14 },
  'bern': { lat: 46.95, lng: 7.45 },
  'munich': { lat: 48.14, lng: 11.58 },
  'hamburg': { lat: 53.55, lng: 10.00 },
  'cologne': { lat: 50.94, lng: 6.96 },
  'frankfurt': { lat: 50.11, lng: 8.68 },
  'naples': { lat: 40.85, lng: 14.27 },
  'palermo': { lat: 38.12, lng: 13.36 },
  'bologna': { lat: 44.50, lng: 11.34 },
  'valletta': { lat: 35.90, lng: 14.51 },
};

export function lookupCoords(name: string): { lat: number; lng: number } | null {
  const key = name.toLowerCase().split(',')[0].trim();
  for (const [k, v] of Object.entries(DEST_COORDS)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return null;
}

// Build Google Maps directions deeplink from stops
export function buildGoogleMapsRouteUrl(stops: GlobeStop[]): string {
  if (stops.length === 0) return 'https://www.google.com/maps';
  if (stops.length === 1) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stops[0].label)}`;
  const origin = encodeURIComponent(stops[0].label);
  const destination = encodeURIComponent(stops[stops.length - 1].label);
  const waypoints = stops.slice(1, -1).map(s => encodeURIComponent(s.label)).join('|');
  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
  if (waypoints) url += `&waypoints=${waypoints}`;
  return url;
}

export function GlobeView({ stops = [], gems = [], autoRotate = true }: GlobeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const angleRef = useRef(0);
  const pulseRef = useRef<number>(0);

  const initGlobe = useCallback(async () => {
    if (!containerRef.current) return;

    const GlobeGLModule = await import('globe.gl');
    const GlobeGL = GlobeGLModule.default as any;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const globe = new GlobeGL(containerRef.current)
      .width(width)
      .height(height)
      .backgroundColor('rgba(0,0,0,0)')
      .showAtmosphere(true)
      .atmosphereColor('#f5a623')
      .atmosphereAltitude(0.12)
      .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-night.jpg')
      .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png');

    globe.controls().enableZoom = false;
    globe.controls().enableRotate = false;
    globe.controls().enablePan = false;

    globe.pointOfView({ lat: 48, lng: 10, altitude: 1.8 }, 0);

    globeRef.current = globe;

    if (autoRotate) {
      const animate = () => {
        angleRef.current += 0.0015;
        const lng = 10 + angleRef.current * (180 / Math.PI);
        globe.pointOfView({ lat: 48, lng, altitude: 1.8 }, 0);
        rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
    }

    return globe;
  }, [autoRotate]);

  useEffect(() => {
    initGlobe();
    return () => {
      cancelAnimationFrame(rafRef.current);
      cancelAnimationFrame(pulseRef.current);
      if (globeRef.current) globeRef.current._destructor?.();
    };
  }, [initGlobe]);

  // Update arcs + stop points + gem points when data changes
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    if (stops.length === 0 && gems.length === 0) return;

    cancelAnimationFrame(rafRef.current);

    // Arcs between consecutive stops
    const arcs = stops.slice(0, -1).map((s, i) => ({
      startLat: s.lat,
      startLng: s.lng,
      endLat: stops[i + 1].lat,
      endLng: stops[i + 1].lng,
      color: '#f5a623',
    }));

    // Stop points (gold, larger)
    const stopPoints = stops.map((s, i) => ({
      lat: s.lat,
      lng: s.lng,
      label: s.label,
      size: i === 0 || i === stops.length - 1 ? 0.55 : 0.4,
      color: '#f5a623',
      type: 'stop',
    }));

    // Gem points (white/cream, smaller — visible but subtle)
    const gemPoints = gems.map(g => ({
      lat: g.lat,
      lng: g.lng,
      label: g.label,
      size: 0.25,
      color: '#ffffff',
      type: 'gem',
    }));

    const allPoints = [...stopPoints, ...gemPoints];

    globe
      .arcsData(arcs)
      .arcColor('color')
      .arcDashLength(0.6)
      .arcDashGap(0.1)
      .arcDashAnimateTime(1000)
      .arcStroke(1.4)
      .pointsData(allPoints)
      .pointColor('color')
      .pointAltitude('size')
      .pointRadius((d: any) => d.type === 'stop' ? 0.55 : 0.28)
      .pointLabel('label');

    // Pulse gem points by oscillating altitude
    let t = 0;
    const pulse = () => {
      t += 0.04;
      const pulsed = allPoints.map(p =>
        p.type === 'gem'
          ? { ...p, size: 0.22 + Math.sin(t + p.lat) * 0.1 }
          : p
      );
      globe.pointsData(pulsed);
      pulseRef.current = requestAnimationFrame(pulse);
    };
    pulseRef.current = requestAnimationFrame(pulse);

    // Zoom in tightly to the route
    if (stops.length > 0) {
      const lats = stops.map(p => p.lat);
      const lngs = stops.map(p => p.lng);
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
      const spread = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lngs) - Math.min(...lngs));
      const altitude = Math.max(0.6, Math.min(1.4, spread / 30));
      globe.pointOfView({ lat: centerLat, lng: centerLng, altitude }, 1200);
    }
  }, [stops, gems]);

  return <div ref={containerRef} className="w-full h-full" />;
}
