import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Compass, Map, Sparkles, Wallet, Fuel, ArrowRight, Star, MapPin, Clock, ChevronDown } from 'lucide-react';

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI-generated itineraries',
    description: 'Claude researches your destination and builds a day-by-day plan tailored to your style.',
  },
  {
    icon: Map,
    title: 'Optimised routes',
    description: 'Get the smartest order of stops, with live fuel and parking info along the way.',
  },
  {
    icon: Wallet,
    title: 'Budget-aware planning',
    description: 'Every recommendation respects the budget you set — no surprises.',
  },
  {
    icon: Compass,
    title: 'Hidden gems',
    description: 'Discover off-the-beaten-path spots researched daily by our AI agents.',
  },
  {
    icon: Fuel,
    title: 'Live fuel prices',
    description: 'Fuel costs across the EU, updated every 4 hours, factored into your total.',
  },
  {
    icon: Star,
    title: 'Curated stays',
    description: 'Hotels, hostels and campsites hand-matched to your travel style and budget.',
  },
];

const FLOATING_CARDS = [
  { city: 'Lisbon', country: 'Portugal', days: 5, emoji: '🏙️', top: '12%', left: '4%', delay: 0 },
  { city: 'Amalfi', country: 'Italy', days: 7, emoji: '🌊', top: '8%', right: '6%', delay: 0.4 },
  { city: 'Barcelona', country: 'Spain', days: 4, emoji: '🏛️', top: '55%', left: '2%', delay: 0.8 },
  { city: 'Bruges', country: 'Belgium', days: 3, emoji: '🏰', top: '60%', right: '3%', delay: 1.2 },
  { city: 'Santorini', country: 'Greece', days: 6, emoji: '🌅', top: '30%', left: '7%', delay: 0.6 },
  { city: 'Porto', country: 'Portugal', days: 4, emoji: '🍷', top: '35%', right: '8%', delay: 1.0 },
];

const DESTINATIONS = [
  'Lisbon', 'Barcelona', 'Amalfi Coast', 'Bruges', 'Porto', 'Santorini',
  'Cinque Terre', 'Dublin', 'Prague', 'Vienna', 'Seville', 'Nice',
  'Amsterdam', 'Copenhagen', 'Edinburgh', 'Budapest', 'Dubrovnik', 'Valletta',
];

const STATS = [
  { value: '30 sec', label: 'to generate a full trip' },
  { value: '50+', label: 'destinations supported' },
  { value: '100%', label: 'personalised to you' },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Tell us your plans',
    description: 'Destination, dates, budget and travel style — takes less than a minute.',
    tag: 'Input',
  },
  {
    step: '02',
    title: 'AI does the research',
    description: 'Agents scan hidden gems, fuel prices, weather and accommodation options.',
    tag: 'Research',
  },
  {
    step: '03',
    title: 'Review your itinerary',
    description: 'A full day-by-day plan with an interactive map and cost breakdown.',
    tag: 'Plan',
  },
  {
    step: '04',
    title: 'Save & book',
    description: 'Save your trip, share it with friends, and book hotels in one click.',
    tag: 'Book',
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

function FloatingCard({
  city, country, days, emoji, top, left, right, delay,
}: {
  city: string; country: string; days: number; emoji: string;
  top: string; left?: string; right?: string; delay: number;
}) {
  return (
    <motion.div
      className="absolute hidden lg:flex flex-col gap-4 glass-panel !p-12 min-w-[140px]"
      style={{ top, left, right }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: [0, -8, 0] }}
      transition={{
        opacity: { delay, duration: 0.6 },
        y: { delay, duration: 3.2 + delay * 0.4, repeat: Infinity, ease: 'easeInOut' },
      }}
    >
      <span className="text-xl">{emoji}</span>
      <div>
        <p className="text-body-sm font-w480 text-starlight leading-tight">{city}</p>
        <p className="text-caption text-silver">{country}</p>
      </div>
      <div className="flex items-center gap-4 text-caption text-mercury-blue">
        <Clock size={10} />
        <span>{days} days</span>
      </div>
    </motion.div>
  );
}

export function LandingPage() {
  const reduced = useReducedMotion();

  return (
    <div className="overflow-x-hidden">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-deep-space text-center">
        {/* Background glows */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-10%] h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-mercury-blue/15 blur-[140px]"
          animate={reduced ? {} : { scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -bottom-1/4 -right-1/4 h-[600px] w-[600px] rounded-full bg-plum/15 blur-[160px]"
          animate={reduced ? {} : { scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />

        {/* Floating destination cards */}
        {FLOATING_CARDS.map((card) => (
          <FloatingCard key={card.city} {...card} />
        ))}

        {/* Hero content */}
        <motion.div
          className="section relative z-10 flex flex-col items-center gap-16 sm:gap-24 py-32 sm:py-40"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          {/* Eyebrow */}
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-8 rounded-full border border-mercury-blue/30 bg-mercury-blue/10 px-16 py-6"
          >
            <MapPin size={12} className="text-mercury-blue" />
            <span className="font-mono text-caption uppercase tracking-widest text-mercury-blue">
              AI Road Trip Planner
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="relative max-w-4xl text-3xl sm:text-display font-display font-w360 leading-[1.05] text-starlight"
          >
            {/* Animated gradient glow behind headline */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 rounded-full blur-[80px] opacity-40"
              style={{
                background: 'radial-gradient(ellipse at center, #af50ff 0%, #7f56d9 40%, transparent 70%)',
                animation: 'hero-glow 5s ease-in-out infinite',
              }}
            />
            Discover roads{' '}
            <span className="text-gradient-accent">less travelled.</span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="max-w-lg text-base sm:text-subheading text-silver px-4 sm:px-0"
          >
            Tell us where you want to go. Our AI handles everything — routes, hidden gems,
            hotels, weather and a full day-by-day itinerary.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center gap-12"
          >
            <div className="flex flex-col items-center gap-12 sm:flex-row">
              <Link to="/plan">
                <motion.span
                  className="btn-primary inline-flex items-center gap-8"
                  style={{ padding: '18px 32px' }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Plan my trip <ArrowRight size={16} />
                </motion.span>
              </Link>
              <Link to="/dashboard" className="btn-header inline-flex items-center gap-8">
                See example trips
              </Link>
            </div>
            <p className="text-caption text-silver/60">No signup required</p>
          </motion.div>

          {/* Stats */}
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="mt-8 flex flex-wrap justify-center gap-x-40 gap-y-12"
          >
            {STATS.map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-2">
                <span className="font-display text-heading-sm font-w480 text-starlight">{s.value}</span>
                <span className="text-caption text-silver">{s.label}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          className="absolute bottom-32 left-1/2 -translate-x-1/2"
          animate={reduced ? {} : { y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown size={20} className="text-silver/40" />
        </motion.div>
      </section>

      {/* ── Destinations marquee ─────────────────────────────────────────── */}
      <div className="border-y border-starlight/[0.07] bg-midnight-slate py-16 overflow-hidden">
        <motion.div
          className="flex gap-32 whitespace-nowrap"
          animate={reduced ? {} : { x: ['0%', '-50%'] }}
          transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
          style={{ width: 'max-content' }}
        >
          {[...DESTINATIONS, ...DESTINATIONS].map((dest, i) => (
            <span key={i} className="flex items-center gap-10 font-mono text-caption uppercase tracking-widest text-silver">
              <span className="h-[3px] w-[3px] rounded-full bg-mercury-blue" />
              {dest}
            </span>
          ))}
        </motion.div>
      </div>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="section py-56 sm:py-96">
        <motion.div
          className="mb-56 max-w-xl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-serif-accent mb-12 text-heading-sm">Built for explorers</p>
          <h2 className="text-heading font-display font-w360 text-starlight">
            Everything you need to hit the road
          </h2>
          <p className="mt-16 text-body text-silver">
            From the first spark of inspiration to a fully booked itinerary — no spreadsheets,
            no endless browser tabs.
          </p>
        </motion.div>

        <motion.div
          className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
        >
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              whileHover={{ y: -4 }}
              className={`card flex flex-col gap-16 p-28 hover:border-mercury-blue/40 hover:bg-starlight/[0.05] ${
                i === 0 ? 'lg:col-span-2 lg:flex-row lg:items-start lg:gap-24' : ''
              }`}
            >
              <div className="flex h-40 w-40 flex-shrink-0 items-center justify-center rounded-full bg-mercury-blue/10">
                <f.icon size={20} className="text-mercury-blue" />
              </div>
              <div>
                <h3 className="text-heading-sm font-display font-w480 text-starlight">{f.title}</h3>
                <p className="mt-8 text-body-sm text-silver">{f.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="section py-56 sm:py-96">
        <motion.div
          className="mb-56"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-serif-accent mb-12 text-heading-sm">Simple by design</p>
          <h2 className="text-heading font-display font-w360 text-starlight">How it works</h2>
        </motion.div>

        <motion.div
          className="relative grid gap-1 sm:grid-cols-2 lg:grid-cols-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
        >
          {/* Connector line */}
          <div
            aria-hidden
            className="absolute left-0 top-[52px] hidden h-px w-full bg-gradient-to-r from-transparent via-mercury-blue/20 to-transparent lg:block"
          />
          {HOW_IT_WORKS.map((item) => (
            <motion.div
              key={item.step}
              className="card relative flex flex-col gap-16 hover:border-mercury-blue/40"
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              whileHover={{ y: -4 }}
            >
              <div className="flex items-center justify-between">
                <span className="flex h-36 w-36 items-center justify-center rounded-full border border-mercury-blue/30 bg-mercury-blue/10 font-mono text-caption text-mercury-blue">
                  {item.step}
                </span>
                <span className="rounded-full bg-starlight/5 px-10 py-3 font-mono text-caption uppercase tracking-wider text-silver">
                  {item.tag}
                </span>
              </div>
              <h3 className="text-heading-sm font-display font-w480 text-starlight">{item.title}</h3>
              <p className="text-body-sm text-silver">{item.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── CTA band ─────────────────────────────────────────────────────── */}
      <section className="section py-56 sm:py-96">
        <motion.div
          className="relative overflow-hidden rounded-container border border-mercury-blue/20 px-20 py-48 sm:px-32 sm:py-64 text-center"
          style={{
            background: 'linear-gradient(160deg, rgba(175,80,255,0.15) 0%, rgba(127,86,217,0.08) 40%, rgba(9,9,9,0) 70%)',
          }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
        >
          {/* Glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 h-[300px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-mercury-blue/20 blur-[100px]"
          />

          <p className="text-serif-accent relative mb-16 text-heading-sm">One trip, fully planned</p>
          <h2 className="relative max-w-xl mx-auto text-heading font-display font-w360 text-starlight">
            Ready for your next adventure?
          </h2>
          <p className="relative mt-16 text-body text-silver max-w-sm mx-auto">
            Join explorers already using Roadgem to discover Europe — one road at a time.
          </p>
          <div className="relative mt-32 flex flex-col items-center gap-12 sm:flex-row sm:justify-center">
            <Link to="/plan">
              <motion.span
                className="btn-primary inline-flex items-center gap-8"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                Plan my trip — it's free <ArrowRight size={16} />
              </motion.span>
            </Link>
            <Link to="/signup" className="btn-header">
              Create account
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
