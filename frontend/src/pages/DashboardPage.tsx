import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Route, Wallet, Crown, Plus, ArrowRight, CheckCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useUserTrips } from '@/hooks/useUserTrips';
import { useSubscription } from '@/hooks/useSubscription';
import { useManageSubscription } from '@/hooks/useManageSubscription';
import { SavedTripCard } from '@/components/display/SavedTripCard';
import { LoadingSpinner } from '@/components/utility/LoadingSpinner';
import { apiClient } from '@/lib/apiClient';
import { useState } from 'react';

const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

export function DashboardPage() {
  const [searchParams] = useSearchParams();
  const justUpgraded = searchParams.get('upgraded') === 'true';
  const { user, refreshUser } = useAuth();
  const { trips, isLoading, error } = useUserTrips();
  const { isPremium, subscriptionExpires } = useSubscription();
  const { downgrade, isLoading: isSubscriptionLoading } = useManageSubscription();
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);

  async function handleUpgrade() {
    setStripeLoading(true);
    setStripeError(null);
    try {
      const res = await apiClient.post<{ url: string }>('/stripe/create-checkout-session', {});
      if (res.data.url) window.location.href = res.data.url;
    } catch {
      // Stripe not configured yet — fall back to direct upgrade
      try {
        await apiClient.post('/subscription/upgrade', {});
        await refreshUser();
      } catch {
        setStripeError('Could not upgrade. Please try again.');
      }
    } finally {
      setStripeLoading(false);
    }
  }

  const totalDistance = trips.reduce((sum, t) => sum + t.totalDistance, 0);
  const totalSpent = trips.reduce((sum, t) => sum + t.totalCost, 0);

  const stats = [
    { icon: MapPin, label: 'Trips planned', value: trips.length.toString() },
    { icon: Route, label: 'Total distance', value: `${totalDistance.toLocaleString()} km` },
    { icon: Wallet, label: 'Total spent', value: `€${totalSpent.toLocaleString()}` },
  ];

  return (
    <div className="section py-40">
      <motion.div initial="hidden" animate="visible" variants={stagger}>
        {/* Header */}
        <motion.div variants={fadeUp} transition={{ duration: 0.4 }}>
          <h1 className="text-heading font-display font-w360 text-starlight">
            {user?.name ? `Hey, ${user.name}` : 'Dashboard'}
          </h1>
          <p className="mt-8 text-body-sm text-silver">Here's an overview of your road trips.</p>
        </motion.div>

        {/* Stats */}
        <motion.div variants={fadeUp} transition={{ duration: 0.4 }} className="mt-32 grid gap-16 sm:grid-cols-3">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="card flex items-center gap-16">
              <div className="flex h-40 w-40 flex-shrink-0 items-center justify-center rounded-full bg-mercury-blue/15">
                <Icon size={18} className="text-mercury-blue" />
              </div>
              <div>
                <p className="text-caption text-silver">{label}</p>
                <p className="mt-4 text-heading-sm font-display font-w480 text-starlight">{value}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Upgrade success banner */}
        {justUpgraded && (
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.4 }}
            className="mt-24 flex items-center gap-12 rounded-container border border-green-500/30 bg-green-500/10 px-16 py-12"
          >
            <CheckCircle size={18} className="flex-shrink-0 text-green-400" />
            <p className="text-body-sm text-green-400">You're now on Premium — enjoy unlimited trips and hidden gems!</p>
          </motion.div>
        )}

        {/* Subscription */}
        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.4 }}
          className={`mt-24 rounded-container border p-24 ${isPremium ? 'border-mercury-blue/30 bg-mercury-blue/5' : 'border-starlight/10 bg-starlight/[0.03]'}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-16">
            <div className="flex items-center gap-12">
              <Crown size={20} className={isPremium ? 'text-mercury-blue' : 'text-lead'} />
              <div>
                <p className="text-body-sm font-w480 text-starlight">
                  {isPremium ? 'Premium plan' : 'Free plan'}
                </p>
                {isPremium && subscriptionExpires ? (
                  <p className="mt-2 text-caption text-silver">
                    Renews {new Date(subscriptionExpires).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                ) : (
                  <p className="mt-2 text-caption text-silver">1 saved trip · hidden gems locked</p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-6">
              {isPremium ? (
                <button onClick={downgrade} disabled={isSubscriptionLoading} className="btn-header text-body-sm">
                  Cancel premium
                </button>
              ) : (
                <button onClick={handleUpgrade} disabled={stripeLoading} className="btn-primary inline-flex items-center gap-8 text-body-sm">
                  {stripeLoading ? 'Redirecting…' : <><Crown size={14} /> Upgrade — €9/mo <ArrowRight size={14} /></>}
                </button>
              )}
              {stripeError && <p className="text-caption text-red-400">{stripeError}</p>}
            </div>
          </div>
        </motion.div>

        {/* Trips */}
        <motion.div variants={fadeUp} transition={{ duration: 0.4 }} className="mt-40">
          <div className="flex items-center justify-between">
            <h2 className="text-heading-sm font-display font-w480 text-starlight">Your trips</h2>
            <Link to="/plan" className="btn-header flex items-center gap-8 text-body-sm">
              <Plus size={16} /> Plan new trip
            </Link>
          </div>

          {isLoading && (
            <div className="flex justify-center py-56">
              <LoadingSpinner size={32} />
            </div>
          )}

          {error && (
            <div className="mt-16 rounded-container border border-red-500/30 bg-red-500/10 px-16 py-12">
              <p className="text-body-sm text-red-400">{error}</p>
            </div>
          )}

          {!isLoading && trips.length === 0 && (
            <div className="mt-24 rounded-container border border-dashed border-starlight/20 py-56 text-center">
              <MapPin size={32} className="mx-auto text-lead" />
              <p className="mt-16 text-body-sm text-silver">No trips yet.</p>
              <Link to="/plan" className="btn-primary mt-16 inline-block">
                Plan your first trip
              </Link>
            </div>
          )}

          <div className="mt-24 grid gap-16 sm:grid-cols-2 lg:grid-cols-3">
            {trips.map((trip) => (
              <SavedTripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
