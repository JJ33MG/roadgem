import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SearchForm } from '@/components/forms/SearchForm';
import { useTripGeneration } from '@/hooks/useTripGeneration';
import { PaywallModal } from '@/components/utility/PaywallModal';
import type { TripSearchParams } from '@/types';

export function SearchFormPage() {
  const navigate = useNavigate();
  const { isLoading, error, limitReached, generateTrip, dismissLimit } = useTripGeneration();

  async function handleSubmit(params: TripSearchParams) {
    const trip = await generateTrip(params);
    if (trip) {
      navigate(`/trips/${trip.tripId}`, { state: { trip, accommodationTypes: params.accommodationTypes } });
    }
  }

  return (
    <div className="section py-56">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="mx-auto max-w-2xl"
      >
        <div className="mb-40">
          <h1 className="text-heading font-display font-w360 text-starlight">Plan your road trip</h1>
          <p className="mt-8 text-body-sm text-silver">
            Tell us where you're heading and we'll build your personalised itinerary in under a minute.
          </p>
        </div>

        {error && !limitReached && (
          <div className="mb-32 rounded-container border border-red-500/30 bg-red-500/10 px-16 py-12">
            <p className="text-body-sm text-red-400">{error}</p>
          </div>
        )}

        <PaywallModal
          isOpen={limitReached}
          onClose={dismissLimit}
          title="Trip limit reached"
          message="The free plan includes 1 saved road trip. Upgrade to premium for unlimited trips and more stops."
        />

        <SearchForm isLoading={isLoading} onSubmit={handleSubmit} />

        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-32 space-y-16"
          >
            <p className="text-center text-caption text-silver">
              Researching your destination and building your itinerary — this takes about 30 seconds.
            </p>
            {/* Skeleton preview */}
            <div className="rounded-container border border-lead/40 p-24 animate-pulse">
              <div className="h-[140px] rounded-container bg-graphite/50 mb-20" />
              <div className="h-5 w-1/3 rounded bg-graphite/60 mb-12" />
              <div className="flex gap-8 mb-16">
                {[1,2,3,4].map(i => <div key={i} className="h-8 w-14 rounded-btn bg-graphite/50" />)}
              </div>
              <div className="flex flex-col gap-8">
                {[1,2,3].map(i => (
                  <div key={i} className="flex gap-12 rounded-container border border-lead/30 p-12">
                    <div className="h-32 w-32 flex-shrink-0 rounded-full bg-graphite/50" />
                    <div className="flex-1 space-y-8">
                      <div className="h-4 w-3/4 rounded bg-graphite/60" />
                      <div className="h-3 w-1/2 rounded bg-graphite/40" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
