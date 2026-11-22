import { Link } from 'react-router-dom';
import { Button, Panel } from '@/components/ui';
import type { TripCosts } from '@/types';

type Props = {
  cheaper: NonNullable<TripCosts['cheaper']>;
  isPremium: boolean;
  /** Whether this viewer may change the trip (planned it here, or owns it). */
  canEdit: boolean;
  busy?: boolean;
  onSwitch: () => void;
};

function duration(hours: number): string {
  // An estimate: whole ten minutes.
  const total = Math.max(10, Math.round((Math.abs(hours) * 60) / 10) * 10);
  const [h, m] = [Math.floor(total / 60), total % 60];
  return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`;
}

/** The toll-free road against the fastest: what it saves and what it costs in time. Plus switches. */
export function CheaperRoute({ cheaper, isPremium, canEdit, busy, onSwitch }: Props) {
  const extra = `About ${duration(cheaper.extraHours)} longer${cheaper.extraKm > 0 ? `, ${cheaper.extraKm} km more` : ''}.`;
  return (
    <Panel role="region" aria-label="Cheapest route" className="mt-24 grid gap-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div>
        <h2 className="font-display text-[24px] text-ink" style={{ fontWeight: 400, letterSpacing: '-0.02em' }}>
          {cheaper.using ? `On the toll-free route, saving about €${cheaper.saves}` : `Skip the toll roads and save about €${cheaper.saves}`}
        </h2>
        <p className="mt-4">{cheaper.using ? 'The costs and the map below follow this route.' : extra}</p>
        {!isPremium && <p className="mt-4 text-[16px] text-muted">Plus finds the cheapest route and switches your trip to it in one tap.</p>}
      </div>
      {isPremium ? (
        canEdit && (
          <Button type="button" variant={cheaper.using ? undefined : 'primary'} disabled={busy} onClick={onSwitch}>
            {cheaper.using ? 'Back to the fastest route' : 'Use the toll-free route'}
          </Button>
        )
      ) : (
        <Link to="/pricing" className="btn-header no-underline">See Plus</Link>
      )}
    </Panel>
  );
}
