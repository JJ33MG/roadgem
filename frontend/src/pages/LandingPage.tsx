import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Sparkles, Map, Wallet, Compass, Gem, Star, ChevronRight } from 'lucide-react';
import { DestinationImage } from '@/components/display/DestinationImage';

const POPULAR_DESTINATIONS = [
  { name: 'Lisbon', country: 'Portugal', query: 'Lisbon Portugal' },
  { name: 'Amalfi Coast', country: 'Italy', query: 'Amalfi Coast Italy' },
  { name: 'Santorini', country: 'Greece', query: 'Santorini Greece' },
  { name: 'Bruges', country: 'Belgium', query: 'Bruges Belgium' },
  { name: 'Barcelona', country: 'Spain', query: 'Barcelona Spain' },
  { name: 'Dubrovnik', country: 'Croatia', query: 'Dubrovnik Croatia' },
];

const FEATURES = [
  { icon: Sparkles, title: 'AI itinerary', desc: 'Full day-by-day plan in 30 seconds, tailored to your style and budget.', color: '#af50ff' },
  { icon: Map, title: 'Optimised routes', desc: 'Smart stop order with live fuel costs and driving times.', color: '#7f56d9' },
  { icon: Gem, title: 'Hidden gems', desc: 'Off-the-beaten-path spots researched daily by our AI agents.', color: '#af50ff' },
  { icon: Wallet, title: 'Budget-aware', desc: 'Every recommendation stays within the budget you set.', color: '#7f56d9' },
  { icon: Compass, title: 'Curated stays', desc: 'Hotels, hostels and campsites matched to your travel style.', color: '#af50ff' },
  { icon: Star, title: 'Live weather', desc: 'Day-by-day forecast factored into your activities.', color: '#7f56d9' },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Pick your destination', desc: 'Tell us where you want to go, your dates and travel style.' },
  { step: '02', title: 'AI does the research', desc: 'Claude scans hidden gems, fuel prices, weather and stays.' },
  { step: '03', title: 'Review your plan', desc: 'A full interactive itinerary with map, costs and bookings.' },
  { step: '04', title: 'Hit the road', desc: 'Save your trip, share it and book everything in one click.' },
];

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

export function LandingPage() {
  const reduced = useReducedMotion();

  return (
    <div className="overflow-x-hidden bg-white text-[#0d0d14]">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <DestinationImage
          query="Amalfi Coast Italy road scenic"
          alt="European road trip"
          className="absolute inset-0 w-full h-full"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 40%, rgba(255,255,255,0) 65%, rgba(255,255,255,1) 100%)' }}
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.2) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)' }}
        />

        <motion.div
          className="relative z-10 section text-center flex flex-col items-center gap-20"
          style={{ paddingTop: '20vh', paddingBottom: '15vh' }}
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 px-16 py-8"
          >
            <Sparkles size={12} className="text-white" />
            <span className="font-mono text-caption uppercase tracking-widest text-white">AI Road Trip Planner</span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="max-w-3xl text-4xl sm:text-display font-display font-w360 leading-[1.05] text-white"
            style={{ textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}
          >
            Discover roads{' '}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 30%, #e1bdff 100%)' }}>
              less travelled.
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="max-w-md text-base sm:text-lg text-white/85 px-4"
            style={{ textShadow: '0 1px 8px rgba(0,0,0,0.3)' }}
          >
            Tell us where you want to go. AI handles routes, hidden gems, hotels and a full day-by-day itinerary — in 30 seconds.
          </motion.p>

          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center gap-12 sm:flex-row"
          >
            <Link to="/plan">
              <motion.span
                className="inline-flex items-center gap-8 rounded-full bg-mercury-blue px-32 py-16 text-base font-w480 text-white transition-all hover:bg-mercury-blue/90"
                style={{ boxShadow: '0 4px 24px rgba(175,80,255,0.5)' }}
                whileHover={reduced ? {} : { scale: 1.04 }}
                whileTap={reduced ? {} : { scale: 0.97 }}
              >
                Plan my trip — free <ArrowRight size={16} />
              </motion.span>
            </Link>
            <Link
              to="/destinations"
              className="inline-flex items-center gap-8 rounded-full bg-white/15 backdrop-blur-md border border-white/30 px-24 py-16 text-base text-white transition-all hover:bg-white/25"
            >
              Browse destinations <ChevronRight size={14} />
            </Link>
          </motion.div>

          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.4 }}
            className="flex flex-wrap justify-center gap-x-32 gap-y-8"
          >
            {[['30 sec', 'to generate'], ['110+', 'destinations'], ['Free', 'to use']].map(([val, label]) => (
              <div key={label} className="text-center">
                <div className="text-xl font-display font-w480 text-white">{val}</div>
                <div className="text-caption text-white/70">{label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── Popular destinations ──────────────────────────────────────────── */}
      <section className="section py-80">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-32 flex items-end justify-between"
        >
          <div>
            <p className="text-caption font-mono uppercase tracking-widest text-mercury-blue mb-8">Popular</p>
            <h2 className="text-heading font-display font-w360 text-[#0d0d14]">Where do you want to go?</h2>
          </div>
          <Link to="/destinations" className="hidden sm:flex items-center gap-8 text-body-sm text-mercury-blue hover:underline">
            All destinations <ChevronRight size={14} />
          </Link>
        </motion.div>

        <motion.div
          className="grid grid-cols-2 gap-12 md:grid-cols-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
        >
          {POPULAR_DESTINATIONS.map((dest, i) => (
            <motion.div
              key={dest.name}
              variants={fadeUp}
              transition={{ duration: 0.4 }}
              className={i === 0 ? 'col-span-2 md:col-span-1' : ''}
            >
              <Link
                to={`/plan?destination=${encodeURIComponent(dest.name + ', ' + dest.country)}`}
                className="dest-card group block"
              >
                <div className={`relative overflow-hidden rounded-2xl ${i === 0 ? 'h-[240px] sm:h-[280px]' : 'h-[180px] sm:h-[220px]'}`}>
                  <DestinationImage query={dest.query} alt={dest.name} className="h-full w-full" />
                  <div
                    aria-hidden
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.65) 100%)' }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-16">
                    <p className="text-body-sm font-w480 text-white">{dest.name}</p>
                    <p className="text-caption text-white/70">{dest.country}</p>
                  </div>
                  <div className="absolute right-12 top-12 flex items-center gap-4 rounded-full bg-white/90 backdrop-blur-sm px-12 py-4 text-caption font-w480 text-[#0d0d14] opacity-0 group-hover:opacity-100 transition-opacity">
                    Plan trip <ArrowRight size={10} />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-16 flex justify-center sm:hidden">
          <Link to="/destinations" className="flex items-center gap-8 text-body-sm text-mercury-blue hover:underline">
            See all destinations <ChevronRight size={14} />
          </Link>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="py-80" style={{ background: '#f7f4ff' }}>
        <div className="section">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-40 max-w-lg"
          >
            <p className="text-caption font-mono uppercase tracking-widest text-mercury-blue mb-8">Built for explorers</p>
            <h2 className="text-heading font-display font-w360 text-[#0d0d14]">Everything in one place</h2>
            <p className="mt-12 text-body text-[#6b6878]">
              From inspiration to a fully booked itinerary — no tabs, no spreadsheets.
            </p>
          </motion.div>

          <motion.div
            className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            {FEATURES.map((f) => (
              <motion.div key={f.title} variants={fadeUp} transition={{ duration: 0.4 }} className="card-light">
                <div
                  className="mb-16 flex h-40 w-40 items-center justify-center rounded-2xl"
                  style={{ background: `${f.color}18` }}
                >
                  <f.icon size={20} style={{ color: f.color }} />
                </div>
                <h3 className="text-heading-sm font-display font-w480 text-[#0d0d14]">{f.title}</h3>
                <p className="mt-8 text-body-sm text-[#6b6878]">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Trip preview ─────────────────────────────────────────────────── */}
      <section className="section py-80">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-40"
        >
          <p className="text-caption font-mono uppercase tracking-widest text-mercury-blue mb-8">See it in action</p>
          <h2 className="text-heading font-display font-w360 text-[#0d0d14]">What your trip looks like</h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="overflow-hidden rounded-[20px] border border-[#ece8f5]"
          style={{ boxShadow: '0 8px 48px rgba(175,80,255,0.10), 0 2px 12px rgba(0,0,0,0.06)' }}
        >
          <div className="border-b border-[#f0ecfa] bg-white px-24 py-20">
            <div className="flex items-center justify-between flex-wrap gap-12">
              <div>
                <h3 className="text-heading-sm font-display font-w360 text-[#0d0d14]">Lisbon → Sintra → Porto</h3>
                <p className="mt-4 text-caption text-[#6b6878]">
                  Jun 14 – Jun 19 · 5 days · <span className="font-w480 text-[#0d0d14]">€620 total</span> · 320 km
                </p>
              </div>
              <span className="flex items-center gap-8 rounded-full bg-[#f0ecfa] px-16 py-8 text-caption font-w480 text-mercury-blue">
                <Sparkles size={11} /> AI generated
              </span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2">
            <div className="border-b sm:border-b-0 sm:border-r border-[#f0ecfa] bg-white p-24">
              <div className="mb-16 flex items-center gap-8">
                <span className="rounded-full bg-mercury-blue px-12 py-4 text-caption font-w480 text-white">Day 1</span>
                <span className="text-caption text-[#6b6878]">Lisbon</span>
              </div>
              {[
                { time: '09:00', slot: 'Morning', activity: 'Pastéis de Belém breakfast', cost: 8 },
                { time: '14:00', slot: 'Afternoon', activity: 'Tram 28 & Alfama district', cost: 12 },
                { time: '20:00', slot: 'Evening', activity: 'Fado dinner in Mouraria', cost: 45 },
              ].map(({ time, slot, activity, cost }) => (
                <div key={slot} className="flex items-center gap-12 rounded-[12px] border border-[#f0ecfa] p-12 mb-8 last:mb-0">
                  <div className="flex h-32 w-32 flex-shrink-0 items-center justify-center rounded-[10px] bg-[#f7f4ff]">
                    <span className="text-[10px] font-mono text-mercury-blue">{time}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-caption font-w480 text-[#0d0d14] truncate">{activity}</p>
                    <p className="text-[11px] text-[#6b6878]">{slot}</p>
                  </div>
                  <span className="flex-shrink-0 text-caption font-w480 text-[#0d0d14]">€{cost}</span>
                </div>
              ))}
            </div>

            <div className="bg-white p-24">
              <div className="mb-16 flex items-center gap-8">
                <Gem size={14} className="text-mercury-blue" />
                <span className="text-body-sm font-w480 text-[#0d0d14]">Hidden gems nearby</span>
              </div>
              {[
                { name: 'LX Factory Market', category: 'market', why: 'Sunday locals-only market' },
                { name: 'Miradouro da Graça', category: 'viewpoint', why: 'Best view, no crowds before 10am' },
                { name: 'Taberna das Flores', category: 'restaurant', why: 'Daily menu, cash only, locals queue' },
              ].map((gem) => {
                const colors: Record<string, string> = { market: '#4ade80', viewpoint: '#60a5fa', restaurant: '#ffb648' };
                return (
                  <div key={gem.name} className="flex items-start gap-12 rounded-[12px] border border-[#f0ecfa] p-12 mb-8 last:mb-0">
                    <span
                      className="mt-1 flex-shrink-0 rounded-full px-8 py-4 text-[10px] font-w480 capitalize text-[#0d0d14]"
                      style={{ backgroundColor: colors[gem.category] ?? '#e5e7eb' }}
                    >
                      {gem.category}
                    </span>
                    <div>
                      <p className="text-caption font-w480 text-[#0d0d14]">{gem.name}</p>
                      <p className="text-[11px] text-[#6b6878]">{gem.why}</p>
                    </div>
                  </div>
                );
              })}
              <Link
                to="/plan"
                className="mt-16 flex w-full items-center justify-center gap-8 rounded-[12px] bg-mercury-blue py-16 text-body-sm font-w480 text-white transition-all hover:bg-mercury-blue/90"
                style={{ boxShadow: '0 4px 16px rgba(175,80,255,0.3)' }}
              >
                Get my own itinerary <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="py-80" style={{ background: '#f7f4ff' }}>
        <div className="section">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-40 text-center"
          >
            <p className="text-caption font-mono uppercase tracking-widest text-mercury-blue mb-8">Simple by design</p>
            <h2 className="text-heading font-display font-w360 text-[#0d0d14]">How it works</h2>
          </motion.div>

          <motion.div
            className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            {HOW_IT_WORKS.map((item, i) => (
              <motion.div
                key={item.step}
                variants={fadeUp}
                transition={{ duration: 0.4 }}
                className="card-light relative"
              >
                {i < HOW_IT_WORKS.length - 1 && (
                  <div aria-hidden className="absolute -right-4 top-10 hidden lg:block">
                    <ChevronRight size={16} className="text-[#d4c8f5]" />
                  </div>
                )}
                <span className="mb-16 block font-mono text-3xl font-w480 text-[#e8e0ff]">{item.step}</span>
                <h3 className="text-heading-sm font-display font-w480 text-[#0d0d14]">{item.title}</h3>
                <p className="mt-8 text-body-sm text-[#6b6878]">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="section py-80">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-[24px] px-24 py-56 sm:px-56 sm:py-72 text-center text-white"
          style={{
            background: 'linear-gradient(135deg, #7f56d9 0%, #af50ff 50%, #c47aff 100%)',
            boxShadow: '0 16px 64px rgba(175,80,255,0.35)',
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'radial-gradient(ellipse at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.15) 0%, transparent 50%)',
            }}
          />
          <p className="relative text-caption font-mono uppercase tracking-widest text-white/70 mb-16">One trip, fully planned</p>
          <h2 className="relative max-w-xl mx-auto text-heading font-display font-w360 text-white sm:text-heading-lg">
            Ready for your next adventure?
          </h2>
          <p className="relative mt-16 text-body text-white/80 max-w-sm mx-auto">
            Join explorers already using RoadGem to discover Europe — one road at a time.
          </p>
          <div className="relative mt-32 flex flex-col items-center gap-12 sm:flex-row sm:justify-center">
            <Link to="/plan">
              <motion.span
                className="inline-flex items-center gap-8 rounded-full bg-white px-32 py-16 text-base font-w480 text-mercury-blue transition-all hover:bg-white/90"
                whileHover={reduced ? {} : { scale: 1.04 }}
                whileTap={reduced ? {} : { scale: 0.97 }}
              >
                Plan my trip — it's free <ArrowRight size={16} />
              </motion.span>
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center gap-8 rounded-full border-2 border-white/30 px-24 py-16 text-base text-white transition-all hover:border-white/60"
            >
              Create account
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
