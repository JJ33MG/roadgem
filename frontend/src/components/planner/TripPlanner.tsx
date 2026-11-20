import { useNavigate } from 'react-router-dom';
import { useTripGeneration } from '@/hooks/useTripGeneration';
import { apiClient } from '@/lib/apiClient';
import { PaywallModal } from '@/components/utility/PaywallModal';
import { toGenerateRequest, type TripPlan } from '@/lib/tripPlan';
import { PlannerPanel } from './PlannerPanel';

/** Asks the server for a rough driving distance; null when it cannot tell. */
async function estimateKm(from: string, to: string): Promise<number | null> {
  try {
    const res = await apiClient.get<{ km: number | null }>('/route/estimate', { params: { from, to }, timeout: 10_000 });
    return typeof res.data.km === 'number' ? res.data.km : null;
  } catch {
    return null;
  }
}

/** The planner wired to trip generation: plans, then opens the trip page. */
export function TripPlanner({ initial }: { initial?: TripPlan }) {
  const navigate = useNavigate();
  const { isLoading, error, limitReached, generateTrip, dismissLimit } = useTripGeneration();

  async function plan(p: TripPlan) {
    const tomorrow = new Date(Date.now() + 86_400_000);
    const trip = await generateTrip(toGenerateRequest(p, tomorrow));
    if (trip) navigate(`/trips/${trip.tripId}`, { state: { trip } });
  }

  return (
    <>
      <PlannerPanel initial={initial} busy={isLoading} onSubmit={plan} estimateKm={estimateKm} />
      {isLoading && (
        <p className="mt-12 text-[17px] text-ink-2" role="status">
          Planning your route, your stays and the gems along the way. This takes about half a minute.
        </p>
      )}
      {error && !limitReached && <p className="mt-12 text-error" role="alert">{error}</p>}
      <PaywallModal isOpen={limitReached} onClose={dismissLimit} title="Your free trip is saved" message="The free plan keeps one trip. Routify Plus keeps every trip and shows every gem." />
    </>
  );
}
