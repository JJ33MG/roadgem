import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useManageSubscription } from '@/hooks/useManageSubscription';
import { apiClient } from '@/lib/apiClient';
import { Button, Panel } from '@/components/ui';

const FREE = [
  'A full trip: days, stays and the route',
  'Real costs per day: fuel, tolls and vignettes',
  'Three checked gems per trip',
  'Change the plan: move a night, add a rest day',
  'The route in Google Maps in one tap',
  'One saved trip',
];
const PASS = [
  'Everything in Free, for one trip',
  'Every gem on the route',
  'The cheapest route, without toll roads',
  'A printable PDF of the trip',
  'Yours to keep, no subscription',
];
const PLUS = [
  'Unlimited trips',
  'Every gem on the route',
  'The cheapest route, without toll roads',
  'A printable PDF of the trip',
  'Your trips on every device you sign in on',
  'First to get the on-the-road mode',
];

const FAQS = [
  { q: 'Can I stop any time?', a: 'Yes. Stop from your account page; Plus keeps working until the end of the month you paid for.' },
  { q: 'What happens to my trips if I stop?', a: 'They stay. You can open every trip you saved; only new trips follow the free plan again.' },
  { q: 'Do I need a card for the free plan?', a: 'No. Plan and save one full trip without paying anything.' },
  { q: 'Trip pass or Plus?', a: 'One road trip a year: the Trip pass unlocks everything for that trip, once. Several trips, or planning and comparing a lot: Plus.' },
  { q: 'How does the cheapest route work?', a: 'Routify also asks Google for the route without toll roads and prices both. When it saves money, you see how much and how much longer it takes, and switch in one tap.' },
];

const head = { fontWeight: 400, letterSpacing: '-0.035em' } as const;

export function PricingPage() {
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const { upgrade } = useManageSubscription();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startPlus() {
    if (!user) {
      navigate('/signup?next=/pricing');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await apiClient.post<{ url: string }>('/stripe/create-checkout-session', {});
      if (res.data.url) window.location.href = res.data.url;
    } catch {
      // Stripe is not live yet: the direct upgrade keeps testing possible.
      try {
        await upgrade();
        navigate('/dashboard?upgraded=true');
      } catch {
        setError('Plus could not be started. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1040px] px-16 py-40 md:px-40 md:py-[64px]">
      <h1 className="font-display text-[44px] leading-[1.04] text-ink md:text-[64px]" style={head}>Free for your first trip</h1>
      <p className="mt-16 max-w-[44ch] text-[20px]">Plan a whole trip for free. Plus is for people who keep going.</p>

      <div className="mt-40 grid gap-24 md:grid-cols-3">
        <section aria-labelledby="free-head" className="rounded-card border border-rule bg-paper p-24">
          <h2 id="free-head" className="text-[20px] text-ink" style={{ fontWeight: 500 }}>Free</h2>
          <p className="num mt-8 font-display text-[56px] text-ink" style={head}>€0</p>
          <ul className="mt-16 grid gap-8 p-0" style={{ listStyle: 'none' }}>
            {FREE.map((f) => <li key={f} className="border-t border-rule pt-8">{f}</li>)}
          </ul>
          <Button className="mt-24 w-full" onClick={() => navigate('/plan')}>Plan a trip</Button>
        </section>

        <section aria-labelledby="pass-head" className="rounded-card border border-rule bg-paper p-24">
          <h2 id="pass-head" className="text-[20px] text-ink" style={{ fontWeight: 500 }}>Trip pass</h2>
          <p className="mt-8 text-ink">
            <span className="num font-display text-[56px]" style={head}>€4.99</span>
            <span className="ml-8 text-[18px] text-muted">once, per trip</span>
          </p>
          <ul className="mt-16 grid gap-8 p-0" style={{ listStyle: 'none' }}>
            {PASS.map((f) => <li key={f} className="border-t border-rule pt-8">{f}</li>)}
          </ul>
          <Button className="mt-24 w-full" disabled>Coming soon</Button>
        </section>

        <Panel aria-labelledby="plus-head">
          <h2 id="plus-head" className="text-[20px] text-ink" style={{ fontWeight: 500 }}>Plus</h2>
          <p className="mt-8 text-ink">
            <span className="num font-display text-[56px]" style={head}>€9</span>
            <span className="ml-8 text-[18px] text-muted">a month</span>
          </p>
          <ul className="mt-16 grid gap-8 p-0" style={{ listStyle: 'none' }}>
            {PLUS.map((f) => <li key={f} className="border-t border-rule pt-8 text-ink">{f}</li>)}
          </ul>
          {isPremium ? (
            <p className="mt-24 text-ink" style={{ fontWeight: 500 }}>You have Plus. Thank you.</p>
          ) : (
            <Button variant="primary" className="mt-24 w-full" onClick={startPlus} disabled={busy}>
              {busy ? 'Starting Plus' : 'Start Plus'}
            </Button>
          )}
          {error && <p className="mt-12 text-error" role="alert">{error}</p>}
        </Panel>
      </div>

      <section aria-labelledby="faq-head" className="mt-80">
        <h2 id="faq-head" className="font-display text-[32px] text-ink md:text-[40px]" style={head}>Questions</h2>
        <dl className="mt-16">
          {FAQS.map((f) => (
            <div key={f.q} className="border-t border-rule py-20">
              <dt className="text-[19px] text-ink" style={{ fontWeight: 500 }}>{f.q}</dt>
              <dd className="mt-[6px] max-w-[60ch]" style={{ marginLeft: 0 }}>{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
