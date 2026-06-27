import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { tripsApi } from '@/lib/api';
import { addDays, format } from 'date-fns';
import {
  Download, Share2, Sunrise, Sun, Sunset, Cloud,
  BedDouble, Lock, ExternalLink, MapPin, Car, ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import clsx from 'clsx';
import { DestinationImage } from '@/components/display/DestinationImage';
import { AccommodationCard, ACCOMMODATION_TYPE_LABELS } from '@/components/display/AccommodationCard';
import { RentalCarCard } from '@/components/display/RentalCarCard';
import { Modal } from '@/components/utility/Modal';
import { LoadingSpinner } from '@/components/utility/LoadingSpinner';
import { useAccommodations } from '@/hooks/useAccommodations';
import { useSubscription } from '@/hooks/useSubscription';
import { generateTripPDF } from '@/utils/generatePDF';
import { GlobeView, lookupCoords } from '@/components/display/GlobeView';
import type { AccommodationOption, AccommodationType, GeneratedItineraryDay, GeneratedTrip } from '@/types';

// ─── URL builders ─────────────────────────────────────────────────────────────

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
function buildMapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
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
    <div className="flex gap-10 rounded-xl border border-white/8 p-10 sm:p-12 transition-colors hover:border-[#f5a623]/20">
      <div className="flex h-28 w-28 sm:h-32 sm:w-32 flex-shrink-0 items-center justify-center rounded-full bg-[#f5a623]/10 text-[#f5a623]">
        <Icon size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-6">
          <p className="text-caption sm:text-body-sm font-w480 text-white leading-snug">{item.activity}</p>
          <span className="flex-shrink-0 text-caption text-[#f5a623]">&euro;{item.estimatedCost}</span>
        </div>
        <p className="text-[11px] sm:text-caption text-white/50 mt-1">
          {label} &middot; {item.time} &middot; {item.location}
        </p>
        <p className="mt-3 text-[11px] sm:text-caption text-white/40">{item.description}</p>
        {item.notes && <p className="mt-2 text-[11px] sm:text-caption italic text-white/30">{item.notes}</p>}
        <div className="mt-4 flex flex-wrap gap-6 sm:gap-8">
          <a href={buildViatorUrl(item.activity, item.location)} target="_blank" rel="noopener noreferrer sponsored"
            className="inline-flex items-center gap-3 text-[11px] sm:text-caption text-[#f5a623]/60 hover:text-[#f5a623]">
            Viator <ExternalLink size={9} />
          </a>
          <span className="text-caption text-white/20">·</span>
          <a href={buildGetYourGuideUrl(item.activity, item.location)} target="_blank" rel="noopener noreferrer sponsored"
            className="inline-flex items-center gap-3 text-[11px] sm:text-caption text-[#f5a623]/60 hover:text-[#f5a623]">
            GetYourGuide <ExternalLink size={9} />
          </a>
          {isFoodActivity(slot, item.activity) && (
            <>
              <span className="text-caption text-white/20">·</span>
              <a href={buildTheForkUrl(item.activity, item.location)} target="_blank" rel="noopener noreferrer sponsored"
                className="inline-flex items-center gap-3 text-[11px] sm:text-caption text-[#f5a623]/60 hover:text-[#f5a623]">
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
    <div className="flex gap-6 overflow-x-auto pb-1 scrollbar-none">
      {days.map(day => (
        <button key={day.day} onClick={() => onSelect(day.day)}
          className={clsx(
            'flex-shrink-0 rounded-full px-12 py-6 text-caption font-w480 transition-all',
            activeDay === day.day
              ? 'bg-[#f5a623] text-[#080c14]'
              : 'bg-white/8 text-white/60 hover:text-white border border-white/10'
          )}>
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
  const [, setRentalCarModalOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [accommodationModalOpen, setAccommodationModalOpen] = useState(false);
  const [accommodationFilter, setAccommodationFilter] = useState<AccommodationType | 'all'>('all');
  const [selectedAccommodations, setSelectedAccommodations] = useState<Record<number, AccommodationOption>>({});

  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Scroll-linked animation
  const { scrollYProgress } = useScroll({ target: scrollRef, offset: ['start start', 'end start'] });
  const globeHeight = useTransform(scrollYProgress, [0, 0.35], ['100vh', '0vh']);
  const globeOpacity = useTransform(scrollYProgress, [0.25, 0.4], [1, 0]);
  const heroTextY = useTransform(scrollYProgress, [0, 0.25], [0, -40]);
  const heroTextOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  // Globe stops
  const globeStops = trip?.stops
    ?.map((s: any) => { const c = lookupCoords(s.location?.split(',')[0] ?? ''); return c ? { ...c, label: s.location } : null; })
    .filter(Boolean) ?? [];

  const currentStop = trip?.stops[Math.min(activeDay - 1, (trip?.stops?.length ?? 1) - 1)];
  const checkinDate = trip ? addDays(new Date(trip.startDate), activeDay - 1) : null;
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
      <div className="flex min-h-screen items-center justify-center bg-[#080c14]">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#080c14] px-24 text-center">
        <h2 className="text-heading font-display font-w360 text-white">Trip not found</h2>
        <p className="mt-12 text-body-sm text-white/50">This trip isn't available. Generate a new one.</p>
        <button onClick={() => navigate('/')} className="mt-24 rounded-full bg-[#f5a623] px-24 py-12 text-body-sm font-w480 text-[#080c14]">
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

  const currentDay = trip.itinerary.find(d => d.day === activeDay) ?? trip.itinerary[0];
  const slots: ('morning' | 'afternoon' | 'evening')[] = ['morning', 'afternoon', 'evening'];
  const dayWeather = trip.weather?.find(w => w.day === activeDay);
  const selectedAccommodation = selectedAccommodations[activeDay];
  const accommodationFilterOptions: (AccommodationType | 'all')[] = ['all', ...accommodationTypes];
  const filteredAccommodations = accommodationFilter === 'all' ? accommodations : accommodations.filter(a => a.type === accommodationFilter);

  return (
    <div ref={scrollRef} className="relative bg-[#080c14] text-white">

      {/* ── Globe hero (sticky, shrinks as user scrolls) ── */}
      <motion.div
        style={{ height: globeHeight, opacity: globeOpacity }}
        className="sticky top-0 z-0 overflow-hidden bg-[#080c14]"
      >
        {/* Globe */}
        <div className="absolute inset-0">
          <GlobeView stops={globeStops as any} autoRotate={false} />
        </div>

        {/* Gradient vignette */}
        <div aria-hidden className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(8,12,20,0.6) 100%)' }} />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-40 pointer-events-none"
          style={{ background: 'linear-gradient(transparent, #080c14)' }} />

        {/* Trip title overlay */}
        <motion.div style={{ y: heroTextY, opacity: heroTextOpacity }}
          className="absolute bottom-0 left-0 right-0 z-10 px-24 pb-40 md:px-40">
          <p className="mb-6 font-mono text-[11px] uppercase tracking-widest text-[#f5a623]">
            {format(new Date(trip.startDate), 'MMM d')} – {format(new Date(trip.endDate), 'MMM d, yyyy')}
          </p>
          <h1 className="font-display font-w360 text-white leading-tight"
            style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)' }}>
            {trip.destination}
          </h1>
          <div className="mt-10 flex flex-wrap items-center gap-x-16 gap-y-4 text-body-sm text-white/60">
            <span>{trip.days} days</span>
            <span className="text-white/20">·</span>
            <span className="text-[#f5a623] font-w480">&euro;{trip.totalCost.toLocaleString()}</span>
            <span className="text-white/20">·</span>
            <span>{trip.totalDistance.toLocaleString()} km</span>
          </div>

          {/* Action buttons */}
          <div className="mt-16 flex gap-8">
            <button onClick={handleShare}
              className="flex items-center gap-6 rounded-full border border-white/15 bg-white/8 px-16 py-8 text-caption text-white/70 backdrop-blur-sm transition-all hover:border-white/30 hover:text-white">
              <Share2 size={12} /> {shareCopied ? 'Copied!' : 'Share'}
            </button>
            <button onClick={handleDownloadPdf} disabled={isExporting}
              className="flex items-center gap-6 rounded-full border border-white/15 bg-white/8 px-16 py-8 text-caption text-white/70 backdrop-blur-sm transition-all hover:border-white/30 hover:text-white disabled:opacity-40">
              <Download size={12} /> {isExporting ? '...' : 'Export PDF'}
            </button>
          </div>
        </motion.div>
      </motion.div>

      {/* ── Main content ── */}
      <div ref={contentRef} className="relative z-10 bg-[#080c14] px-24 pb-80 md:px-40">

        {/* Route stops */}
        {trip.stops?.length > 0 && (
          <div className="overflow-x-auto scrollbar-none pt-32 pb-4">
            <div className="flex items-center gap-0 min-w-max">
              {trip.stops.map((stop: any, i: number) => (
                <div key={stop.location ?? i} className="flex items-center">
                  <button onClick={() => setActiveDay(i + 1)}
                    className={clsx(
                      'flex flex-col items-center gap-3 rounded-2xl px-12 py-8 transition-all text-center',
                      activeDay === i + 1
                        ? 'bg-[#f5a623]/10 border border-[#f5a623]/40'
                        : 'border border-transparent hover:border-white/10'
                    )}>
                    <div className={clsx(
                      'flex h-24 w-24 items-center justify-center rounded-full text-[10px] font-mono',
                      activeDay === i + 1 ? 'bg-[#f5a623] text-[#080c14]' : 'bg-white/10 text-white/50'
                    )}>
                      {i + 1}
                    </div>
                    <span className={clsx(
                      'text-[11px] font-w480 whitespace-nowrap max-w-[90px] truncate',
                      activeDay === i + 1 ? 'text-white' : 'text-white/50'
                    )}>
                      {stop.location?.split(',')[0] ?? `Stop ${i + 1}`}
                    </span>
                    {stop.distanceFromPrev > 0 && (
                      <span className="text-[10px] text-white/30">{stop.distanceFromPrev} km</span>
                    )}
                  </button>
                  {i < trip.stops.length - 1 && (
                    <ChevronRight size={12} className="mx-2 flex-shrink-0 text-white/20" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Day image + itinerary */}
        <div className="mt-24 grid gap-16 sm:gap-20 lg:grid-cols-[1fr_380px]">

          {/* Day hero image */}
          <div className="overflow-hidden rounded-2xl" style={{ minHeight: 260 }}>
            <DestinationImage
              query={currentStop?.location ?? trip.destination}
              alt={currentStop?.location ?? trip.destination}
              className="h-[260px] sm:h-[380px] w-full object-cover"
            />
          </div>

          {/* Itinerary sidebar */}
          <aside className="rounded-2xl border border-white/8 bg-white/3 p-16 sm:p-20">
            <h3 className="mb-12 text-body-sm font-w480 text-white">Day-by-day</h3>
            <DayTabs days={trip.itinerary} activeDay={activeDay} onSelect={setActiveDay} />

            {dayWeather && (
              <div className="mt-10 flex items-center gap-6 text-caption text-white/40">
                <Cloud size={13} className="text-[#f5a623]" />
                {dayWeather.temp}&deg;C &middot; {dayWeather.condition}
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div key={activeDay} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}
                className="mt-12 flex flex-col gap-6 sm:gap-8">
                {currentDay && slots.map((slot, i) => {
                  const item = currentDay[slot];
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
            <div className="mt-16 border-t border-white/8 pt-16">
              <div className="flex items-center justify-between">
                <h3 className="text-body-sm font-w480 text-white">Overnight stay</h3>
                <button onClick={() => setAccommodationModalOpen(true)}
                  className="flex items-center gap-4 rounded-full border border-white/15 px-12 py-6 text-caption text-white/60 transition-all hover:border-[#f5a623]/40 hover:text-[#f5a623]">
                  <BedDouble size={13} /> {selectedAccommodation ? 'Change' : 'Browse'}
                </button>
              </div>
              {selectedAccommodation && (
                <div className="mt-10"><AccommodationCard accommodation={selectedAccommodation} selected /></div>
              )}
            </div>

            {/* Rental car */}
            <div className="mt-16 border-t border-white/8 pt-16">
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-body-sm font-w480 text-white">Rental car</h3>
                <button onClick={() => setRentalCarModalOpen(true)}
                  className="flex items-center gap-4 rounded-full border border-white/15 px-12 py-6 text-caption text-white/60 transition-all hover:border-[#f5a623]/40 hover:text-[#f5a623]">
                  <Car size={13} /> Compare
                </button>
              </div>
              <RentalCarCard rental={{
                pickupLocation: trip.stops[0]?.location ?? trip.destination,
                dropoffLocation: trip.destination,
                pickupDate: format(new Date(trip.startDate), 'yyyy-MM-dd'),
                dropoffDate: format(new Date(trip.endDate), 'yyyy-MM-dd'),
                rentalcarsUrl: buildRentalcarsUrl(
                  trip.stops[0]?.location ?? trip.destination, trip.destination,
                  format(new Date(trip.startDate), 'yyyy-MM-dd'), format(new Date(trip.endDate), 'yyyy-MM-dd')
                ),
                autoeuropeUrl: buildAutoEuropeUrl(
                  trip.stops[0]?.location ?? trip.destination,
                  format(new Date(trip.startDate), 'yyyy-MM-dd'), format(new Date(trip.endDate), 'yyyy-MM-dd')
                ),
              }} />
            </div>
          </aside>
        </div>

        {/* Hidden gems */}
        {trip.hiddenGems?.length > 0 && (
          <div className="relative mt-24 rounded-2xl border border-white/8 bg-white/3 p-16 sm:p-24">
            <div className="flex items-center justify-between mb-16">
              <h3 className="text-body-sm font-w480 text-white">Local favourites & hidden spots</h3>
              {!isPremium && (
                <Link to="/pricing" className="flex items-center gap-6 text-caption text-[#f5a623]/70 hover:text-[#f5a623]">
                  <Lock size={12} /> Premium
                </Link>
              )}
            </div>

            {isPremium ? (
              <div className="grid gap-12 grid-cols-2 sm:gap-14 lg:grid-cols-3">
                {trip.hiddenGems.map((gem, i) => {
                  const badgeColor =
                    gem.category === 'restaurant' || gem.category === 'café' || gem.category === 'bar' ? '#f5a623'
                    : gem.category === 'viewpoint' || gem.category === 'nature' ? '#4ade80'
                    : gem.category === 'culture' || gem.category === 'historic' ? '#a78bfa'
                    : '#60a5fa';
                  return (
                    <motion.div key={gem.name} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }} transition={{ delay: i * 0.06, duration: 0.3 }}
                      className="overflow-hidden rounded-xl border border-white/8 transition-colors hover:border-[#f5a623]/25">
                      <DestinationImage query={`${gem.name}, ${trip.destination}`} alt={gem.name} className="h-[140px] w-full" />
                      <div className="p-12">
                        <div className="flex items-start justify-between gap-8">
                          <p className="text-body-sm font-w480 text-white leading-tight">{gem.name}</p>
                          <span className="flex-shrink-0 rounded-full px-8 py-2 text-[10px] font-w480 capitalize text-[#080c14]"
                            style={{ backgroundColor: badgeColor }}>
                            {gem.category}
                          </span>
                        </div>
                        {gem.address && <p className="mt-2 text-caption text-white/40 truncate">{gem.address}</p>}
                        <p className="mt-6 text-caption text-white/50">{gem.description}</p>
                        {gem.address && (
                          <a href={buildMapsUrl(gem.address)} target="_blank" rel="noopener noreferrer"
                            className="mt-6 inline-flex items-center gap-4 text-caption text-[#f5a623]/60 hover:text-[#f5a623]">
                            <MapPin size={10} /> Maps
                          </a>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="relative">
                <div className="grid gap-12 select-none sm:grid-cols-2" style={{ filter: 'blur(6px)', pointerEvents: 'none' }}>
                  {trip.hiddenGems.slice(0, 2).map(gem => (
                    <div key={gem.name} className="overflow-hidden rounded-xl border border-white/8">
                      <div className="h-[120px] w-full bg-gradient-to-br from-[#f5a623]/10 via-white/5 to-[#080c14]" />
                      <div className="p-12">
                        <p className="text-body-sm font-w480 text-white">{gem.name}</p>
                        <p className="mt-4 text-caption text-white/50">{gem.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-12 rounded-2xl bg-[#080c14]/70 backdrop-blur-sm">
                  <Lock size={20} className="text-[#f5a623]" />
                  <p className="text-body-sm font-w480 text-white">Hidden gems are a Premium feature</p>
                  <Link to="/pricing" className="rounded-full bg-[#f5a623] px-24 py-10 text-body-sm font-w480 text-[#080c14]">
                    Unlock with Premium
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Highlights & tips */}
        <div className="mt-20 grid gap-12 sm:gap-20 lg:grid-cols-2">
          {trip.highlights?.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.4 }}
              className="rounded-2xl border border-white/8 bg-white/3 p-24">
              <h3 className="mb-16 text-body-sm font-w480 text-white">Trip highlights</h3>
              <ul className="flex flex-col gap-10">
                {trip.highlights.map((h, i) => (
                  <motion.li key={h} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-8 text-caption text-white/60">
                    <span className="mt-1 h-4 w-4 flex-shrink-0 rounded-full bg-[#f5a623]" />
                    {h}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}

          {trip.tips?.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.4 }}
              className="rounded-2xl border border-white/8 bg-white/3 p-24">
              <h3 className="mb-16 text-body-sm font-w480 text-white">Local tips</h3>
              <ul className="flex flex-col gap-10">
                {trip.tips.map((tip, i) => (
                  <motion.li key={tip} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-8 text-caption text-white/60">
                    <span className="mt-1 h-4 w-4 flex-shrink-0 rounded-full bg-[#f5a623]/60" />
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
              className={clsx(
                'flex-shrink-0 rounded-full px-12 py-6 text-caption font-w480 transition-colors',
                accommodationFilter === type
                  ? 'bg-[#f5a623] text-[#080c14]'
                  : 'bg-white/8 text-white/60 border border-white/10 hover:text-white'
              )}>
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
