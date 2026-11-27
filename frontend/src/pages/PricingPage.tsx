import { usePageTitle } from '@/hooks/usePageTitle';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useManageSubscription } from '@/hooks/useManageSubscription';
import { apiClient } from '@/lib/apiClient';
import { Button, Panel } from '@/components/ui';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '@/i18n/format';

const FREE = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `pricing.free${n}`);
const PASS = ['pricing.pass1', 'pricing.everyGem', 'pricing.filters', 'pricing.cheapest', 'pricing.pdf', 'pricing.pass6'];
const PLUS = ['pricing.plus1', 'pricing.everyGem', 'pricing.filters', 'pricing.cheapest', 'pricing.pdf', 'pricing.plus6', 'pricing.plus7', 'pricing.plus8', 'pricing.plus9'];
const FAQS = [1, 2, 3, 4, 5].map((n) => ({ q: `pricing.q${n}`, a: `pricing.a${n}` }));

const head = { fontWeight: 400, letterSpacing: '-0.035em' } as const;

export function PricingPage() {
  const { t } = useTranslation();
  usePageTitle(t('nav.pricing'));
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const { upgrade } = useManageSubscription();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [error, setError] = useState<string | null>(null);

  async function startPlus() {
    if (!user) {
      navigate('/signup?next=/pricing');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await apiClient.post<{ url: string }>('/stripe/create-checkout-session', { plan });
      if (res.data.url) window.location.href = res.data.url;
    } catch {
      // Stripe is not live yet: the direct upgrade keeps testing possible.
      try {
        await upgrade();
        navigate('/dashboard?upgraded=true');
      } catch {
        setError(t('pricing.startFailed'));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1040px] px-16 py-40 md:px-40 md:py-[64px]">
      <h1 className="font-display text-[44px] leading-[1.04] text-ink md:text-[64px]" style={head}>{t('pricing.title')}</h1>
      <p className="mt-16 max-w-[44ch] text-[20px]">{t('pricing.lead')}</p>

      <div className="mt-40 grid gap-24 md:grid-cols-3">
        <section aria-labelledby="free-head" className="rounded-card border border-rule bg-paper p-24">
          <h2 id="free-head" className="text-[20px] text-ink" style={{ fontWeight: 500 }}>{t('pricing.free')}</h2>
          <p className="num mt-8 font-display text-[56px] text-ink" style={head}>{formatMoney(0, undefined, { whole: true })}</p>
          <ul className="mt-16 grid gap-8 p-0" style={{ listStyle: 'none' }}>
            {FREE.map((f) => <li key={f} className="border-t border-rule pt-8">{t(f)}</li>)}
          </ul>
          <Button className="mt-24 w-full" onClick={() => navigate('/plan')}>{t('nav.plan')}</Button>
        </section>

        <section aria-labelledby="pass-head" className="rounded-card border border-rule bg-paper p-24">
          <h2 id="pass-head" className="text-[20px] text-ink" style={{ fontWeight: 500 }}>Trip pass</h2>
          <p className="mt-8 text-ink">
            <span className="num font-display text-[56px]" style={head}>{formatMoney(4.99)}</span>
            <span className="ml-8 text-[18px] text-muted">{t('pricing.once')}</span>
          </p>
          <ul className="mt-16 grid gap-8 p-0" style={{ listStyle: 'none' }}>
            {PASS.map((f) => <li key={f} className="border-t border-rule pt-8">{t(f)}</li>)}
          </ul>
          <Link to="/plan" className="btn-header mt-24 w-full no-underline" aria-label={t('pricing.passCta')}>{t('pricing.passCta')}</Link>
          <p className="mt-8 text-[15px] text-muted">{t('pricing.passNote')}</p>
        </section>

        <Panel aria-labelledby="plus-head">
          <h2 id="plus-head" className="text-[20px] text-ink" style={{ fontWeight: 500 }}>Plus</h2>
          <p className="mt-8 text-ink">
            <span className="num font-display text-[56px]" style={head}>{formatMoney(plan === 'yearly' ? 59 : 9, undefined, { whole: true })}</span>
            <span className="ml-8 text-[18px] text-muted">{plan === 'yearly' ? t('pricing.aYear') : t('pricing.aMonth')}</span>
          </p>
          <div role="radiogroup" aria-label={t('pricing.pay')} className="mt-12 grid grid-cols-2 gap-8">
            {(['monthly', 'yearly'] as const).map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={plan === p}
                aria-label={p === 'monthly' ? t('pricing.monthlyLabel', { price: formatMoney(9, undefined, { whole: true }) }) : t('pricing.yearlyLabel', { price: formatMoney(59, undefined, { whole: true }) })}
                onClick={() => setPlan(p)}
                className={`min-h-[48px] rounded-btn border px-12 text-[16px] ${plan === p ? 'border-ink bg-ink text-paper' : 'border-rule bg-paper text-ink'}`}
                style={{ fontWeight: 500 }}
              >
                {p === 'monthly' ? t('pricing.monthly') : t('pricing.yearlySave')}
              </button>
            ))}
          </div>
          <ul className="mt-16 grid gap-8 p-0" style={{ listStyle: 'none' }}>
            {PLUS.map((f) => <li key={f} className="border-t border-rule pt-8 text-ink">{t(f)}</li>)}
          </ul>
          {isPremium ? (
            <p className="mt-24 text-ink" style={{ fontWeight: 500 }}>{t('pricing.havePlus')}</p>
          ) : (
            <Button variant="primary" className="mt-24 w-full" onClick={startPlus} disabled={busy}>
              {busy ? t('pricing.startingPlus') : t('pricing.startPlus')}
            </Button>
          )}
          {error && <p className="mt-12 text-error" role="alert">{error}</p>}
        </Panel>
      </div>

      <section aria-labelledby="faq-head" className="mt-80">
        <h2 id="faq-head" className="font-display text-[32px] text-ink md:text-[40px]" style={head}>{t('pricing.questions')}</h2>
        <dl className="mt-16">
          {FAQS.map((f) => (
            <div key={f.q} className="border-t border-rule py-20">
              <dt className="text-[19px] text-ink" style={{ fontWeight: 500 }}>{t(f.q)}</dt>
              <dd className="mt-[6px] max-w-[60ch]" style={{ marginLeft: 0 }}>{t(f.a)}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
