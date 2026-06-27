import { useEffect, useRef, useCallback } from 'react';

interface GlobeStop {
  lat: number;
  lng: number;
  label: string;
}

interface GlobeViewProps {
  stops?: GlobeStop[];
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
};

export function lookupCoords(name: string): { lat: number; lng: number } | null {
  const key = name.toLowerCase().split(',')[0].trim();
  for (const [k, v] of Object.entries(DEST_COORDS)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return null;
}

export function GlobeView({ stops = [], autoRotate = true }: GlobeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const angleRef = useRef(0);

  const initGlobe = useCallback(async () => {
    if (!containerRef.current) return;

    const GlobeGL = (await import('globe.gl')).default;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const globe = GlobeGL()(containerRef.current)
      .width(width)
      .height(height)
      .backgroundColor('rgba(0,0,0,0)')
      .showAtmosphere(true)
      .atmosphereColor('#f5a623')
      .atmosphereAltitude(0.12)
      .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-night.jpg')
      .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png');

    // Disable built-in controls so we control rotation ourselves
    globe.controls().enableZoom = false;
    globe.controls().enableRotate = false;
    globe.controls().enablePan = false;

    // Initial POV — center on Europe
    globe.pointOfView({ lat: 48, lng: 10, altitude: 1.8 }, 0);

    globeRef.current = globe;

    // Auto-rotate
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
      if (globeRef.current) {
        globeRef.current._destructor?.();
      }
    };
  }, [initGlobe]);

  // Update arcs + points when stops change
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || stops.length === 0) return;

    // Stop rotation
    cancelAnimationFrame(rafRef.current);

    // Build arcs between consecutive stops
    const arcs = stops.slice(0, -1).map((s, i) => ({
      startLat: s.lat,
      startLng: s.lng,
      endLat: stops[i + 1].lat,
      endLng: stops[i + 1].lng,
      color: '#f5a623',
    }));

    // Points for each stop
    const points = stops.map((s) => ({
      lat: s.lat,
      lng: s.lng,
      label: s.label,
      size: 0.4,
      color: '#f5a623',
    }));

    globe
      .arcsData(arcs)
      .arcColor('color')
      .arcDashLength(0.4)
      .arcDashGap(0.2)
      .arcDashAnimateTime(1500)
      .arcStroke(0.5)
      .pointsData(points)
      .pointColor('color')
      .pointAltitude('size')
      .pointRadius(0.3)
      .pointLabel('label');

    // Fly to center of stops
    const centerLat = stops.reduce((s, p) => s + p.lat, 0) / stops.length;
    const centerLng = stops.reduce((s, p) => s + p.lng, 0) / stops.length;
    globe.pointOfView({ lat: centerLat, lng: centerLng, altitude: 1.6 }, 1200);
  }, [stops]);

  return <div ref={containerRef} className="w-full h-full" />;
}
