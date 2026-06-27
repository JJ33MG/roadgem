import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { MapPin, Clock, Euro, Star, Zap, Lock, CheckCircle } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';

interface Template {
  id: string;
  title: string;
  slug: string;
  description: string;
  emoji: string;
  startLocation: string;
  destination: string;
  days: number;
  budget: number;
  travelStyle: string;
  highlights: string;
  totalCost: number;
  totalDistance: number;
  priceEur: number;
  featured: boolean;
  owned: boolean;
}

const STYLE_LABELS: Record<string, string> = {
  comfort: 'Comfort',
  budget: 'Budget',
  adventure: 'Avontuur',
  cultural: 'Cultuur',
  luxury: 'Luxe',
};

export function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const justPurchased = searchParams.get('purchased');

  useEffect(() => {
    apiClient.get('/api/templates').then((r: any) => {
      setTemplates(r.templates ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleUse(template: Template) {
    if (!user) { navigate('/login'); return; }
    setActionId(template.id);
    try {
      const r: any = await apiClient.post(`/api/templates/${template.id}/use`, {});
      navigate(`/trips/${r.tripId}`);
    } catch (err: any) {
      if (err?.status === 403 || err?.error === 'not_purchased') {
        await handleBuy(template);
      }
      setActionId(null);
    }
  }

  async function handleBuy(template: Template) {
    if (!user) { navigate('/login'); return; }
    setActionId(template.id);
    try {
      const r: any = await apiClient.post('/api/stripe/buy-template', { templateId: template.id });
      if (r.alreadyOwned) {
        await handleUse(template);
        return;
      }
      if (r.url) window.location.href = r.url;
    } catch {
      setActionId(null);
    }
  }

  const featured = templates.filter((t) => t.featured);
  const rest = templates.filter((t) => !t.featured);

  return (
    <div className="min-h-screen bg-[#080c14] pt-[80px]">
      {/* Success banner after purchase */}
      {justPurchased && (
        <div className="bg-green-500/10 border-b border-green-500/20 py-12 text-center">
          <p className="flex items-center justify-center gap-8 text-body-sm text-green-400">
            <CheckCircle size={14} /> Aankoop geslaagd! Je trip staat klaar.
          </p>
        </div>
      )}

      {/* Hero */}
      <div className="section py-64 text-center">
        <div className="mb-16 inline-flex items-center gap-8 rounded-full border border-[#f5a623]/30 bg-[#f5a623]/10 px-16 py-6 text-body-sm text-[#f5a623]">
          <Zap size={12} /> Kant-en-klare trips
        </div>
        <h1 className="mt-16 font-display text-heading-xl font-w480 text-white">
          Klaar om te vertrekken
        </h1>
        <p className="mt-16 text-body text-white/60 max-w-[540px] mx-auto">
          Onze best beoordeelde routes — door AI samengesteld, door reizigers getest. Eén klik en je trip staat klaar in je dashboard.
        </p>
        {!user && (
          <p className="mt-12 text-body-sm text-white/40">
            <Link to="/login" className="text-mercury-blue hover:underline">Log in</Link> om trips te kopen of gebruik een Premium account voor onbeperkte toegang.
          </p>
        )}
      </div>

      <div className="section pb-80">
        {loading ? (
          <div className="grid grid-cols-1 gap-24 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[320px] animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : (
          <>
            {featured.length > 0 && (
              <div className="mb-48">
                <div className="mb-24 flex items-center gap-10">
                  <Star size={14} className="text-[#f5a623]" />
                  <span className="font-mono text-label text-[#f5a623] uppercase tracking-wider">Aanbevolen</span>
                </div>
                <div className="grid grid-cols-1 gap-24 sm:grid-cols-2 lg:grid-cols-3">
                  {featured.map((t) => (
                    <TemplateCard key={t.id} template={t} onUse={handleUse} onBuy={handleBuy} actionId={actionId} isLoggedIn={!!user} />
                  ))}
                </div>
              </div>
            )}

            {rest.length > 0 && (
              <div>
                <div className="mb-24 flex items-center gap-10">
                  <MapPin size={14} className="text-white/40" />
                  <span className="font-mono text-label text-white/40 uppercase tracking-wider">Alle routes</span>
                </div>
                <div className="grid grid-cols-1 gap-24 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.map((t) => (
                    <TemplateCard key={t.id} template={t} onUse={handleUse} onBuy={handleBuy} actionId={actionId} isLoggedIn={!!user} />
                  ))}
                </div>
              </div>
            )}

            {templates.length === 0 && (
              <p className="text-center text-body text-white/40 py-64">Nog geen templates beschikbaar.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TemplateCard({ template: t, onUse, onBuy, actionId, isLoggedIn }: {
  template: Template;
  onUse: (t: Template) => void;
  onBuy: (t: Template) => void;
  actionId: string | null;
  isLoggedIn: boolean;
}) {
  const isLoading = actionId === t.id;

  return (
    <div className="card group flex flex-col gap-20 p-24 transition-all hover:border-white/20 hover:-translate-y-1">
      {/* Header */}
      <div className="flex items-start justify-between gap-12">
        <div className="flex items-center gap-12">
          <span className="text-3xl">{t.emoji}</span>
          <div>
            <h3 className="font-display text-heading-sm font-w480 text-white leading-tight">{t.title}</h3>
            <p className="mt-2 text-body-sm text-white/40">{t.startLocation} → {t.destination}</p>
          </div>
        </div>
        {t.featured && (
          <span className="shrink-0 rounded-full bg-[#f5a623]/15 px-10 py-4 font-mono text-[10px] text-[#f5a623] uppercase tracking-wider">
            Top
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-body-sm text-white/60 leading-relaxed">{t.description}</p>

      {/* Meta pills */}
      <div className="flex flex-wrap gap-8">
        <span className="flex items-center gap-4 rounded-full border border-white/10 px-10 py-4 text-body-sm text-white/50">
          <Clock size={11} /> {t.days} dagen
        </span>
        <span className="flex items-center gap-4 rounded-full border border-white/10 px-10 py-4 text-body-sm text-white/50">
          <Euro size={11} /> ~€{t.totalCost}
        </span>
        <span className="rounded-full border border-white/10 px-10 py-4 text-body-sm text-white/50 capitalize">
          {STYLE_LABELS[t.travelStyle] ?? t.travelStyle}
        </span>
      </div>

      {/* Highlights */}
      <p className="text-body-sm text-white/40 truncate">📍 {t.highlights}</p>

      {/* CTA */}
      {t.owned ? (
        <button
          onClick={() => onUse(t)}
          disabled={!!actionId}
          className="mt-auto w-full rounded-xl bg-green-500/15 border border-green-500/30 py-12 text-body-sm font-w480 text-green-400 transition-all hover:bg-green-500/25 disabled:opacity-50"
        >
          {isLoading ? 'Laden...' : '✓ Gebruik deze route'}
        </button>
      ) : isLoggedIn ? (
        <button
          onClick={() => onBuy(t)}
          disabled={!!actionId}
          className="mt-auto w-full rounded-xl bg-[#f5a623]/15 border border-[#f5a623]/30 py-12 text-body-sm font-w480 text-[#f5a623] transition-all hover:bg-[#f5a623]/25 disabled:opacity-50 flex items-center justify-center gap-8"
        >
          {isLoading ? 'Laden...' : <><Lock size={12} /> Kopen voor €{t.priceEur.toFixed(2)}</>}
        </button>
      ) : (
        <Link
          to="/login"
          className="mt-auto w-full rounded-xl bg-white/5 border border-white/10 py-12 text-body-sm font-w480 text-white/50 transition-all hover:bg-white/10 text-center flex items-center justify-center gap-8"
        >
          <Lock size={12} /> Log in om te kopen
        </Link>
      )}

      {/* Premium upsell hint */}
      {!t.owned && (
        <p className="text-center text-[11px] text-white/25">
          Of <Link to="/pricing" className="text-mercury-blue hover:underline">Premium</Link> voor alle trips onbeperkt
        </p>
      )}
    </div>
  );
}
