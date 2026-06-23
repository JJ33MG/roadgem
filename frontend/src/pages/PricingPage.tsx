import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, X, Crown, ArrowRight, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { apiClient } from '@/lib/apiClient';
import { useManageSubscription } from '@/hooks/useManageSubscription';
import { useState } from 'react';

const FREE_FEATURES = [
  { text: '1 saved road trip', included: true },
  { text: 'Personalised itinerary', included: true },
  { text: 'Interactive route map', included: true },
  { text: 'Weather forecast', included: true },
  { text: 'Accommodation search', included: true },
  { text: 'Unlimited saved trips', included: false },
  { text: 'Curated hidden gems & local spots', included: false },
  { text: 'Priority generation speed', included: false },
  { text: 'PDF export', included: false },
  { text: 'Multi-stop planning (5+ stops)', included: false },
];

const PREMIUM_FEATURES = [
  { text: 'Unlimited saved road trips', included: true },
  { text: 'Personalised itinerary', included: true },
  { text: 'Interactive route map', included: true },
  { text: 'Weather forecast', included: true },
  { text: 'Accommodation search', included: true },
  { text: 'Curated hidden gems & local spots', included: true },
  { text: 'Priority generation speed', included: true },
  { text: 'PDF export', included: true },
  { text: 'Multi-stop planning (5+ stops)', included: true },
];

const FAQS = [
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel from your dashboard and your access continues until the end of the billing period. No questions asked.',
  },
  {
    q: 'What payment methods are accepted?',
    a: 'All major credit and debit cards via Stripe. Your card details are never stored on our servers.',
  },
  {
    q: 'What happens to my trips if I downgrade?',
    a: 'Your saved trips stay intact. You just can\'t create new ones beyond the free limit until you upgrade again.',
  },
  {
    q: 'Is there a free trial?',
    a: 'The free plan lets you generate and save one full trip with no credit card required — try it before you commit.',
  },
];

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

export function PricingPage() {
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const { upgrade } = useManageSubscription();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpgrade() {
    if (!user) {
      navigate('/signup?next=/pricing');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.post<{ url: string }>('/stripe/create-checkout-session', {});
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch {
      // Stripe not configured — fall back to direct upgrade
      try {
        await upgrade();
        navigate('/dashboard?upgraded=true');
      } catch {
        setError('Could not upgrade. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="section py-64">
      <motion.div
        className="mx-auto max-w-3xl text-center"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.5 }}
          className="mb-16 inline-flex items-center gap-8 rounded-full border border-mercury-blue/30 bg-mercury-blue/10 px-16 py-6"
        >
          <Crown size={12} className="text-mercury-blue" />
          <span className="font-mono text-caption uppercase tracking-widest text-mercury-blue">Pricing</span>
        </motion.div>
        <motion.h1
          variants={fadeUp}
          transition={{ duration: 0.5 }}
          className="text-heading font-display font-w360 text-starlight"
        >
          Simple, honest pricing
        </motion.h1>
        <motion.p
          variants={fadeUp}
          transition={{ duration: 0.5 }}
          className="mt-16 text-body text-silver"
        >
          Start free. Upgrade when you need more.
        </motion.p>
      </motion.div>

      {/* Plans */}
      <motion.div
        className="mx-auto mt-56 grid max-w-4xl gap-24 md:grid-cols-2"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        {/* Free */}
        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.5 }}
          className="card flex flex-col gap-24"
        >
          <div>
            <p className="font-mono text-caption uppercase tracking-widest text-silver">Free</p>
            <div className="mt-8 flex items-end gap-4">
              <span className="font-display text-[40px] font-w360 leading-none text-starlight">€0</span>
              <span className="mb-2 text-body-sm text-silver">/ month</span>
            </div>
            <p className="mt-8 text-body-sm text-silver">Perfect for a one-off trip or to try Roadgem out.</p>
          </div>

          <ul className="flex flex-col gap-10">
            {FREE_FEATURES.map((f) => (
              <li key={f.text} className="flex items-center gap-10 text-body-sm">
                {f.included
                  ? <Check size={14} className="flex-shrink-0 text-mercury-blue" />
                  : <X size={14} className="flex-shrink-0 text-graphite" />}
                <span className={f.included ? 'text-starlight' : 'text-graphite'}>{f.text}</span>
              </li>
            ))}
          </ul>

          <div className="mt-auto">
            <Link to="/plan" className="btn-header block w-full text-center">
              Get started free
            </Link>
          </div>
        </motion.div>

        {/* Premium */}
        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-container border border-mercury-blue/40 p-24 flex flex-col gap-24"
          style={{
            background: 'linear-gradient(160deg, rgba(175,80,255,0.12) 0%, rgba(9,9,9,0) 60%)',
          }}
        >
          {/* Popular badge */}
          <div className="absolute right-16 top-16 flex items-center gap-6 rounded-full bg-mercury-blue/20 px-12 py-4">
            <Zap size={10} className="text-mercury-blue" />
            <span className="font-mono text-caption uppercase tracking-wider text-mercury-blue">Most popular</span>
          </div>

          <div>
            <p className="font-mono text-caption uppercase tracking-widest text-mercury-blue">Premium</p>
            <div className="mt-8 flex items-end gap-4">
              <span className="font-display text-[40px] font-w360 leading-none text-starlight">€9</span>
              <span className="mb-2 text-body-sm text-silver">/ month</span>
            </div>
            <p className="mt-8 text-body-sm text-silver">For explorers who plan multiple trips a year.</p>
          </div>

          <ul className="flex flex-col gap-10">
            {PREMIUM_FEATURES.map((f) => (
              <li key={f.text} className="flex items-center gap-10 text-body-sm">
                <Check size={14} className="flex-shrink-0 text-mercury-blue" />
                <span className="text-starlight">{f.text}</span>
              </li>
            ))}
          </ul>

          <div className="mt-auto flex flex-col gap-8">
            {isPremium ? (
              <div className="flex items-center justify-center gap-8 rounded-btn border border-mercury-blue/40 px-24 py-16 text-body-sm text-mercury-blue">
                <Crown size={16} />
                You're on Premium
              </div>
            ) : (
              <button
                onClick={handleUpgrade}
                disabled={isLoading}
                className="btn-primary inline-flex items-center justify-center gap-8"
              >
                {isLoading ? 'Redirecting…' : (
                  <>Upgrade to Premium <ArrowRight size={16} /></>
                )}
              </button>
            )}
            {error && <p className="text-center text-caption text-red-400">{error}</p>}
            <p className="text-center text-caption text-silver">Cancel anytime · Secure payment via Stripe</p>
          </div>
        </motion.div>
      </motion.div>

      {/* FAQ */}
      <motion.div
        className="mx-auto mt-80 max-w-2xl"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="mb-32 text-center text-heading-sm font-display font-w360 text-starlight">
          Frequently asked questions
        </h2>
        <div className="flex flex-col gap-1">
          {FAQS.map((faq) => (
            <div key={faq.q} className="card">
              <p className="text-body-sm font-w480 text-starlight">{faq.q}</p>
              <p className="mt-8 text-body-sm text-silver">{faq.a}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
