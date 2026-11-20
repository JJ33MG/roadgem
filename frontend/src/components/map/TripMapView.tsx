import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { mapData } from '@/lib/polyline';

type Stop = { location: string; latitude: number; longitude: number };
type Gem = { name: string; latitude: number; longitude: number; rating?: number; reviews?: number; mapsUrl?: string; placeId?: string };

type Props = {
  stops: Stop[];
  gems: Gem[];
  /** The road as Google's encoded polyline; straight lines between stops when missing. */
  route?: string;
  /** Names of the gems on the day being viewed: drawn larger. */
  dayGems?: string[];
  className?: string;
};

/** A popup built from text nodes only (gem names come from outside). */
function gemPopup(g: Gem): HTMLElement {
  const box = document.createElement('div');
  const name = document.createElement('strong');
  name.textContent = g.name;
  box.append(name);
  if (g.rating) {
    const r = document.createElement('div');
    r.textContent = `${g.rating.toFixed(1)} stars${g.reviews ? `, ${g.reviews.toLocaleString('en')} reviews` : ''}`;
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

/** The trip on a real map: the road, the nights (ink) and the gems (accent), each gem with its own popup. */
export function TripMapView({ stops, gems, route, dayGems = [], className = '' }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const fitted = useRef('');

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { scrollWheelZoom: false, zoomControl: true });
    m.attributionControl.setPrefix(false);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 18,
    }).addTo(m);
    map.current = m;
    layer.current = L.layerGroup().addTo(m);
    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    const d = mapData(stops, gems, route);
    if (d.line.length > 1) {
      L.polyline(d.line, { className: 'rt-road-casing', weight: 9 }).addTo(g);
      L.polyline(d.line, { className: 'rt-road', weight: 4 }).addTo(g);
    }
    d.stops.forEach((s, i) => {
      L.circleMarker(s.at, { radius: i === 0 || i === d.stops.length - 1 ? 8 : 6, className: 'rt-night', weight: 2 })
        .bindTooltip(s.label, { direction: 'top', offset: [0, -6] })
        .addTo(g);
    });
    d.gems.forEach((gem) => {
      const today = dayGems.includes(gem.name);
      L.circleMarker([gem.latitude, gem.longitude], { radius: today ? 9 : 6, className: today ? 'rt-gem rt-gem-today' : 'rt-gem', weight: 3 })
        .bindPopup(gemPopup(gem))
        .bindTooltip(gem.name, { direction: 'top', offset: [0, -6] })
        .addTo(g);
    });
    const key = JSON.stringify([d.line.length, d.stops.length, d.gems.length]);
    const points = [...d.line, ...d.gems.map((x) => [x.latitude, x.longitude] as [number, number])];
    if (points.length && fitted.current !== key) {
      m.fitBounds(L.latLngBounds(points), { padding: [24, 24] });
      fitted.current = key;
    }
  }, [stops, gems, route, dayGems]);

  return <div ref={el} role="region" aria-label="Map of the route, the nights and the gems" className={`rt-map ${className}`} />;
}
