import { useNavigate } from 'react-router-dom';
import { useTripGeneration } from '@/hooks/useTripGeneration';
import { apiClient } from '@/lib/apiClient';
import { Panel } from '@/components/ui';
import { PaywallModal } from '@/components/utility/PaywallModal';
import { toGenerateRequest, type TripPlan } from '@/lib/tripPlan';
import { useState } from 'react';
import { PlannerPanel } from './PlannerPanel';
import { PlanningProgress } from './PlanningProgress';

type Point = { lat: number; lng: number };
type Estimate = { km: number | null; from?: Point; to?: Point };

/** The planner wired to trip generation: plans, then opens the trip page. */
export function TripPlanner({ initial }: { initial?: TripPlan }) {
  const navigate = useNavigate();
  const { isLoading, error, limitReached, generateTrip, dismissLimit } = useTripGeneration();
  const [ends, setEnds] = useState<{ from?: Point; to?: Point }>({});

  /** Asks the server for a rough driving distance (null when it cannot tell) and keeps both ends for the globe. */
  async function estimateKm(from: string, to: string): Promise<number | null> {
    try {
      const res = await apiClient.get<Estimate>('/route/estimate', { params: { from, to }, timeout: 10_000 });
      setEnds({ from: res.data.from, to: res.data.to });
      return typeof res.data.km === 'number' ? res.data.km : null;
    } catch {
      setEnds({});
      return null;
    }
  }

  async function plan(p: TripPlan) {
    const tomorrow = new Date(Date.now() + 86_400_000);
    const trip = await generateTrip(toGenerateRequest(p, tomorrow));
    if (trip) navigate(`/trips/${trip.tripId}`, { state: { trip } });
  }

  return (
    <>
      <PlannerPanel initial={initial} busy={isLoading} onSubmit={plan} estimateKm={estimateKm} />
      {/* Own light panels: on the homepage the planner sits on the dark band, where plain text disappears. */}
      {isLoading && (
        <Panel role="region" aria-label="Planning your trip" className="mt-16">
          <PlanningProgress from={ends.from} to={ends.to} />
        </Panel>
      )}
      {error && !limitReached && (
        <Panel role="region" aria-label="Your trip was not planned" className="mt-16">
          <p className="text-error" role="alert">{error}</p>
        </Panel>
      )}
      <PaywallModal isOpen={limitReached} onClose={dismissLimit} title="Your free trip is saved" message="The free plan keeps one trip. Routify Plus keeps every trip and shows every gem." />
    </>
  );
}
