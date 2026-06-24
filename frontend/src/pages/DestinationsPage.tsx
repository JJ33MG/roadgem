import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Gem, ArrowRight } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

interface DestinationCard {
  slug: string;
  destination: string;
  h1: string;
  metaDescription: string;
  gemCount: number;
  updatedAt: string;
}

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };
const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

export function DestinationsPage() {
  const [destinations, setDestinations] = useState<DestinationCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/destinations/seo')
      .then((res) => setDestinations(res.data))
      .catch(() => setDestinations([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="section py-40 sm:py-64">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-48"
      >
        <div className="mb-12 flex items-center gap-8">
          <MapPin size={14} className="text-mercury-blue" />
          <span className="font-mono text-caption uppercase tracking-widest text-mercury-blue">Destinations</span>
        </div>
        <h1 className="text-heading font-display font-w360 text-starlight sm:text-heading-lg">
          European road trip <span className="text-gradient-accent">destinations</span>
        </h1>
        <p className="mt-16 max-w-xl text-body text-silver">
          Our AI agents research every destination daily — hidden gems, local tips, and the best routes.
          Pick a destination to see what we've found.
        </p>
      </motion.div>

      {loading ? (
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-container bg-graphite/40" />
          ))}
        </div>
      ) : destinations.length === 0 ? (
        <div className="rounded-container border border-lead/40 p-40 text-center">
          <p className="text-body-sm text-silver">No destinations researched yet — agents are on it.</p>
          <Link to="/plan" className="btn-primary mt-20 inline-flex items-center gap-8">
            Plan a trip anyway <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <motion.div
          className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          {destinations.map((dest) => (
            <motion.div key={dest.slug} variants={fadeUp} transition={{ duration: 0.4 }}>
              <Link
                to={`/destinations/${dest.slug}`}
                className="group block rounded-container border border-lead/40 p-20 transition-all hover:border-mercury-blue/40 hover:bg-starlight/[0.03]"
              >
                <div className="flex items-start justify-between gap-12">
                  <div className="min-w-0">
                    <h2 className="text-body-sm font-w480 text-starlight group-hover:text-mercury-blue transition-colors truncate">
                      {dest.destination}
                    </h2>
                    <p className="mt-4 text-caption text-silver line-clamp-2">{dest.metaDescription}</p>
                  </div>
                  <ArrowRight size={16} className="mt-1 flex-shrink-0 text-lead group-hover:text-mercury-blue transition-colors" />
                </div>
                {dest.gemCount > 0 && (
                  <div className="mt-12 flex items-center gap-6 text-caption text-mercury-blue/70">
                    <Gem size={11} />
                    <span>{dest.gemCount} hidden gems researched</span>
                  </div>
                )}
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="mt-64 rounded-container border border-mercury-blue/20 p-32 text-center"
        style={{ background: 'linear-gradient(160deg, rgba(175,80,255,0.1) 0%, rgba(9,9,9,0) 70%)' }}
      >
        <h2 className="text-heading-sm font-display font-w360 text-starlight">
          Don't see your destination?
        </h2>
        <p className="mt-8 text-body-sm text-silver">
          Generate a full AI itinerary for any European city — takes 30 seconds.
        </p>
        <Link to="/plan" className="btn-primary mt-20 inline-flex items-center gap-8">
          Plan my trip <ArrowRight size={14} />
        </Link>
      </motion.div>
    </div>
  );
}
