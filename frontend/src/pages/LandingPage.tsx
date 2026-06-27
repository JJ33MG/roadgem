import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Calendar, X } from 'lucide-react';
import { GlobeView, lookupCoords } from '@/components/display/GlobeView';
import { useTripGeneration } from '@/hooks/useTripGeneration';
import { PaywallModal } from '@/components/utility/PaywallModal';
import { AccommodationTypeSelector } from '@/components/forms/AccommodationTypeSelector';
import { DateRangePicker } from '@/components/forms/DateRangePicker';
import type { TravelStyle, AccommodationType } from '@/types';

// ─── City autocomplete input ───────────────────────────────────────────────────

const CITY_LIST = [
  'Amsterdam', 'Athens', 'Amalfi', 'Antwerp', 'Alicante',
  'Barcelona', 'Berlin', 'Brussels', 'Budapest', 'Bologna', 'Bern', 'Bruges', 'Bucharest', 'Belgrade',
  'Copenhagen', 'Cologne', 'Cluj-Napoca', 'Corfu',
  'Dubrovnik', 'Dublin', 'Düsseldorf',
  'Edinburgh', 'Eindhoven',
  'Florence', 'Frankfurt',
  'Ghent', 'Geneva', 'Gothenburg', 'Granada',
  'Hamburg', 'Helsinki',
  'Istanbul',
  'Krakow', 'Kotor',
  'Lisbon', 'Ljubljana', 'London', 'Leuven', 'Lyon',
  'Madrid', 'Milan', 'Malaga', 'Marseille', 'Munich',
  'Naples', 'Nice',
  'Oslo',
  'Palermo', 'Paris', 'Porto', 'Prague',
  'Reykjavik', 'Riga', 'Rome', 'Rotterdam',
  'Santorini', 'Sarajevo', 'Seville', 'Sintra', 'Sofia', 'Split', 'Stockholm',
  'Tallinn', 'Thessaloniki',
  'Valencia', 'Venice', 'Vienna', 'Vilnius',
  'Warsaw', 'Zagreb', 'Zurich',
];

function CityInput({ id, placeholder, value, onChange }: {
  id: string; placeholder: string; value: string; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = value.length >= 1
    ? CITY_LIST.filter(c => c.toLowerCase().startsWith(value.toLowerCase()) && c.toLowerCase() !== value.toLowerCase()).slice(0, 5)
    : [];

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex items-center gap-8 rounded-xl border border-white/15 bg-white/8 px-12 py-10 transition-colors focus-within:border-[#f5a623]/50">
        <input
          id={id}
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          autoComplete="off"
          spellCheck={false}
          className="flex-1 bg-transparent text-body-sm text-white placeholder-white/35 outline-none"
        />
        {value && (
          <button type="button" onClick={() => { onChange(''); setOpen(false); }} className="flex-shrink-0 text-white/30 hover:text-white/70">
            <X size={12} />
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-4 w-full overflow-hidden rounded-xl border border-white/10 bg-[#0e1525] shadow-2xl">
          {filtered.map(city => (
            <li key={city}>
              <button type="button"
                onMouseDown={e => { e.preventDefault(); onChange(city); setOpen(false); }}
                className="w-full px-14 py-10 text-left text-body-sm text-white/75 transition-colors hover:bg-white/8 hover:text-white">
                {city}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DURATION_OPTIONS = [
  { label: '3 days', value: 3 },
  { label: '5 days', value: 5 },
  { label: '7 days', value: 7 },
  { label: '14 days', value: 14 },
];

const BUDGET_OPTIONS = [
  { label: 'Budget', value: 800, desc: '< €800' },
  { label: 'Comfort', value: 1800, desc: '€800–2k' },
  { label: 'Luxury', value: 4000, desc: '> €2k' },
];

const STYLE_OPTIONS: { label: string; value: TravelStyle; emoji: string }[] = [
  { label: 'Adventure', value: 'adventure', emoji: '🏔' },
  { label: 'Culture', value: 'culture', emoji: '🎭' },
  { label: 'Relaxed', value: 'relaxation', emoji: '🌅' },
  { label: 'Food', value: 'food', emoji: '🍷' },
];

const QUICK_ROUTES = [
  { label: 'Amsterdam → Rome', from: 'Amsterdam', to: 'Rome' },
  { label: 'Lisbon → Barcelona', from: 'Lisbon', to: 'Barcelona' },
  { label: 'Berlin → Prague', from: 'Berlin', to: 'Prague' },
];

const LOADING_MESSAGES = [
  'Zooming in on your route...',
  'Discovering hidden gems along the way...',
  'Planning your day-by-day itinerary...',
  'Finding the best accommodation...',
  'Almost ready — finalising your trip...',
];

interface GlobeStop { lat: number; lng: number; label: string }
type Phase = 'form' | 'zoom';

// ─── Component ────────────────────────────────────────────────────────────────

export function LandingPage() {
  const navigate = useNavigate();
  const { isLoading, error, limitReached, generateTrip, dismissLimit } = useTripGeneration();

  // Form state
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [duration, setDuration] = useState(7);
  const [budget, setBudget] = useState(1800);
  const [travelStyle, setTravelStyle] = useState<TravelStyle | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [accommodation, setAccommodation] = useState<AccommodationType[]>(['hotel', 'hostel', 'campsite', 'airbnb']);

  // Globe
  const [stops, setStops] = useState<GlobeStop[]>([]);
  const [phase, setPhase] = useState<Phase>('form');
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Live globe stops from from/to inputs
  useEffect(() => {
    const parts = [from, to].filter(Boolean);
    const parsed = parts.map(p => { const c = lookupCoords(p); return c ? { ...c, label: p } : null; }).filter((s): s is GlobeStop => s !== null);
    setStops(parsed);
  }, [from, to]);

  // Loading message rotation
  useEffect(() => {
    if (isLoading) {
      setLoadingMsgIdx(0);
      intervalRef.current = setInterval(() => setLoadingMsgIdx(i => Math.min(i + 1, LOADING_MESSAGES.length - 1)), 7000);
    } else {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isLoading]);

  const isValid = from.trim() && to.trim() && travelStyle;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || !travelStyle) return;

    // Cinematic transition first — globe takes over immediately
    setPhase('zoom');

    const sd = startDate ?? new Date();
    const ed = new Date(sd);
    ed.setDate(ed.getDate() + duration);

    const trip = await generateTrip({
      startLocation: from,
      destination: to,
      startDate: sd.toISOString(),
      endDate: ed.toISOString(),
      budget,
      travelStyle,
      priorities: [],
      accommodationTypes: accommodation,
    });

    if (trip) {
      navigate(`/trips/${trip.tripId}`, { state: { trip } });
    } else {
      setPhase('form');
    }
  }

  // ─── ZOOM phase ────────────────────────────────────────────────────────────
  if (phase === 'zoom') {
    return (
      <div className="fixed inset-0 z-50 bg-[#080c14]">
        {/* Full-screen globe */}
        <div className="absolute inset-0">
          <GlobeView stops={stops} autoRotate={false} />
        </div>

        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(8,12,20,0.7) 100%)' }} />

        {/* Logo top-left */}
        <div className="absolute top-20 left-24 z-10 flex items-center gap-10">
          <div className="h-8 w-8 rounded-full bg-[#f5a623]" />
          <span className="font-display text-heading-sm font-w480 text-white">Routify</span>
        </div>

        {/* Center overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="text-center"
          >
            <p className="mb-8 font-mono text-caption uppercase tracking-widest text-[#f5a623]">
              {from} → {to}
            </p>
            <h2 className="mb-32 text-2xl font-display font-w360 text-white">
              Your {duration}-day journey
            </h2>

            {/* Animated route path indicator */}
            <div className="mb-32 flex items-center justify-center gap-12">
              <div className="flex items-center gap-8">
                <div className="h-3 w-3 rounded-full bg-[#f5a623]" />
                <span className="text-caption text-white/70">{from}</span>
              </div>
              <div className="h-px w-40 bg-gradient-to-r from-[#f5a623] to-[#f5a623]/30" />
              <motion.div
                className="h-2 w-2 rounded-full bg-[#f5a623]"
                animate={{ x: [0, 40, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div className="h-px w-40 bg-gradient-to-r from-[#f5a623]/30 to-[#f5a623]" />
              <div className="flex items-center gap-8">
                <div className="h-3 w-3 rounded-full bg-[#f5a623]" />
                <span className="text-caption text-white/70">{to}</span>
              </div>
            </div>

            {/* Loading message */}
            <div className="h-6 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.p
                  key={loadingMsgIdx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                  className="text-body-sm text-white/60"
                >
                  {LOADING_MESSAGES[loadingMsgIdx]}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Spinner */}
            <div className="mt-24 flex justify-center">
              <div className="h-8 w-8 rounded-full border-2 border-white/10 border-t-[#f5a623] animate-spin" />
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ─── FORM phase ────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080c14] text-white">

      {/* Globe background */}
      <div className="absolute inset-0 flex items-center justify-end pointer-events-none select-none">
        <div className="w-full h-full md:w-[58%]">
          <GlobeView stops={stops} autoRotate={stops.length === 0} />
        </div>
      </div>

      {/* Gradient overlays */}
      <div aria-hidden className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(90deg, #080c14 42%, rgba(8,12,20,0.8) 62%, rgba(8,12,20,0.05) 100%)' }} />
      <div aria-hidden className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(8,12,20,0.5) 0%, transparent 18%, transparent 75%, rgba(8,12,20,1) 100%)' }} />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-24 py-20 md:px-40">
        <div className="flex items-center gap-10">
          <div className="h-8 w-8 rounded-full bg-[#f5a623]" />
          <span className="font-display text-heading-sm font-w480 text-white">Routify</span>
        </div>
        <div className="hidden items-center gap-32 md:flex">
          {['Destinations', 'Pricing'].map(item => (
            <button key={item} onClick={() => navigate(`/${item.toLowerCase()}`)}
              className="text-body-sm text-white/60 transition-colors hover:text-white">{item}</button>
          ))}
        </div>
        <button onClick={() => navigate('/login')}
          className="rounded-full border border-white/20 px-20 py-8 text-body-sm text-white/70 transition-all hover:border-white/40 hover:text-white">
          Log in
        </button>
      </nav>

      {/* Hero */}
      <div className="relative z-10 min-h-[calc(100vh-80px)] flex items-center px-24 md:px-40">
        <div className="w-full max-w-[520px]">

          {/* Live badge */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="mb-24 inline-flex items-center gap-8 rounded-full border border-white/10 bg-white/5 px-14 py-6 backdrop-blur-sm">
            <span className="h-5 w-5 rounded-full bg-[#4ade80] animate-pulse" />
            <span className="font-mono text-caption text-white/60">AI agents · 6× a day</span>
          </motion.div>

          {/* Headline */}
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-40 font-display leading-[1.08]"
            style={{ fontSize: 'clamp(2.4rem, 5vw, 3.6rem)', fontWeight: 360 }}>
            Your European road trip<br />
            in <span className="text-[#f5a623]">30 seconds.</span>
          </motion.h1>

          {/* ─── Search Form ─── */}
          <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }} onSubmit={handleSubmit}>

            {/* From / To */}
            <div className="mb-12 grid grid-cols-2 gap-8">
              <div>
                <label className="mb-4 block text-[11px] uppercase tracking-widest text-white/40">From</label>
                <CityInput id="from" placeholder="e.g. Amsterdam" value={from} onChange={setFrom} />
              </div>
              <div>
                <label className="mb-4 block text-[11px] uppercase tracking-widest text-white/40">To</label>
                <CityInput id="to" placeholder="e.g. Rome" value={to} onChange={setTo} />
              </div>
            </div>

            {/* Duration pills */}
            <div className="mb-12">
              <label className="mb-6 block text-[11px] uppercase tracking-widest text-white/40">Duration</label>
              <div className="flex gap-6">
                {DURATION_OPTIONS.map(opt => (
                  <button key={opt.value} type="button" onClick={() => setDuration(opt.value)}
                    className={`flex-1 rounded-full py-8 text-caption font-w480 transition-all ${
                      duration === opt.value
                        ? 'bg-[#f5a623] text-[#080c14]'
                        : 'border border-white/15 bg-white/5 text-white/60 hover:border-white/30 hover:text-white'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Budget tier */}
            <div className="mb-12">
              <label className="mb-6 block text-[11px] uppercase tracking-widest text-white/40">Budget</label>
              <div className="flex gap-6">
                {BUDGET_OPTIONS.map(opt => (
                  <button key={opt.value} type="button" onClick={() => setBudget(opt.value)}
                    className={`flex-1 rounded-xl py-10 text-center transition-all ${
                      budget === opt.value
                        ? 'bg-[#f5a623]/15 border border-[#f5a623] text-[#f5a623]'
                        : 'border border-white/10 bg-white/5 text-white/60 hover:border-white/25 hover:text-white'
                    }`}>
                    <div className="text-body-sm font-w480">{opt.label}</div>
                    <div className="text-[10px] text-current opacity-60">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Travel style */}
            <div className="mb-16">
              <label className="mb-6 block text-[11px] uppercase tracking-widest text-white/40">Travel style</label>
              <div className="flex gap-6">
                {STYLE_OPTIONS.map(opt => (
                  <button key={opt.value} type="button" onClick={() => setTravelStyle(opt.value)}
                    className={`flex-1 rounded-xl py-10 text-center transition-all ${
                      travelStyle === opt.value
                        ? 'bg-[#f5a623]/15 border border-[#f5a623] text-[#f5a623]'
                        : 'border border-white/10 bg-white/5 text-white/60 hover:border-white/25 hover:text-white'
                    }`}>
                    <div className="text-base">{opt.emoji}</div>
                    <div className="text-[11px] font-w480">{opt.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced toggle */}
            <button type="button" onClick={() => setShowAdvanced(v => !v)}
              className="mb-12 flex items-center gap-6 text-caption text-white/40 transition-colors hover:text-white/70">
              {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {showAdvanced ? 'Fewer options' : 'More options'}
            </button>

            <AnimatePresence>
              {showAdvanced && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }} className="mb-12 overflow-hidden space-y-12">
                  <div>
                    <label className="mb-6 flex items-center gap-5 text-[11px] uppercase tracking-widest text-white/40">
                      <Calendar size={9} className="text-[#f5a623]" /> Start date (optional)
                    </label>
                    <DateRangePicker
                      startDate={startDate}
                      endDate={null}
                      onChange={({ startDate: s }) => setStartDate(s)}
                    />
                  </div>
                  <div>
                    <label className="mb-6 block text-[11px] uppercase tracking-widest text-white/40">Accommodation</label>
                    <AccommodationTypeSelector value={accommodation} onChange={setAccommodation} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            {error && phase === 'form' && (
              <div className="mb-12 rounded-xl border border-red-500/30 bg-red-500/10 px-14 py-10">
                <p className="text-caption text-red-400">{error}</p>
              </div>
            )}

            {/* CTA */}
            <motion.button type="submit" disabled={!isValid || isLoading}
              whileHover={{ scale: isValid && !isLoading ? 1.02 : 1 }}
              whileTap={{ scale: 0.98 }}
              className="w-full rounded-full bg-[#f5a623] py-16 text-body-sm font-w480 text-[#080c14] transition-all hover:bg-[#f5a623]/90 disabled:opacity-35 disabled:cursor-not-allowed shadow-[0_0_40px_rgba(245,166,35,0.25)]">
              Plan my trip →
            </motion.button>
          </motion.form>

          {/* Quick routes */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            className="mt-16 flex flex-wrap items-center gap-8">
            <span className="text-caption text-white/30">Try:</span>
            {QUICK_ROUTES.map(r => (
              <button key={r.label} onClick={() => { setFrom(r.from); setTo(r.to); }}
                className="rounded-full border border-white/12 bg-white/4 px-12 py-5 text-caption text-white/55 transition-all hover:border-[#f5a623]/40 hover:text-white/90">
                {r.label}
              </button>
            ))}
          </motion.div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="mt-12 text-caption text-white/25">
            Free · No account needed · 110+ European destinations
          </motion.p>
        </div>
      </div>

      <PaywallModal isOpen={limitReached} onClose={dismissLimit}
        title="Trip limit reached"
        message="The free plan includes 1 saved road trip. Upgrade to premium for unlimited trips." />
    </div>
  );
}
