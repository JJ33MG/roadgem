import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Calendar, ChevronDown, ChevronUp, Wallet, Compass } from 'lucide-react';
import { GlobeView, lookupCoords } from '@/components/display/GlobeView';
import { useTripGeneration } from '@/hooks/useTripGeneration';
import { DateRangePicker } from '@/components/forms/DateRangePicker';
import { BudgetSlider } from '@/components/forms/BudgetSlider';
import { TravelStyleSelector } from '@/components/forms/TravelStyleSelector';
import { DestinationInput } from '@/components/forms/DestinationInput';
import { PaywallModal } from '@/components/utility/PaywallModal';
import type { TravelStyle } from '@/types';

interface GlobeStop { lat: number; lng: number; label: string; }

const LOADING_MESSAGES = [
  'Researching your destination...',
  'Planning your daily itinerary...',
  'Finding hidden gems along the route...',
  'Calculating routes and distances...',
  'Almost ready...',
];

const EXAMPLE_TRIPS = [
  { label: 'Amsterdam → Rome', from: 'Amsterdam', to: 'Rome' },
  { label: 'Lisbon → Barcelona', from: 'Lisbon', to: 'Barcelona' },
  { label: 'Berlin → Prague', from: 'Berlin', to: 'Prague' },
];

export function LandingPage() {
  const navigate = useNavigate();
  const { isLoading, error, limitReached, generateTrip, dismissLimit } = useTripGeneration();

  // Form state
  const [startLocation, setStartLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [budget, setBudget] = useState(1500);
  const [travelStyle, setTravelStyle] = useState<TravelStyle | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Globe state
  const [stops, setStops] = useState<GlobeStop[]>([]);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Parse destinations into globe stops
  useEffect(() => {
    const parts = [startLocation, destination].filter(Boolean);
    const parsed = parts
      .map((p) => { const c = lookupCoords(p); return c ? { ...c, label: p } : null; })
      .filter((s): s is GlobeStop => s !== null);
    setStops(parsed);
  }, [startLocation, destination]);

  // Cycle loading messages
  useEffect(() => {
    if (isLoading) {
      setLoadingMsgIndex(0);
      intervalRef.current = setInterval(() => {
        setLoadingMsgIndex(prev => Math.min(prev + 1, LOADING_MESSAGES.length - 1));
      }, 8000);
    } else {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isLoading]);

  const isValid = startLocation.trim().length > 0 && destination.trim().length > 0 && startDate && endDate && travelStyle;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || !startDate || !endDate || !travelStyle) return;
    const trip = await generateTrip({
      startLocation,
      destination,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      budget,
      travelStyle,
      priorities: [],
      accommodationTypes: ['hotel', 'hostel', 'campsite', 'airbnb'],
    });
    if (trip) {
      navigate(`/trips/${trip.tripId}`, { state: { trip } });
    }
  }

  const loadExample = (from: string, to: string) => {
    setStartLocation(from);
    setDestination(to);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080c14] text-white">

      {/* Globe — full background right side */}
      <div className="absolute inset-0 flex items-center justify-end pointer-events-none select-none">
        <div className="w-full h-full md:w-[60%]">
          <GlobeView stops={stops} autoRotate={stops.length === 0 && !isLoading} />
        </div>
      </div>

      {/* Gradients */}
      <div aria-hidden className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(90deg, #080c14 40%, rgba(8,12,20,0.75) 65%, rgba(8,12,20,0.05) 100%)' }} />
      <div aria-hidden className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(8,12,20,0.6) 0%, transparent 15%, transparent 75%, rgba(8,12,20,0.9) 100%)' }} />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-24 py-20 md:px-40">
        <div className="flex items-center gap-10">
          <div className="h-8 w-8 rounded-full bg-[#f5a623]" />
          <span className="text-heading-sm font-display font-w480 text-white">Routify</span>
        </div>
        <div className="hidden items-center gap-32 md:flex">
          {['Destinations', 'Pricing'].map((item) => (
            <button key={item} onClick={() => navigate(`/${item.toLowerCase()}`)}
              className="text-body-sm text-white/70 transition-colors hover:text-white">{item}</button>
          ))}
        </div>
        <button onClick={() => navigate('/login')}
          className="rounded-full border border-white/20 px-20 py-8 text-body-sm text-white/80 transition-all hover:border-white/40 hover:text-white">
          Log in
        </button>
      </nav>

      {/* Main content */}
      <div className="relative z-10 min-h-[calc(100vh-80px)] flex items-center px-24 md:px-40">
        <div className="w-full max-w-lg">

          {/* Badge */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="mb-24 inline-flex items-center gap-8 rounded-full border border-white/10 bg-white/5 px-16 py-8 backdrop-blur-sm">
            <span className="h-6 w-6 rounded-full bg-[#4ade80] animate-pulse" />
            <span className="font-mono text-caption text-white/70">AI agents · 6× a day</span>
          </motion.div>

          {/* Headline */}
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-32 text-[2.6rem] font-display font-w360 leading-[1.1] text-white sm:text-[3.4rem]">
            Your European<br />road trip in{' '}
            <span className="text-[#f5a623]">30 seconds.</span>
          </motion.h1>

          {/* Search form */}
          <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }} onSubmit={handleSubmit}
            className="rounded-2xl border border-white/10 bg-white/5 p-20 backdrop-blur-md">

            {/* Route row */}
            <div className="mb-16 flex flex-col gap-10 sm:flex-row">
              <div className="flex-1">
                <label className="mb-6 flex items-center gap-6 text-caption text-white/50">
                  <MapPin size={11} className="text-[#f5a623]" /> From
                </label>
                <DestinationInput
                  id="startLocation"
                  label=""
                  placeholder="Departing from..."
                  value={startLocation}
                  onChange={setStartLocation}
                />
              </div>
              <div className="flex-1">
                <label className="mb-6 flex items-center gap-6 text-caption text-white/50">
                  <Search size={11} className="text-[#f5a623]" /> To
                </label>
                <DestinationInput
                  value={destination}
                  onChange={setDestination}
                />
              </div>
            </div>

            {/* Dates row */}
            <div className="mb-16">
              <label className="mb-6 flex items-center gap-6 text-caption text-white/50">
                <Calendar size={11} className="text-[#f5a623]" /> Dates
              </label>
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onChange={({ startDate: s, endDate: e }) => { setStartDate(s); setEndDate(e); }}
              />
            </div>

            {/* Advanced toggle */}
            <button type="button" onClick={() => setShowAdvanced(v => !v)}
              className="mb-16 flex items-center gap-6 text-caption text-white/50 transition-colors hover:text-white/80">
              {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {showAdvanced ? 'Fewer options' : 'More options (budget, travel style)'}
            </button>

            <AnimatePresence>
              {showAdvanced && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                  <div className="mb-16">
                    <label className="mb-6 flex items-center gap-6 text-caption text-white/50">
                      <Wallet size={11} className="text-[#f5a623]" /> Budget
                    </label>
                    <BudgetSlider value={budget} onChange={setBudget} />
                  </div>
                  <div className="mb-16">
                    <label className="mb-6 flex items-center gap-6 text-caption text-white/50">
                      <Compass size={11} className="text-[#f5a623]" /> Travel style
                    </label>
                    <TravelStyleSelector value={travelStyle} onChange={setTravelStyle} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            {error && (
              <div className="mb-12 rounded-xl border border-red-500/30 bg-red-500/10 px-16 py-10">
                <p className="text-caption text-red-400">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={!isValid || isLoading}
              className="w-full rounded-full bg-[#f5a623] py-14 text-body-sm font-w480 text-[#080c14] transition-all hover:bg-[#f5a623]/90 disabled:opacity-40 disabled:cursor-not-allowed">
              {isLoading ? (
                <span className="flex items-center justify-center gap-10">
                  <span className="h-4 w-4 rounded-full border-2 border-[#080c14]/30 border-t-[#080c14] animate-spin" />
                  Building your itinerary...
                </span>
              ) : 'Plan my trip →'}
            </button>

            {/* Loading message */}
            <AnimatePresence>
              {isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="mt-12 flex h-5 items-center justify-center overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.p key={loadingMsgIndex}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }}
                      className="text-caption text-white/50 text-center">
                      {LOADING_MESSAGES[loadingMsgIndex]}
                    </motion.p>
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.form>

          {/* Example chips */}
          {!isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
              className="mt-16 flex flex-wrap items-center gap-8">
              <span className="text-caption text-white/40">Try:</span>
              {EXAMPLE_TRIPS.map((t) => (
                <button key={t.label} onClick={() => loadExample(t.from, t.to)}
                  className="rounded-full border border-white/15 bg-white/5 px-14 py-6 text-caption text-white/70 transition-all hover:border-[#f5a623]/50 hover:text-white">
                  {t.label}
                </button>
              ))}
            </motion.div>
          )}

          {/* Stats */}
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
            className="mt-16 text-caption text-white/35">
            Free to use · AI-powered · 110+ European destinations
          </motion.p>
        </div>
      </div>

      <PaywallModal isOpen={limitReached} onClose={dismissLimit}
        title="Trip limit reached"
        message="The free plan includes 1 saved road trip. Upgrade to premium for unlimited trips." />
    </div>
  );
}
