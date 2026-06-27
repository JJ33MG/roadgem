import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { tripsApi } from '@/lib/api';
import { addDays, format } from 'date-fns';
import {
  Download, Share2, Sunrise, Sun, Sunset, Cloud,
  BedDouble, Lock, ExternalLink, MapPin, ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DestinationImage } from '@/components/display/DestinationImage';
import { AccommodationCard, ACCOMMODATION_TYPE_LABELS } from '@/components/display/AccommodationCard';
import { Modal } from '@/components/utility/Modal';
import { LoadingSpinner } from '@/components/utility/LoadingSpinner';
import { useAccommodations } from '@/hooks/useAccommodations';
import { useSubscription } from '@/hooks/useSubscription';
import { generateTripPDF } from '@/utils/generatePDF';
import { GlobeView, lookupCoords, buildGoogleMapsRouteUrl } from '@/components/display/GlobeView';
import type { AccommodationOption, AccommodationType, GeneratedItineraryDay, GeneratedTrip } from '@/types';

// ─── URL builders ─────────────────────────────────────────────────────────────

function buildGemMapsUrl(gem: { latitude?: number; longitude?: number; address?: string; name: string }) {
  if (gem.latitude && gem.longitude) {
    return `https://www.google.com/maps/search/?api=1&query=${gem.latitude},${gem.longitude}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(gem.name + (gem.address ? ' ' + gem.address : ''))}`;
}

function buildViatorUrl(a: string, l: string) {
  return `https://www.viator.com/search?text=${encodeURIComponent(`${a} ${l}`)}`;
}
function buildGetYourGuideUrl(a: string, l: string) {
  return `https://www.getyourguide.com/s/?q=${encodeURIComponent(`${a} ${l}`)}`;
}
function buildRentalcarsUrl(pickup: string, dropoff: string, from: string, to: string) {
  return `https://www.rentalcars.com/en/?pickup-location=${encodeURIComponent(pickup)}&dropoff-location=${encodeURIComponent(dropoff)}&pickup-date=${from}&dropoff-date=${to}`;
}
function buildAutoEuropeUrl(pickup: string, from: string, to: string) {
  const toEu = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
  return `https://www.autoeurope.eu/car-hire/?locationA=${encodeURIComponent(pickup)}&dateFrom=${toEu(from)}&dateTo=${toEu(to)}`;
}
function buildTheForkUrl(a: string, l: string) {
  return `https://www.thefork.com/search#cityName=${encodeURIComponent(l)}&searchPhrase=${encodeURIComponent(a)}`;
}

const FOOD_KEYWORDS = ['dinner', 'restaurant', 'dining', 'lunch', 'food', 'eat', 'cuisine', 'cafe', 'café', 'bistro', 'brasserie', 'tavern', 'eatery'];
function isFoodActivity(slot: 'morning' | 'afternoon' | 'evening', activity: string) {
  if (slot === 'evening') return true;
  return FOOD_KEYWORDS.some(kw => activity.toLowerCase().includes(kw));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const SLOT_CONFIG: Record<'morning' | 'afternoon' | 'evening', { label: string; icon: typeof Sunrise }> = {
  morning: { label: 'Morning', icon: Sunrise },
  afternoon: { label: 'Afternoon', icon: Sun },
  evening: { label: 'Evening', icon: Sunset },
};

function SlotRow({ slot, item }: { slot: 'morning' | 'afternoon' | 'evening'; item: GeneratedItineraryDay['morning'] }) {
  const { label, icon: Icon } = SLOT_CONFIG[slot];
  return (
    <div className="flex gap-10 rounded-xl p-10 transition-colors" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex h-28 w-28 flex-shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(245,166,35,0.1)', color: '#f5a623' }}>
        <Icon size={14} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="flex items-baseline justify-between gap-6">
          <p className="text-caption font-w480 text-white" style={{ lineHeight: 1.4 }}>{item.activity}</p>
          <span className="flex-shrink-0 text-caption" style={{ color: '#f5a623' }}>&euro;{item.estimatedCost}</span>
        </div>
        <p className="text-white/50" style={{ fontSize: 11, marginTop: 2 }}>
          {label} &middot; {item.time} &middot; {item.location}
        </p>
        <p className="text-white/40" style={{ fontSize: 11, marginTop: 4 }}>{item.description}</p>
        <div className="flex flex-wrap gap-6" style={{ marginTop: 6 }}>
          <a href={buildViatorUrl(item.activity, item.location)} target="_blank" rel="noopener noreferrer sponsored"
            className="inline-flex items-center gap-3" style={{ fontSize: 11, color: 'rgba(245,166,35,0.6)' }}>
            Viator <ExternalLink size={9} />
          </a>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>·</span>
          <a href={buildGetYourGuideUrl(item.activity, item.location)} target="_blank" rel="noopener noreferrer sponsored"
            className="inline-flex items-center gap-3" style={{ fontSize: 11, color: 'rgba(245,166,35,0.6)' }}>
            GetYourGuide <ExternalLink size={9} />
          </a>
          {isFoodActivity(slot, item.activity) && (
            <>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>·</span>
              <a href={buildTheForkUrl(item.activity, item.location)} target="_blank" rel="noopener noreferrer sponsored"
                className="inline-flex items-center gap-3" style={{ fontSize: 11, color: 'rgba(245,166,35,0.6)' }}>
                TheFork <ExternalLink size={9} />
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DayTabs({ days, activeDay, onSelect }: { days: GeneratedItineraryDay[]; activeDay: number; onSelect: (d: number) => void }) {
  return (
    <div className="flex gap-6 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
      {(days ?? []).map(day => (
        <button key={day.day} onClick={() => onSelect(day.day)}
          className="flex-shrink-0 rounded-full px-12 py-6 text-caption font-w480 transition-all"
          style={{
            background: activeDay === day.day ? '#f5a623' : 'rgba(255,255,255,0.08)',
            color: activeDay === day.day ? '#080c14' : 'rgba(255,255,255,0.6)',
            border: activeDay === day.day ? 'none' : '1px solid rgba(255,255,255,0.1)',
          }}>
          Day {day.day}
        </button>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TripResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { tripId } = useParams<{ tripId: string }>();
  const locationState = location.state as { trip?: GeneratedTrip; accommodationTypes?: AccommodationType[] } | null;

  const [trip, setTrip] = useState<GeneratedTrip | null>(locationState?.trip ?? null);
  const [tripLoading, setTripLoading] = useState(!locationState?.trip);
  const accommodationTypes: AccommodationType[] =
    locationState?.accommodationTypes?.length ? locationState.accommodationTypes : ['hotel', 'hostel', 'campsite', 'airbnb'];

  const { isPremium } = useSubscription();
  const [activeDay, setActiveDay] = useState(1);
  const [shareCopied, setShareCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [accommodationModalOpen, setAccommodationModalOpen] = useState(false);
  const [accommodationFilter, setAccommodationFilter] = useState<AccommodationType | 'all'>('all');
  const [selectedAccommodations, setSelectedAccommodations] = useState<Record<number, AccommodationOption>>({});

  const contentRef = useRef<HTMLDivElement>(null);

  const globeStops = (trip?.stops ?? [])
    .map((s: any) => {
      if (s.latitude && s.longitude) return { lat: s.latitude, lng: s.longitude, label: s.location };
      const c = lookupCoords(s.location?.split(',')[0] ?? '');
      return c ? { ...c, label: s.location } : null;
    })
    .filter(Boolean) as { lat: number; lng: number; label: string }[];

  const globeGems = (trip?.hiddenGems ?? [])
    .filter((g: any) => g.latitude && g.longitude)
    .map((g: any) => ({ lat: g.latitude, lng: g.longitude, label: g.name, category: g.category }));

  const mapsUrl = buildGoogleMapsRouteUrl(globeStops);

  const currentStop = trip?.stops?.length
    ? trip.stops[Math.min(activeDay - 1, trip.stops.length - 1)]
    : undefined;

  const safeStartDate = trip?.startDate ? new Date(trip.startDate) : null;
  const safeEndDate = trip?.endDate ? new Date(trip.endDate) : null;
  const checkinDate = safeStartDate ? addDays(safeStartDate, activeDay - 1) : null;
  const checkin = checkinDate ? format(checkinDate, 'yyyy-MM-dd') : undefined;
  const checkout = checkinDate ? format(addDays(checkinDate, 1), 'yyyy-MM-dd') : undefined;

  useEffect(() => {
    if (!trip && tripId) {
      setTripLoading(true);
      tripsApi.getById(tripId)
        .then(res => setTrip(res.data as unknown as GeneratedTrip))
        .catch(() => setTrip(null))
        .finally(() => setTripLoading(false));
    }
  }, [tripId]);

  const { accommodations, isLoading: accommodationsLoading } = useAccommodations({
    lat: currentStop?.latitude,
    lng: currentStop?.longitude,
    location: currentStop?.location ?? trip?.destination ?? '',
    types: accommodationTypes,
    checkin,
    checkout,
    enabled: accommodationModalOpen,
  });

  if (tripLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#080c14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner size={32} />
      </div>
    );
  }

  if (!trip) {
    return (
      <div style={{ minHeight: '100vh', background: '#080c14', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <h2 className="text-heading font-display font-w360 text-white">Trip not found</h2>
        <p className="mt-12 text-body-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>This trip isn't available. Generate a new one.</p>
        <button onClick={() => navigate('/')} className="mt-24 rounded-full px-24 py-12 text-body-sm font-w480" style={{ background: '#f5a623', color: '#080c14' }}>
          Plan a trip
        </button>
      </div>
    );
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  }

  async function handleDownloadPdf() {
    if (!contentRef.current || !trip) return;
    setIsExporting(true);
    try { await generateTripPDF(contentRef.current, trip.destination, trip.startDate); }
    finally { setIsExporting(false); }
  }

  function handleSelectAccommodation(acc: AccommodationOption) {
    setSelectedAccommodations(prev => ({ ...prev, [activeDay]: acc }));
    setAccommodationModalOpen(false);
  }

  const itinerary = trip.itinerary ?? [];
  const currentDay = itinerary.find((d: any) => d.day === activeDay) ?? itinerary[0];
  const slots: ('morning' | 'afternoon' | 'evening')[] = ['morning', 'afternoon', 'evening'];
  const dayWeather = trip.weather?.find((w: any) => w.day === activeDay);
  const selectedAccommodation = selectedAccommodations[activeDay];
  const accommodationFilterOptions: (AccommodationType | 'all')[] = ['all', ...accommodationTypes];
  const filteredAccommodations = accommodationFilter === 'all' ? accommodations : accommodations.filter(a => a.type === accommodationFilter);

  const hiddenGems = trip.hiddenGems ?? [];
  const currentCity = currentStop?.location?.split(',')[0]?.toLowerCase().trim() ?? trip.destination.toLowerCase();
  const dayGems = hiddenGems.filter((g: any) =>
    g.address?.toLowerCase().includes(currentCity) || g.name?.toLowerCase().includes(currentCity)
  );
  const gemsToShow: typeof hiddenGems = dayGems.length > 0 ? dayGems : hiddenGems;

  const pickupLocation = trip.stops?.[0]?.location ?? trip.destination;
  const startDateStr = safeStartDate ? format(safeStartDate, 'yyyy-MM-dd') : '';
  const endDateStr = safeEndDate ? format(safeEndDate, 'yyyy-MM-dd') : '';

  return (
    <div style={{ background: '#080c14', color: 'white', minHeight: '100vh' }}>

      {/* ── Globe hero (fixed height, not sticky) ── */}
      <div style={{ height: '100vh', position: 'relative', overflow: 'hidden', background: '#080c14' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <GlobeView stops={globeStops} gems={globeGems} autoRotate={false} />
        </div>

        {/* Gradient vignette */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at center, transparent 30%, rgba(8,12,20,0.6) 100%)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 160, pointerEvents: 'none', background: 'linear-gradient(transparent, #080c14)' }} />

        {/* Trip title overlay */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 32px 48px', zIndex: 10 }}>
          <p style={{ fontFamily: 'monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#f5a623', marginBottom: 6 }}>
            {safeStartDate ? format(safeStartDate, 'MMM d') : ''} – {safeEndDate ? format(safeEndDate, 'MMM d, yyyy') : ''}
          </p>
          <h1 className="font-display font-w360 text-white" style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', lineHeight: 1.2 }}>
            {trip.destination}
          </h1>
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: '0 16px', fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
            <span>{trip.days} days</span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
            <span style={{ color: '#f5a623', fontWeight: 480 }}>&euro;{trip.totalCost?.toLocaleString()}</span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
            <span>{trip.totalDistance?.toLocaleString()} km</span>
          </div>

          {/* Action buttons */}
          <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button onClick={handleShare}
              style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 9999, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', padding: '8px 16px', fontSize: 12, color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
              <Share2 size={12} /> {shareCopied ? 'Copied!' : 'Share'}
            </button>
            <button onClick={handleDownloadPdf} disabled={isExporting}
              style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 9999, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', padding: '8px 16px', fontSize: 12, color: 'rgba(255,255,255,0.7)', cursor: 'pointer', opacity: isExporting ? 0.4 : 1 }}>
              <Download size={12} /> {isExporting ? '...' : 'Export PDF'}
            </button>
            {isPremium ? (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 9999, background: '#f5a623', padding: '8px 16px', fontSize: 12, fontWeight: 480, color: '#080c14' }}>
                <MapPin size={12} /> Navigate in Google Maps
              </a>
            ) : (
              <Link to="/pricing"
                style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 9999, border: '1px solid rgba(245,166,35,0.4)', padding: '8px 16px', fontSize: 12, color: 'rgba(245,166,35,0.7)' }}>
                <Lock size={12} /> Maps route — Premium
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Main content (always visible below globe) ── */}
      <div ref={contentRef} style={{ background: '#080c14', padding: '0 24px 80px', position: 'relative' }}>

        {/* Route stops */}
        {(trip.stops?.length ?? 0) > 0 && (
          <div style={{ overflowX: 'auto', paddingTop: 32, paddingBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, minWidth: 'max-content' }}>
              {trip.stops.map((stop: any, i: number) => (
                <div key={stop.location ?? i} style={{ display: 'flex', alignItems: 'center' }}>
                  <button onClick={() => setActiveDay(i + 1)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      borderRadius: 12, padding: '8px 12px', cursor: 'pointer', textAlign: 'center',
                      background: activeDay === i + 1 ? 'rgba(245,166,35,0.1)' : 'transparent',
                      border: activeDay === i + 1 ? '1px solid rgba(245,166,35,0.4)' : '1px solid transparent',
                    }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontFamily: 'monospace',
                      background: activeDay === i + 1 ? '#f5a623' : 'rgba(255,255,255,0.1)',
                      color: activeDay === i + 1 ? '#080c14' : 'rgba(255,255,255,0.5)',
                    }}>
                      {i + 1}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 480, whiteSpace: 'nowrap', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', color: activeDay === i + 1 ? 'white' : 'rgba(255,255,255,0.5)' }}>
                      {stop.location?.split(',')[0] ?? `Stop ${i + 1}`}
                    </span>
                    {stop.distanceFromPrev > 0 && (
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{stop.distanceFromPrev} km</span>
                    )}
                  </button>
                  {i < trip.stops.length - 1 && (
                    <ChevronRight size={12} style={{ margin: '0 4px', flexShrink: 0, color: 'rgba(255,255,255,0.2)' }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Day photo */}
        <div style={{ marginTop: 24, borderRadius: 16, overflow: 'hidden', height: 320 }}>
          <DestinationImage
            query={currentStop?.location ?? trip.destination}
            alt={currentStop?.location ?? trip.destination}
            className="h-full w-full"
          />
        </div>

        {/* Itinerary */}
        <div style={{ marginTop: 24, borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 480, color: 'white', marginBottom: 12 }}>Day-by-day</h3>

          <DayTabs days={itinerary as GeneratedItineraryDay[]} activeDay={activeDay} onSelect={setActiveDay} />

          {dayWeather && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              <Cloud size={13} style={{ color: '#f5a623' }} />
              {dayWeather.temp}&deg;C &middot; {dayWeather.condition}
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div key={activeDay} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}
              style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {currentDay && slots.map((slot, i) => {
                const item = (currentDay as any)[slot];
                if (!item) return null;
                return (
                  <motion.div key={slot} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.25 }}>
                    <SlotRow slot={slot} item={item} />
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>

          {/* Overnight */}
          <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 14, fontWeight: 480, color: 'white' }}>Overnight stay</h3>
              <button onClick={() => setAccommodationModalOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, borderRadius: 9999, border: '1px solid rgba(255,255,255,0.15)', padding: '6px 12px', fontSize: 12, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', background: 'transparent' }}>
                <BedDouble size={13} /> {selectedAccommodation ? 'Change' : 'Browse'}
              </button>
            </div>
            {selectedAccommodation && (
              <div style={{ marginTop: 10 }}><AccommodationCard accommodation={selectedAccommodation} selected /></div>
            )}
          </div>

          {/* Rental car */}
          {startDateStr && endDateStr && (
            <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 480, color: 'white', marginBottom: 10 }}>Rental car</h3>
              <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', padding: 12 }}>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
                  {pickupLocation} → {trip.destination} &nbsp;|&nbsp; {startDateStr} – {endDateStr}
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <a href={buildRentalcarsUrl(pickupLocation, trip.destination, startDateStr, endDateStr)}
                    target="_blank" rel="noopener noreferrer sponsored"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 9999, border: '1px solid rgba(255,255,255,0.15)', padding: '8px 12px', fontSize: 12, color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
                    Rentalcars.com <ExternalLink size={11} />
                  </a>
                  <a href={buildAutoEuropeUrl(pickupLocation, startDateStr, endDateStr)}
                    target="_blank" rel="noopener noreferrer sponsored"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 9999, border: '1px solid rgba(255,255,255,0.15)', padding: '8px 12px', fontSize: 12, color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
                    AutoEurope <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hidden gems */}
        {gemsToShow.length > 0 && (
          <div style={{ marginTop: 24, position: 'relative', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 480, color: 'white' }}>
                Hidden spots — {currentStop?.location?.split(',')[0] ?? trip.destination}
              </h3>
              {!isPremium && (
                <Link to="/pricing" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(245,166,35,0.7)' }}>
                  <Lock size={12} /> Premium
                </Link>
              )}
            </div>

            {isPremium ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                {gemsToShow.map((gem: any, i: number) => {
                  const badgeColor =
                    gem.category === 'restaurant' || gem.category === 'café' || gem.category === 'bar' ? '#f5a623'
                    : gem.category === 'viewpoint' || gem.category === 'nature' ? '#4ade80'
                    : gem.category === 'culture' || gem.category === 'historic' ? '#a78bfa'
                    : '#60a5fa';
                  return (
                    <motion.div key={gem.name ?? i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }} transition={{ delay: i * 0.06, duration: 0.3 }}
                      style={{ overflow: 'hidden', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ height: 140 }}>
                        <DestinationImage query={`${gem.name}, ${trip.destination}`} alt={gem.name} className="h-full w-full" />
                      </div>
                      <div style={{ padding: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <p style={{ fontSize: 14, fontWeight: 480, color: 'white', lineHeight: 1.3 }}>{gem.name}</p>
                          <span style={{ flexShrink: 0, borderRadius: 9999, padding: '2px 8px', fontSize: 10, fontWeight: 480, textTransform: 'capitalize', color: '#080c14', background: badgeColor }}>
                            {gem.category}
                          </span>
                        </div>
                        {gem.address && <p style={{ marginTop: 2, fontSize: 12, color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{gem.address}</p>}
                        <p style={{ marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{gem.description}</p>
                        <a href={buildGemMapsUrl(gem)} target="_blank" rel="noopener noreferrer"
                          style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'rgba(245,166,35,0.6)' }}>
                          <MapPin size={10} /> Open in Maps
                        </a>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, filter: 'blur(6px)', pointerEvents: 'none', userSelect: 'none' }}>
                  {gemsToShow.slice(0, 2).map((gem: any) => (
                    <div key={gem.name} style={{ overflow: 'hidden', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ height: 120, background: 'linear-gradient(135deg, rgba(245,166,35,0.1), rgba(255,255,255,0.05), #080c14)' }} />
                      <div style={{ padding: 12 }}>
                        <p style={{ fontSize: 14, fontWeight: 480, color: 'white' }}>{gem.name}</p>
                        <p style={{ marginTop: 4, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{gem.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, borderRadius: 16, background: 'rgba(8,12,20,0.7)', backdropFilter: 'blur(4px)' }}>
                  <Lock size={20} style={{ color: '#f5a623' }} />
                  <p style={{ fontSize: 14, fontWeight: 480, color: 'white' }}>Hidden gems are a Premium feature</p>
                  <Link to="/pricing" style={{ borderRadius: 9999, background: '#f5a623', padding: '10px 24px', fontSize: 14, fontWeight: 480, color: '#080c14' }}>
                    Unlock with Premium
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Highlights & tips */}
        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {(trip.highlights?.length ?? 0) > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.4 }}
              style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', padding: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 480, color: 'white', marginBottom: 16 }}>Trip highlights</h3>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, listStyle: 'none', padding: 0, margin: 0 }}>
                {trip.highlights.map((h: string, i: number) => (
                  <motion.li key={i} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                    <span style={{ marginTop: 4, width: 6, height: 6, borderRadius: '50%', background: '#f5a623', flexShrink: 0 }} />
                    {h}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}

          {(trip.tips?.length ?? 0) > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.4 }}
              style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', padding: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 480, color: 'white', marginBottom: 16 }}>Local tips</h3>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, listStyle: 'none', padding: 0, margin: 0 }}>
                {trip.tips.map((tip: string, i: number) => (
                  <motion.li key={i} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                    <span style={{ marginTop: 4, width: 6, height: 6, borderRadius: '50%', background: 'rgba(245,166,35,0.6)', flexShrink: 0 }} />
                    {tip}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}
        </div>
      </div>

      {/* Accommodation modal */}
      <Modal isOpen={accommodationModalOpen} title={`Overnight stay — Day ${activeDay}`}
        onClose={() => setAccommodationModalOpen(false)}>
        <div className="flex gap-8 overflow-x-auto pb-8">
          {accommodationFilterOptions.map(type => (
            <button key={type} onClick={() => setAccommodationFilter(type)}
              style={{
                flexShrink: 0, borderRadius: 9999, padding: '6px 12px', fontSize: 12, fontWeight: 480, cursor: 'pointer',
                background: accommodationFilter === type ? '#f5a623' : 'rgba(255,255,255,0.08)',
                color: accommodationFilter === type ? '#080c14' : 'rgba(255,255,255,0.6)',
                border: accommodationFilter === type ? 'none' : '1px solid rgba(255,255,255,0.1)',
              }}>
              {type === 'all' ? 'All' : ACCOMMODATION_TYPE_LABELS[type]}
            </button>
          ))}
        </div>

        {accommodationsLoading ? (
          <div className="flex justify-center py-40"><LoadingSpinner size={28} /></div>
        ) : filteredAccommodations.length === 0 ? (
          <p className="py-24 text-center text-body-sm text-white/40">No accommodation options found nearby.</p>
        ) : (
          <div className="mt-12 grid max-h-[60vh] gap-12 overflow-y-auto sm:grid-cols-2">
            {filteredAccommodations.map(acc => (
              <AccommodationCard key={acc.id} accommodation={acc}
                selected={selectedAccommodation?.id === acc.id} onSelect={handleSelectAccommodation} />
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
