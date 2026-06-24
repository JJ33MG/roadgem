import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Gem, ChevronDown, ArrowRight, ExternalLink } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { DestinationImage } from '@/components/display/DestinationImage';
import { LoadingSpinner } from '@/components/utility/LoadingSpinner';

interface DestinationDetail {
  slug: string;
  destination: string;
  title: string;
  metaDescription: string;
  h1: string;
  intro: string;
  topKeywords: string[];
  faq: { question: string; answer: string }[];
  internalLinkSuggestions: string[];
  gems: {
    id: string;
    name: string;
    description: string;
    address: string;
    category: string;
    whyHidden: string;
  }[];
}

function buildMapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

const CATEGORY_COLORS: Record<string, string> = {
  restaurant: '#ffb648',
  café: '#ffb648',
  bar: '#ffb648',
  viewpoint: '#4ade80',
  nature: '#4ade80',
  culture: '#af50ff',
  historic: '#af50ff',
  activity: '#60a5fa',
  market: '#60a5fa',
};

export function DestinationDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<DestinationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    if (!slug) return;
    apiClient.get(`/destinations/seo/${slug}`)
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="section flex justify-center py-80">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="section py-80 text-center">
        <h1 className="text-heading font-display text-starlight">Destination not found</h1>
        <Link to="/destinations" className="btn-primary mt-24 inline-flex items-center gap-8">
          All destinations <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-hidden">
      {/* Hero */}
      <div className="relative h-[280px] sm:h-[400px]">
        <DestinationImage query={data.destination} alt={data.destination} className="h-full w-full" />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ backgroundImage: 'linear-gradient(180deg, rgba(9,9,9,0.1) 0%, rgba(9,9,9,0.8) 60%, rgba(9,9,9,1) 100%)' }}
        />
        <div className="absolute bottom-0 left-0 right-0 section pb-24 sm:pb-40">
          <div className="mb-10 flex items-center gap-6">
            <Link to="/destinations" className="text-caption text-silver hover:text-starlight transition-colors">
              Destinations
            </Link>
            <span className="text-caption text-lead">/</span>
            <span className="text-caption text-starlight">{data.destination}</span>
          </div>
          <h1 className="text-xl sm:text-heading font-display font-w360 text-starlight sm:text-heading-lg">
            {data.h1}
          </h1>
        </div>
      </div>

      <div className="section py-32 sm:py-48">
        <div className="grid gap-32 lg:grid-cols-[1fr_300px]">
          {/* Main content */}
          <div>
            {/* Intro */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-body text-silver leading-relaxed"
            >
              {data.intro}
            </motion.p>

            {/* Plan CTA */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="mt-24"
            >
              <Link
                to={`/plan?destination=${encodeURIComponent(data.destination)}`}
                className="btn-primary inline-flex items-center gap-8"
              >
                Plan a trip to {data.destination.split(',')[0]} <ArrowRight size={14} />
              </Link>
            </motion.div>

            {/* Hidden gems */}
            {data.gems.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="mt-48"
              >
                <div className="mb-20 flex items-center gap-10">
                  <Gem size={16} className="text-mercury-blue" />
                  <h2 className="text-heading-sm font-display font-w360 text-starlight">
                    Hidden gems in {data.destination.split(',')[0]}
                  </h2>
                </div>
                <div className="grid gap-12 sm:grid-cols-2">
                  {data.gems.map((gem, i) => {
                    const color = CATEGORY_COLORS[gem.category] ?? '#454545';
                    return (
                      <motion.div
                        key={gem.id}
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.06, duration: 0.3 }}
                        className="rounded-container border border-starlight/10 p-16 hover:border-mercury-blue/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-8">
                          <p className="text-body-sm font-w480 text-starlight">{gem.name}</p>
                          <span
                            className="flex-shrink-0 rounded-full px-8 py-2 text-[10px] font-w480 capitalize"
                            style={{ backgroundColor: color, color: ['viewpoint','nature','activity','market'].includes(gem.category) ? '#090909' : '#f7f9fa' }}
                          >
                            {gem.category}
                          </span>
                        </div>
                        <p className="mt-6 text-caption text-silver">{gem.description}</p>
                        <p className="mt-4 text-caption italic text-lead/80">{gem.whyHidden}</p>
                        {gem.address && (
                          <a
                            href={buildMapsUrl(gem.address)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-8 inline-flex items-center gap-4 text-caption text-mercury-blue/60 hover:text-mercury-blue"
                          >
                            <MapPin size={10} /> {gem.address}
                          </a>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* FAQ */}
            {data.faq.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="mt-48"
              >
                <h2 className="mb-20 text-heading-sm font-display font-w360 text-starlight">
                  Frequently asked questions
                </h2>
                <div className="flex flex-col gap-4">
                  {data.faq.map((item, i) => (
                    <div key={i} className="rounded-container border border-lead/40">
                      <button
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="flex w-full items-center justify-between gap-12 p-16 text-left"
                      >
                        <span className="text-body-sm font-w480 text-starlight">{item.question}</span>
                        <ChevronDown
                          size={16}
                          className={`flex-shrink-0 text-silver transition-transform ${openFaq === i ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {openFaq === i && (
                        <div className="border-t border-lead/40 px-16 pb-16 pt-12">
                          <p className="text-body-sm text-silver">{item.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="flex flex-col gap-16">
            {/* Related destinations */}
            {data.internalLinkSuggestions.length > 0 && (
              <div className="rounded-container border border-lead/40 p-20">
                <h3 className="mb-14 text-body-sm font-w480 text-starlight">Nearby destinations</h3>
                <div className="flex flex-col gap-8">
                  {data.internalLinkSuggestions.map((dest) => {
                    const relSlug = dest.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    return (
                      <Link
                        key={dest}
                        to={`/destinations/${relSlug}`}
                        className="flex items-center gap-8 text-body-sm text-silver hover:text-starlight transition-colors"
                      >
                        <MapPin size={11} className="text-mercury-blue/60 flex-shrink-0" />
                        {dest}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Keywords (for SEO — hidden visually but in DOM) */}
            {data.topKeywords.length > 0 && (
              <div className="rounded-container border border-lead/40 p-20">
                <h3 className="mb-14 text-body-sm font-w480 text-starlight">Popular searches</h3>
                <div className="flex flex-wrap gap-6">
                  {data.topKeywords.map((kw) => (
                    <span
                      key={kw}
                      className="rounded-full border border-lead/40 px-10 py-4 text-caption text-silver"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Book CTA */}
            <div
              className="rounded-container border border-mercury-blue/20 p-20 text-center"
              style={{ background: 'linear-gradient(160deg, rgba(175,80,255,0.1) 0%, rgba(9,9,9,0) 80%)' }}
            >
              <p className="text-body-sm font-w480 text-starlight">Plan your trip to {data.destination.split(',')[0]}</p>
              <p className="mt-6 text-caption text-silver">Full itinerary in 30 seconds, free.</p>
              <Link
                to={`/plan?destination=${encodeURIComponent(data.destination)}`}
                className="btn-primary mt-16 inline-flex w-full items-center justify-center gap-8"
              >
                Get my itinerary <ArrowRight size={14} />
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
