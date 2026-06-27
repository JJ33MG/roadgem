import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Gem, MapPin, Zap, ChevronRight } from 'lucide-react';
import { GlobeView, lookupCoords } from '@/components/display/GlobeView';

const EXAMPLE_TRIPS = [
  { label: 'Amsterdam → Rome', from: 'Amsterdam', to: 'Rome' },
  { label: 'Lisbon → Barcelona', from: 'Lisbon', to: 'Barcelona' },
  { label: 'Berlin → Prague', from: 'Berlin', to: 'Prague' },
];

const FEATURES = [
  { icon: Zap, label: 'AI itinerary in 30 sec' },
  { icon: Gem, label: 'Hidden gems included' },
  { icon: MapPin, label: '110+ European destinations' },
];

interface GlobeStop {
  lat: number;
  lng: number;
  label: string;
}

export function LandingPage() {
  const [query, setQuery] = useState('');
  const [stops, setStops] = useState<GlobeStop[]>([]);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Parse "A → B" or "A to B" into stops
  const parseStops = (text: string): GlobeStop[] => {
    const parts = text.split(/→|->| to /i).map((s) => s.trim()).filter(Boolean);
    return parts
      .map((p) => {
        const coords = lookupCoords(p);
        return coords ? { ...coords, label: p } : null;
      })
      .filter((s): s is GlobeStop => s !== null);
  };

  useEffect(() => {
    if (query.length > 2) {
      const parsed = parseStops(query);
      if (parsed.length >= 1) setStops(parsed);
    } else {
      setStops([]);
    }
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`/plan?destination=${encodeURIComponent(query)}`);
  };

  const loadExample = (from: string, to: string) => {
    const text = `${from} → ${to}`;
    setQuery(text);
    inputRef.current?.focus();
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080c14] text-white">

      {/* ── Globe — full background ───────────────────────────────────────── */}
      <div className="absolute inset-0 flex items-center justify-end pointer-events-none select-none">
        <div className="w-full h-full md:w-[65%]" style={{ opacity: 0.92 }}>
          <GlobeView stops={stops} autoRotate={stops.length === 0} />
        </div>
      </div>

      {/* Left gradient so text stays readable */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, #080c14 35%, rgba(8,12,20,0.7) 60%, rgba(8,12,20,0.1) 100%)',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(8,12,20,0.5) 0%, transparent 20%, transparent 70%, rgba(8,12,20,0.8) 100%)',
        }}
      />

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-24 py-20 md:px-40">
        <div className="flex items-center gap-10">
          <div className="h-8 w-8 rounded-full bg-[#f5a623]" />
          <span className="text-heading-sm font-display font-w480 text-white">Routify</span>
        </div>

        <div className="hidden items-center gap-32 md:flex">
          {['How it works', 'Hidden gems', 'Pricing'].map((item) => (
            <button key={item} className="text-body-sm text-white/70 transition-colors hover:text-white">
              {item}
            </button>
          ))}
        </div>

        <button
          onClick={() => navigate('/plan')}
          className="rounded-full bg-[#f5a623] px-20 py-8 text-body-sm font-w480 text-[#080c14] transition-all hover:bg-[#f5a623]/90"
        >
          Start planning
        </button>
      </nav>

      {/* ── Hero content ─────────────────────────────────────────────────── */}
      <div className="relative z-10 flex min-h-[calc(100vh-80px)] flex-col justify-center px-24 md:px-40">
        <div className="max-w-xl">

          {/* Live badge */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-24 inline-flex items-center gap-8 rounded-full border border-white/10 bg-white/5 px-16 py-8 backdrop-blur-sm"
          >
            <span className="h-6 w-6 rounded-full bg-[#4ade80] animate-pulse" />
            <span className="font-mono text-caption text-white/70">AI agents · 6× a day</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-32 text-[2.8rem] font-display font-w360 leading-[1.1] text-white sm:text-[3.8rem]"
          >
            Your European<br />
            road trip in{' '}
            <span className="text-[#f5a623]">30<br />seconds.</span>
          </motion.h1>

          {/* Search bar */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            onSubmit={handleSearch}
            className="mb-16"
          >
            <div
              className="flex items-center gap-0 rounded-full border transition-all"
              style={{
                background: 'rgba(255,255,255,0.06)',
                borderColor: focused ? '#f5a623' : 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(12px)',
                boxShadow: focused ? '0 0 0 3px rgba(245,166,35,0.15)' : 'none',
              }}
            >
              <Search size={18} className="ml-20 flex-shrink-0 text-white/40" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Where do you want to go?"
                className="flex-1 bg-transparent px-16 py-16 text-base text-white placeholder-white/40 focus:outline-none"
              />
              <button
                type="submit"
                className="m-6 rounded-full bg-[#f5a623] px-24 py-12 text-body-sm font-w480 text-[#080c14] transition-all hover:bg-[#f5a623]/90 active:scale-95"
              >
                Plan my trip
              </button>
            </div>
          </motion.form>

          {/* Example chips */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="mb-40 flex flex-wrap items-center gap-8"
          >
            <span className="text-caption text-white/40">Try:</span>
            {EXAMPLE_TRIPS.map((t) => (
              <button
                key={t.label}
                onClick={() => loadExample(t.from, t.to)}
                className="rounded-full border border-white/15 bg-white/5 px-14 py-6 text-caption text-white/70 transition-all hover:border-[#f5a623]/50 hover:text-white"
              >
                {t.label}
              </button>
            ))}
          </motion.div>

          {/* Stats + features */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="flex flex-wrap items-center gap-x-24 gap-y-8"
          >
            <span className="text-caption text-white/40">
              Free to use · <span className="text-white/70">Growing daily</span>
            </span>
            <div className="h-4 w-4 rounded-full bg-white/20 hidden sm:block" />
            <div className="flex flex-wrap gap-16">
              {FEATURES.map((f) => (
                <div key={f.label} className="flex items-center gap-6 text-caption text-white/50">
                  <f.icon size={12} className="text-[#f5a623]" />
                  {f.label}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Trip preview panel (appears when stops are detected) ─────────── */}
      <AnimatePresence>
        {stops.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.4 }}
            className="fixed bottom-24 right-24 z-20 w-72 rounded-2xl border border-white/10 p-20"
            style={{ background: 'rgba(10,14,24,0.85)', backdropFilter: 'blur(20px)' }}
          >
            <div className="mb-12 flex items-center gap-8">
              <div className="h-6 w-6 rounded-full bg-[#f5a623]" />
              <span className="text-caption font-w480 text-white">Route detected</span>
            </div>
            <div className="mb-16 space-y-8">
              {stops.map((s, i) => (
                <div key={i} className="flex items-center gap-8">
                  <MapPin size={12} className="flex-shrink-0 text-[#f5a623]" />
                  <span className="text-caption text-white/80">{s.label}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate(`/plan?destination=${encodeURIComponent(query)}`)}
              className="flex w-full items-center justify-center gap-8 rounded-xl bg-[#f5a623] py-12 text-caption font-w480 text-[#080c14] transition-all hover:bg-[#f5a623]/90"
            >
              Generate full itinerary <ChevronRight size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
