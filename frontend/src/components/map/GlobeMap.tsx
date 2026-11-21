import { useEffect, useRef, useState } from 'react';
import maplibregl, { type GeoJSONSource, type LngLatLike } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { greatCircle, type LngLat } from '@/lib/arc';
import { tokenHex } from '@/lib/color';
import { mapData } from '@/lib/polyline';

type Stop = { location: string; latitude: number; longitude: number };
type Gem = { name: string; latitude: number; longitude: number; rating?: number; reviews?: number; mapsUrl?: string };

type Props = {
  stops?: Stop[];
  gems?: Gem[];
  /** The road as Google's encoded polyline; straight lines between stops when missing. */
  route?: string;
  /** Names of the gems on the day being viewed: drawn larger. */
  dayGems?: string[];
  /** While a trip is being made: an arc from start to end, the globe turning to it. */
  arc?: [LngLat, LngLat];
  className?: string;
  label?: string;
};

const STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const EMPTY = { type: 'FeatureCollection' as const, features: [] };

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function webglWorks(): boolean {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** A popup built from text nodes only (gem names come from outside). */
function gemPopup(g: Gem): HTMLElement {
  const box = document.createElement('div');
  const name = document.createElement('strong');
  name.textContent = g.name;
  box.append(name);
  if (g.rating) {
    const r = document.createElement('div');
    r.textContent = `Rated ${g.rating.toFixed(1)}${g.reviews ? ` by ${g.reviews.toLocaleString('en')} Google reviewers` : ''}`;
    box.append(r);
  }
  const a = document.createElement('a');
  a.href = g.mapsUrl ?? `https://www.google.com/maps/search/?api=1&query=${g.latitude},${g.longitude}`;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.textContent = 'Open in Google Maps';
  box.append(a);
  return box;
}

/** The trip on a 3D globe: the road, the nights (ink) and the gems (accent); or, while planning, an arc from start to end. */
export function GlobeMap({ stops = [], gems = [], route, dayGems = [], arc, className = '', label = 'Map of the route, the nights and the gems' }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!el.current || map.current) return;
    if (!webglWorks()) {
      setFailed(true);
      return;
    }
    const ink = tokenHex('--color-ink', '#191714');
    const paper = tokenHex('--color-paper', '#fcf9f3');
    const accent = tokenHex('--color-accent', '#035f5c');
    let m: maplibregl.Map;
    try {
      m = new maplibregl.Map({ container: el.current, style: STYLE, center: [10, 48], zoom: 1.6, attributionControl: { compact: true } });
    } catch {
      setFailed(true);
      return;
    }
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    m.scrollZoom.disable();
    m.on('style.load', () => {
      m.setProjection({ type: 'globe' });
      m.addSource('road', { type: 'geojson', data: EMPTY });
      m.addSource('nights', { type: 'geojson', data: EMPTY });
      m.addSource('gems', { type: 'geojson', data: EMPTY });
      m.addLayer({ id: 'road-casing', type: 'line', source: 'road', paint: { 'line-color': paper, 'line-width': 8 }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
      m.addLayer({ id: 'road', type: 'line', source: 'road', paint: { 'line-color': accent, 'line-width': 4 }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
      m.addLayer({ id: 'gems', type: 'circle', source: 'gems', paint: {
        'circle-radius': ['case', ['get', 'today'], 9, 6],
        'circle-color': ['case', ['get', 'today'], accent, paper],
        'circle-stroke-color': ['case', ['get', 'today'], paper, accent],
        'circle-stroke-width': 3,
      } });
      m.addLayer({ id: 'nights', type: 'circle', source: 'nights', paint: { 'circle-radius': ['case', ['get', 'end'], 8, 6], 'circle-color': ink, 'circle-stroke-color': paper, 'circle-stroke-width': 2 } });
      m.on('click', 'gems', (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const g = JSON.parse(String(f.properties?.gem ?? '{}')) as Gem;
        new maplibregl.Popup({ offset: 10 }).setLngLat([g.longitude, g.latitude]).setDOMContent(gemPopup(g)).addTo(m);
      });
      m.on('mouseenter', 'gems', () => (m.getCanvas().style.cursor = 'pointer'));
      m.on('mouseleave', 'gems', () => (m.getCanvas().style.cursor = ''));
      setReady(true);
    });
    m.on('error', () => undefined); // a missing tile must not break the page
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    const animate = !reducedMotion();
    let line: LngLat[] = [];
    if (arc) {
      line = greatCircle(arc[0], arc[1]);
      (m.getSource('nights') as GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: arc.map((p, i) => ({ type: 'Feature', properties: { end: i === 1 }, geometry: { type: 'Point', coordinates: p } })),
      });
    } else {
      const d = mapData(stops, gems, route);
      line = d.line.map(([lat, lng]) => [lng, lat] as LngLat);
      (m.getSource('nights') as GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: d.stops.map((s, i) => ({ type: 'Feature', properties: { end: i === 0 || i === d.stops.length - 1, name: s.label }, geometry: { type: 'Point', coordinates: [s.at[1], s.at[0]] } })),
      });
      (m.getSource('gems') as GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: d.gems.map((g) => ({ type: 'Feature', properties: { today: dayGems.includes(g.name), gem: JSON.stringify(g) }, geometry: { type: 'Point', coordinates: [g.longitude, g.latitude] } })),
      });
    }
    (m.getSource('road') as GeoJSONSource).setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: line } });
    if (line.length > 1) {
      const bounds = line.reduce((b, p) => b.extend(p as LngLatLike), new maplibregl.LngLatBounds(line[0], line[0]));
      m.fitBounds(bounds, { padding: 48, duration: animate ? 2400 : 0, maxZoom: 9 });
    }
  }, [ready, stops, gems, route, dayGems, arc]);

  if (failed) {
    return (
      <div role="img" aria-label={label} className={`flex items-center justify-center bg-paper-2 p-24 text-center text-[16px] text-muted rt-map ${className}`}>
        The map is not available on this device. The plan below has every stop.
      </div>
    );
  }
  return <div ref={el} role="region" aria-label={label} className={`rt-map ${className}`} />;
}
