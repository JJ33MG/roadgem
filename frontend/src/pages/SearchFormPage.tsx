import { usePageTitle } from '@/hooks/usePageTitle';
import { TripPlanner } from '@/components/planner/TripPlanner';

/** The planner on its own page, for travellers who come straight to "Plan a trip". */
export function SearchFormPage() {
  usePageTitle('Plan a trip');
  return (
    <section className="mx-auto max-w-[760px] px-16 py-40 md:py-[64px]">
      <h1 className="font-display text-[40px] leading-[1.05] text-ink md:text-[56px]" style={{ fontWeight: 400, letterSpacing: '-0.035em' }}>
        Plan a trip
      </h1>
      <p className="mt-12 max-w-[44ch] text-[19px]">Where you start, where you end and how you like to travel.</p>
      <div className="mt-32">
        <TripPlanner />
      </div>
    </section>
  );
}
