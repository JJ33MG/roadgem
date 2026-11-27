import { apiClient, getAuthToken } from '@/lib/apiClient';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Fragment, useEffect, useRef, useState, lazy, Suspense } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { addDays, format } from 'date-fns';
import { tripsApi } from '@/lib/api';
import { AccommodationCard } from '@/components/display/AccommodationCard';
import { Modal } from '@/components/utility/Modal';
import { LoadingSpinner } from '@/components/utility/LoadingSpinner';
// The globe engine is large: loaded only when a trip page opens.
import { DayCosts } from '@/components/trip/DayCosts';
import { GemProof } from '@/components/trip/GemProof';
import { CheaperRoute } from '@/components/trip/CheaperRoute';
import { dayCost, euros, tripTotal } from '@/lib/costs';
import { BlockIcon, DayBlock } from '@/components/trip/DayBlock';
const GlobeMap = lazy(() => import('@/components/map/GlobeMap').then((m) => ({ default: m.GlobeMap })));
import { Button, Panel } from '@/components/ui';
import { useAccommodations } from '@/hooks/useAccommodations';
import { useSubscription } from '@/hooks/useSubscription';
import { generateTripPDF } from '@/utils/generatePDF';
import { buildGoogleMapsRouteUrl } from '@/components/display/GlobeView';
import { type StayType } from '@/lib/tripPlan';
import { goLink } from '@/lib/track';
import { carForGroup } from '@/lib/cars';
import { OnTheRoad } from '@/components/trip/OnTheRoad';
import { ExplorerGems } from '@/components/trip/ExplorerGems';
import { ShareTrip } from '@/components/trip/ShareTrip';
import { editKeyFor, retryDays, sendEdit, type TripEdit } from '@/lib/tripEdits';
import type { AccommodationOption, AccommodationType, GeneratedTrip, HiddenGem } from '@/types';
import { MapBoundary } from '@/components/map/MapBoundary';
import { TripMapImage } from '@/components/map/TripMapImage';
import { useTranslation } from 'react-i18next';
import { countryName, formatDate, formatMoney, formatNumber } from '@/i18n/format';
import { outsideRoamingCodes } from '@/lib/roaming';

const town = (location?: string) => (location ?? '').split(',')[0].trim();
/** Gem kinds and who they suit, by translation key (gemKind.*, audience.*). */
const GEM_KIND: Record<string, string> = Object.fromEntries(['experience', 'food', 'nightlife', 'wellness', 'culture', 'nature', 'hike', 'viewpoint', 'historic', 'family'].map((k) => [k, `gemKind.${k}`]));
const AUDIENCE: Record<string, string> = Object.fromEntries(['family', 'couples', 'friends'].map((k) => [k, `audience.${k}`]));
const STAY_TAG: Record<string, string> = Object.fromEntries(['hotel', 'campsite', 'airbnb', 'hostel'].map((k) => [k, `trip.stayTag.${k}`]));
/** 2.6 hours as "2 h 36", under an hour as "45 min". */
const hoursLabel = (h: number) => (h < 1 ? `${Math.round(h * 60)} min` : `${Math.floor(h)} h ${String(Math.round((h % 1) * 60)).padStart(2, '0')}`);

/** Booking links per stay type: Booking.com lists hotels and campsites, Vrbo the holiday homes. */
export function stayUrl(type: StayType, place: string, checkin?: string, checkout?: string, adults = 2): string {
  if (type === 'holiday_home') {
    // Vrbo: holiday homes with an affiliate program (Airbnb closed its own).
    const p = new URLSearchParams({ destination: place, adults: String(adults), ...(checkin ? { startDate: checkin } : {}), ...(checkout ? { endDate: checkout } : {}) });
    return `https://www.vrbo.com/search?${p}`;
  }
  const p = new URLSearchParams({ ss: place, group_adults: String(adults), no_rooms: String(Math.ceil(adults / 2)), group_children: '0', ...(checkin ? { checkin } : {}), ...(checkout ? { checkout } : {}) });
  if (type === 'campsite') p.set('nflt', 'ht_id=214');
  return `https://www.booking.com/searchresults.html?${p}`;
}

/** Gems near one day's leg: inside the leg's box (with a little margin), else none. */
/** True on screens wide enough for the side column (Tailwind lg). */
function useWide(): boolean {
  const query = '(min-width: 1024px)';
  const get = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
  const [wide, setWide] = useState(get);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(query);
    const on = () => setWide(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return wide;
}

const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(',')[0].trim();

type Pt = { latitude: number; longitude: number };
/** Rough distance (km) from a point to the road between two stops. */
function kmToLeg(p: Pt, a: Pt, b: Pt): number {
  const kx = 111.32 * Math.cos((p.latitude * Math.PI) / 180);
  const ky = 110.57;
  const [ax, ay, bx, by, px, py] = [a.longitude * kx, a.latitude * ky, b.longitude * kx, b.latitude * ky, p.longitude * kx, p.latitude * ky];
  const dx = bx - ax, dy = by - ay;
  const t = dx || dy ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function gemsForLeg(gems: HiddenGem[], a?: { latitude: number; longitude: number }, b?: { latitude: number; longitude: number }) {
  if (!a || !b) return [];
  const m = 0.35;
  const [lo, hi] = [Math.min(a.latitude, b.latitude) - m, Math.max(a.latitude, b.latitude) + m];
  const [lw, le] = [Math.min(a.longitude, b.longitude) - m, Math.max(a.longitude, b.longitude) + m];
  return gems.filter((g) => g.latitude && g.longitude && g.latitude >= lo && g.latitude <= hi && g.longitude >= lw && g.longitude <= le);
}

/** Pitchup's country pages (pitchup.com/campsites/<slug>/). */
const PITCHUP: Record<string, string> = {
  ES: 'spain', FR: 'france', IT: 'italy', NL: 'netherlands', DE: 'germany', PT: 'portugal', HR: 'croatia', AT: 'austria',
  CH: 'switzerland', BE: 'belgium', GR: 'greece', IE: 'ireland', SI: 'slovenia', DK: 'denmark', NO: 'norway', SE: 'sweden',
};

const STAY_TO_ACCOMMODATION: Record<StayType, AccommodationType> = { campsite: 'campsite', hotel: 'hotel', holiday_home: 'airbnb' };
const head = { fontWeight: 400, letterSpacing: '-0.03em' } as const;

export function TripResultsPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const { tripId } = useParams<{ tripId: string }>();
  const fromState = (location.state as { trip?: GeneratedTrip } | null)?.trip ?? null;
  const [trip, setTrip] = useState<GeneratedTrip | null>(fromState);
  const [loading, setLoading] = useState(!fromState);
  const [activeDay, setActiveDay] = useState(1);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [staysOpen, setStaysOpen] = useState(false);
  const [kindFilter, setKindFilter] = useState<string[]>([]);
  const [whoFilter, setWhoFilter] = useState<string[]>([]);
  const [picked, setPicked] = useState<Record<number, AccommodationOption>>({});
  const { isPremium: hasPlus } = useSubscription();
  const [passBusy, setPassBusy] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const wide = useWide();
  // Plus, or a Trip pass bought for this trip: every gem, the cheapest route and the PDF.
  const isPremium = hasPlus || trip?.planner?.pass === true || trip?.viewerPlus === true;
  usePageTitle(trip?.stops?.length ? t('trip.routeTitle', { from: town(trip.stops[0].location), to: town(trip.stops[trip.stops.length - 1].location) || trip.destination }) : trip?.destination);
  const contentRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  // Whoever planned the trip in this browser holds its edit key; a signed-in owner may change it anywhere.
  const canEdit = !!tripId && (!!editKeyFor(tripId) || !!trip?.yours);
  async function change(edit: TripEdit) {
    if (!tripId) return;
    setSaving(true);
    setEditError(null);
    try {
      setTrip(await sendEdit(tripId, edit));
    } catch (err) {
      setEditError(err instanceof Error ? err.message : t('trip.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!trip && tripId) {
      tripsApi
        .getById(tripId)
        .then((res) => setTrip(res.data as unknown as GeneratedTrip))
        .catch(() => setTrip(null))
        .finally(() => setLoading(false));
    }
  }, [tripId]);

  // Day by day: the trip opens with its route first and the day texts arrive one by one.
  const planning = trip?.planner?.planning === true;
  useEffect(() => {
    if (!planning || !tripId) return;
    let stop = false;
    const tick = setInterval(() => {
      tripsApi
        .getById(tripId)
        .then((res) => { if (!stop) setTrip(res.data as unknown as GeneratedTrip); })
        .catch(() => undefined);
    }, 2500);
    return () => { stop = true; clearInterval(tick); };
  }, [planning, tripId]);
  async function retry() {
    if (!tripId || !trip) return;
    setEditError(null);
    try {
      await retryDays(tripId);
      setTrip({ ...trip, planner: { ...trip.planner!, planning: true, failedDays: [] } });
    } catch (err) {
      setEditError(err instanceof Error ? err.message : t('trip.restartFailed'));
    }
  }

  const stops = trip?.stops ?? [];
  // Where the traveller sleeps after each day: the plan's own overnight town when it names one,
  // else the next stop; days past the last stop stay at the destination.
  const overnights = trip?.planner?.overnights ?? [];
  const nightIndex = (d: number): number => {
    const named = fold(overnights[d - 1] ?? '');
    const hit = named ? stops.findIndex((st) => { const f = fold(st.location); return !!f && (f.startsWith(named) || named.startsWith(f)); }) : -1;
    return hit >= 0 ? hit : Math.min(d, stops.length - 1);
  };
  const toIdx = nightIndex(activeDay);
  const fromIdx = activeDay === 1 ? 0 : nightIndex(activeDay - 1);
  const onRoad = toIdx !== fromIdx;
  const legFrom = stops[fromIdx];
  const legTo = stops[toIdx];
  const start = trip?.startDate ? new Date(trip.startDate) : null;
  // Consecutive nights in the same town are one stay: booked from the first night to the last.
  const nights = Math.max(1, trip?.days || (trip?.itinerary ?? []).length || 1);
  let firstNight = activeDay;
  while (firstNight > 1 && nightIndex(firstNight - 1) === toIdx) firstNight--;
  let lastNight = activeDay;
  while (lastNight + 1 <= nights && nightIndex(lastNight + 1) === toIdx) lastNight++;
  const checkin = start ? format(addDays(start, firstNight - 1), 'yyyy-MM-dd') : undefined;
  const checkout = start ? format(addDays(start, lastNight), 'yyyy-MM-dd') : undefined;
  // The day heading shows the day's own date, not the first night of the stay.
  const dayDate = start ? format(addDays(start, activeDay - 1), 'yyyy-MM-dd') : undefined;
  const planner = trip?.planner;
  const gemsOn = planner?.gemsEnabled ?? true;
  const stayTypes = (planner?.stayTypes ?? ['campsite', 'hotel']) as StayType[];
  // Trips made before the group size was asked: two adults.
  const travellers = planner?.travellers ?? 2;

  const { accommodations, isLoading: staysLoading } = useAccommodations({
    lat: legTo?.latitude,
    lng: legTo?.longitude,
    location: legTo?.location ?? trip?.destination ?? '',
    types: stayTypes.map((s) => STAY_TO_ACCOMMODATION[s]),
    checkin,
    checkout,
    adults: travellers,
    // Loaded for each day: tonight's stays and their prices show without a click.
    enabled: true,
  });

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label={t('trip.loading')}>
        <LoadingSpinner size={32} />
      </div>
    );
  }
  if (!trip) {
    return (
      <section className="mx-auto max-w-[640px] px-16 py-80 text-center">
        <h1 className="font-display text-[40px] text-ink" style={head}>{t('trip.notFound')}</h1>
        <p className="mt-12">{t('trip.notFoundBody')}</p>
        <Link to="/plan" className="btn-primary mt-24 no-underline">{t('nav.plan')}</Link>
      </section>
    );
  }

  const days = (trip.itinerary ?? []).slice(0, trip.days ?? undefined);
  const failedDays = planner?.failedDays ?? [];
  const day = days.find((d) => d.day === activeDay) ?? (planning || failedDays.includes(activeDay) ? undefined : days[0]);
  const dayNumbers = Array.from({ length: trip.days || days.length || 1 }, (_, i) => i + 1);
  const from = town(stops[0]?.location) || t('trip.start');
  const to = town(stops[stops.length - 1]?.location) || trip.destination;
  // The free plan shows three gems per trip (the server already holds the rest back).
  const hiddenIds = planner?.hiddenGems ?? [];
  // Gems per day (since 26 Nov) come already chosen by the server for the plan; older trips: three for free.
  const perDay = (trip.hiddenGems ?? []).some((g) => typeof g.day === 'number');
  const allGems = (isPremium || perDay ? (trip.hiddenGems ?? []) : (trip.hiddenGems ?? []).slice(0, 3)).filter((g) => !g.placeId || !hiddenIds.includes(g.placeId));
  const lockedGems = isPremium ? 0 : (trip.lockedGems ?? Math.max(0, (trip.hiddenGems ?? []).length - 3));
  // Each gem belongs to the one day whose road passes closest to it.
  const dayCount = trip.days || (trip.itinerary ?? []).length || 1;
  const legOf = (d: number) => [stops[d === 1 ? 0 : nightIndex(d - 1)], stops[nightIndex(d)]] as const;
  const dayOfGem = (g: Pt) => {
    let best = 0;
    let bestKm = Infinity;
    for (let d = 1; d <= dayCount; d++) {
      const [a, b] = legOf(d);
      if (!a || !b || a === b) continue;
      const km = kmToLeg(g, a, b);
      if (km < bestKm) [best, bestKm] = [d, km];
    }
    return best;
  };
  const legGems = gemsOn && onRoad ? gemsForLeg(allGems, legFrom, legTo).filter((g) => dayOfGem(g) === activeDay) : [];
  // Only gems on this day's road; older trips whose gems have no coordinates show the first few.
  const placed = allGems.some((g) => g.latitude && g.longitude);
  const showGems = !gemsOn ? [] : perDay ? allGems.filter((g) => g.day === activeDay) : placed ? legGems : allGems.slice(0, planner?.gemsPerDay ?? 3);
  // Plus: filter the day's gems by kind and by who they suit (OR inside a group, AND between groups).
  const kindOptions = [...new Set(allGems.map((g) => g.category).filter((c) => GEM_KIND[c]))];
  const whoOptions = [...new Set(allGems.flatMap((g) => g.audience ?? []).filter((a) => AUDIENCE[a]))];
  const shownGems = showGems.filter((g) => (!kindFilter.length || kindFilter.includes(g.category)) && (!whoFilter.length || (g.audience ?? []).some((a) => whoFilter.includes(a))));
  const sleepTown = town(legTo?.location) || trip.destination;
  // Tonight's country: where the road of the leg into tonight's stop ends.
  const legIn = toIdx > 0 ? planner?.legs?.[toIdx - 1] : undefined;
  const nightCountry = legIn?.countries[legIn.countries.length - 1]?.code;
  const pitchupSlug = nightCountry ? PITCHUP[nightCountry] : undefined;
  const renting = planner?.vehicle === 'campervan' || planner?.vehicle === 'caravan' ? 'campervan' : 'car';
  // The three best-rated real places to sleep tonight (searches like "Airbnb stays in" stay in the full list).
  const tonight = accommodations.filter((o) => o.type !== 'airbnb').sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 3);
  const weather = trip.weather?.find((w) => w.day === activeDay);
  // This day's road: the legs from last night's stop to tonight's.
  const dayLegs = planner?.legs?.slice(fromIdx, Math.max(fromIdx, toIdx)) ?? [];
  const dayKm = dayLegs.reduce((n, l) => n + l.km, 0);
  const dayHours = dayLegs.reduce((n, l) => n + l.hours, 0);
  const costToday = trip.costs ? dayCost(trip.costs, fromIdx, toIdx, activeDay < dayCount).total : null;
  const dayStops = [legFrom, ...showGems, legTo]
    .filter((p): p is NonNullable<typeof p> => !!p && !!p.latitude && !!p.longitude)
    .map((p) => ({ lat: p.latitude, lng: p.longitude, label: 'location' in p ? (p as { location: string }).location : (p as { name: string }).name }));
  const dayMapsUrl = buildGoogleMapsRouteUrl(dayStops);
  const sketchStops = stops.filter((s) => s.latitude && s.longitude).map((s) => ({ lat: s.latitude, lng: s.longitude, label: s.location }));
  const mapsUrl = buildGoogleMapsRouteUrl(sketchStops);
  const globe = (
    <MapBoundary>
    <Suspense fallback={<div className="rt-map" aria-hidden="true" />}>
    <GlobeMap
      stops={stops}
      gems={gemsOn ? allGems : []}
      route={planner?.route}
      dayGems={showGems.map((g) => g.name)}
      className="border border-rule"
    />
    </Suspense>
    </MapBoundary>
  );
  // A real Google map with the day's drive on top; the globe only when that image cannot load.
  const mapVersion = String(JSON.stringify([trip.days, planner?.overnights, hiddenIds]).split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7) >>> 0);
  const tripMap = trip.tripId ? (
    <TripMapImage tripId={trip.tripId} from={fromIdx} to={toIdx} version={mapVersion} href={mapsUrl} fallback={globe} />
  ) : globe;

  const go = (href: string) => goLink(href, trip!.tripId);
  const roamingOut = outsideRoamingCodes(planner?.legs).map((c) => countryName(c));

  async function buyPass() {
    setPassBusy(true);
    setPassError(null);
    try {
      const res = await apiClient.post<{ url: string }>('/stripe/trip-pass', { tripId: trip!.tripId });
      window.location.href = res.data.url;
    } catch {
      setPassError(t('trip.passSoon'));
      setPassBusy(false);
    }
  }

  async function exportPdf() {
    if (!contentRef.current) return;
    setExporting(true);
    try {
      await generateTripPDF(contentRef.current, trip!.destination, trip!.startDate);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div ref={contentRef} className="mx-auto max-w-[1240px] px-16 py-40 md:px-40">
      <div className="flex flex-wrap items-end justify-between gap-24">
        <div>
          <h1 className="font-display text-[40px] leading-[1.04] text-ink md:text-[60px]" style={head}>{t('trip.routeTitle', { from, to })}</h1>
          <ul className="mt-12 flex flex-wrap gap-x-24 gap-y-4 p-0 text-[18px]" style={{ listStyle: 'none' }}>
            <li>{t('trip.days', { count: trip.days })}</li>
            {trip.totalDistance > 0 && <li className="num">{formatNumber(Math.round(trip.totalDistance))} km</li>}
            {planner && <li>{t('trip.kmADay', { km: planner.kmPerDay })}</li>}
            {trip.costs && <li>{t('trip.total', { amount: euros(tripTotal(trip.costs, dayCount)) })}</li>}
          </ul>
        </div>
        <div className="flex flex-wrap gap-12">
          <Button
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? t('trip.linkCopied') : t('trip.copyLink')}
          </Button>
          {trip.tripId && (
            <ShareTrip
              tripId={trip.tripId}
              from={from}
              to={to}
              km={trip.totalDistance ?? 0}
              countries={[...new Set((planner?.legs ?? []).flatMap((l) => l.countries.map((c) => c.code)))]}
              totalGems={(trip.hiddenGems ?? []).length + (trip.lockedGems ?? 0)}
              signedIn={!!getAuthToken()}
            />
          )}
          {isPremium ? (
            <Button onClick={exportPdf} disabled={exporting}>{exporting ? t('trip.makingPdf') : t('trip.downloadPdf')}</Button>
          ) : (
            <Link to="/pricing" className="btn-header no-underline">{t('trip.pdfPlus')}</Link>
          )}
        </div>
      </div>

      {trip.costs?.cheaper && (
        <CheaperRoute cheaper={trip.costs.cheaper} isPremium={isPremium} canEdit={canEdit} busy={saving} onSwitch={() => void change({ type: 'route' })} />
      )}

      <nav aria-label={t('trip.daysNav')} className="mt-32 flex gap-8 overflow-x-auto pb-4">
        {dayNumbers.map((n) => {
          const ready = days.some((d) => d.day === n);
          return (
            <button
              key={n}
              type="button"
              aria-current={n === activeDay ? 'step' : undefined}
              onClick={() => setActiveDay(n)}
              className={`min-h-[48px] shrink-0 rounded-btn border px-20 text-[17px] ${n === activeDay ? 'border-ink bg-ink text-paper' : 'border-rule bg-paper text-ink'} ${ready ? '' : 'opacity-60'}`}
              style={{ fontWeight: 500 }}
            >
              {t('trip.day', { n })}
            </button>
          );
        })}
      </nav>
      {!wide && <div className="mt-16">{tripMap}</div>}

      <div className="trip-results-grid mt-32 grid gap-32">
        <div className="min-w-0">
          <section aria-labelledby="day-head" className="border-t border-rule pt-24">
            <p className="text-[16px] text-muted" style={{ fontWeight: 500 }}>
              {t('trip.day', { n: activeDay })}
              {dayDate ? `, ${formatDate(dayDate, undefined, { weekday: 'long', day: 'numeric', month: 'long' })}` : ''}
            </p>
            <h2 id="day-head" className="mt-4 font-display text-[32px] text-ink md:text-[40px]" style={head}>
              {onRoad ? t('trip.routeTitle', { from: town(legFrom?.location), to: sleepTown }) : t('trip.dayIn', { town: sleepTown })}
            </h2>
            <div className="day-glance" role="region" aria-label={t('trip.glance', { n: activeDay })}>
              <div><span className="day-glance-k">{t('trip.drive')}</span><span className="day-glance-v">{!onRoad ? t('trip.noLongDrive') : dayKm > 0 ? `${formatNumber(Math.round(dayKm))} km` : '–'}</span></div>
              <div><span className="day-glance-k">{t('trip.time')}</span><span className="day-glance-v">{onRoad && dayHours > 0 ? hoursLabel(dayHours) : '–'}</span></div>
              <div><span className="day-glance-k">{t('trip.weather')}</span><span className="day-glance-v">{weather ? `${Math.round(weather.temp)}°, ${t(`weather.${weather.condition}`, { defaultValue: weather.condition })}` : '–'}</span></div>
              <div><span className="day-glance-k">{t('trip.costToday')}</span><span className="day-glance-v">{costToday !== null ? euros(costToday) : '–'}</span></div>
            </div>
            <nav className="day-jump" aria-label={t('trip.jumpTo')}>
              {onRoad && <a href="#day-drive" className="kind-drive"><BlockIcon kind="drive" size={16} />{t('trip.drive')}</a>}
              {showGems.length > 0 && <a href="#day-gems" className="kind-gems"><BlockIcon kind="gems" size={16} />{t('trip.gemsCount', { count: showGems.length })}</a>}
              <a href="#day-plan" className="kind-plan"><BlockIcon kind="plan" size={16} />{t('trip.theDay')}</a>
              {trip.costs && <a href="#day-cost" className="kind-cost"><BlockIcon kind="cost" size={16} />{t('trip.costs')}</a>}
              <a href="#day-sleep" className="kind-sleep"><BlockIcon kind="sleep" size={16} />{t('trip.sleep')}</a>
            </nav>

            {onRoad && (
              <DayBlock kind="drive" id="day-drive" title={t('trip.theDrive')} meta={dayKm > 0 ? `${formatNumber(Math.round(dayKm))} km · ${hoursLabel(dayHours)}` : undefined}>
                <div className="drive-line">
                  <span className="stop" /><span>{town(legFrom?.location)}</span><span />
                  {showGems.map((g) => (
                    <Fragment key={`dl-${g.placeId ?? g.name}`}>
                      <span className="link" /><span /><span />
                      <span className="gem" /><span>{g.name}</span><span className="text-[14px] text-muted">{t('trip.gem')}</span>
                    </Fragment>
                  ))}
                  <span className="link" /><span /><span />
                  <span className="stop" /><span>{sleepTown}</span><span className="text-[14px] text-muted">{t('trip.tonight')}</span>
                </div>
                <div className="flex flex-wrap gap-8">
                  <a href={dayMapsUrl} target="_blank" rel="noopener noreferrer" className="btn-primary no-underline">{t('trip.navigate')}</a>
                  {legTo?.latitude && legTo?.longitude && (
                    <a href={`https://waze.com/ul?ll=${legTo.latitude},${legTo.longitude}&navigate=yes`} target="_blank" rel="noopener noreferrer" className="btn-header no-underline">Waze</a>
                  )}
                </div>
              </DayBlock>
            )}

            {(showGems.length > 0 || (canEdit && hiddenIds.length > 0)) && (
              <DayBlock kind="gems" id="day-gems" title={t('trip.gemsOnTheWay')} meta={t('trip.checkedOnGoogle')}>
                {showGems.length > 0 && (
                  <div>
                    {(kindOptions.length > 1 || whoOptions.length > 0) && (
                      <div className="mb-16 grid gap-8" aria-label={t('trip.filterGems')}>
                        <div className="flex flex-wrap gap-6">
                          {[...kindOptions.map((k) => ['kind', k, GEM_KIND[k]] as const), ...whoOptions.map((a) => ['who', a, AUDIENCE[a]] as const)].map(([group, value, label]) => {
                            const on = (group === 'kind' ? kindFilter : whoFilter).includes(value);
                            return (
                              <button
                                key={`${group}-${value}`}
                                type="button"
                                aria-pressed={on}
                                disabled={!isPremium}
                                onClick={() => (group === 'kind' ? setKindFilter : setWhoFilter)((f) => (on ? f.filter((x) => x !== value) : [...f, value]))}
                                className={`gem-filter ${on ? 'is-on' : ''}`}
                              >
                                {t(label)}
                              </button>
                            );
                          })}
                        </div>
                        {!isPremium && <Link to="/pricing" className="text-[15px] text-ink">{t('trip.filterWithPlus')}</Link>}
                      </div>
                    )}
                    {shownGems.length === 0 && (
                      <p className="text-[16px] text-muted">
                        {t('trip.noGemsLike')}{' '}
                        <button type="button" className="text-ink underline" onClick={() => { setKindFilter([]); setWhoFilter([]); }}>{t('trip.clearFilters')}</button>
                      </p>
                    )}
                    <ul className="grid gap-12 p-0 sm:grid-cols-2" style={{ listStyle: 'none' }}>
                      {shownGems.map((g) => (
                        <li key={g.placeId ?? g.name} className="grid gap-4 rounded-part border border-rule bg-paper p-16">
                          {g.photoUrl && (
                            <img src={g.photoUrl.startsWith('http') ? g.photoUrl : `${import.meta.env.VITE_BACKEND_URL ?? ''}${g.photoUrl}`} alt={g.name} loading="lazy" width={640} height={400} className="mb-8 aspect-[16/10] w-full rounded-part object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          )}
                          {g.photoCredit && <span className="text-[13px] text-muted">{t('trip.photoBy', { credit: g.photoCredit })}</span>}
                          <span className="flex flex-wrap gap-6">
                            {GEM_KIND[g.category] && <span className="gem-chip">{t(GEM_KIND[g.category])}</span>}
                            {(g.audience ?? []).map((a) => <span key={a} className="gem-chip gem-chip-who">{AUDIENCE[a] ? t(AUDIENCE[a]) : a}</span>)}
                          </span>
                          <span className="font-display text-[22px] text-ink" style={head}>{g.name}</span>
                          <GemProof placeId={g.placeId} rating={g.rating} reviews={g.reviews} />
                          {/* Real gems carry their rating as the description: the proof line already says it. */}
                          {!(g.rating && g.description?.startsWith('Rated ')) && <span>{g.description}</span>}
                          {g.address && <span className="text-[16px] text-muted">{g.address}</span>}
                          <a className="text-[17px] text-ink" href={g.mapsUrl ?? `https://www.google.com/maps/search/?api=1&query=${g.latitude},${g.longitude}`} target="_blank" rel="noopener noreferrer">
                            {t('trip.openInMaps')}
                          </a>
                          {g.placeId && (
                            <Link
                              className="text-[17px] text-ink"
                              to={`/community/post?${new URLSearchParams({ placeId: g.placeId, name: g.name, lat: String(g.latitude), lng: String(g.longitude), address: g.address ?? '' })}`}
                            >
                              {t('trip.postPhoto')}
                            </Link>
                          )}
                          {canEdit && g.placeId && (
                            <button type="button" disabled={saving} aria-label={t('trip.hideGem', { name: g.name })} onClick={() => void change({ type: 'hideGem', placeId: g.placeId! })} className="min-h-[48px] justify-self-start text-[17px] text-muted underline">
                              {t('trip.hide')}
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {trip.tripId && showGems.length > 0 && <OnTheRoad tripId={trip.tripId} gems={showGems} signedIn={!!getAuthToken()} />}

                {canEdit && hiddenIds.length > 0 && (
                  <button type="button" disabled={saving} onClick={() => hiddenIds.reduce((p, id) => p.then(() => change({ type: 'showGem', placeId: id })), Promise.resolve())} className="mt-12 min-h-[48px] text-[17px] text-ink underline">
                    {t('trip.showHidden', { count: hiddenIds.length })}
                  </button>
                )}

              </DayBlock>
            )}

            <DayBlock kind="plan" id="day-plan" title={t('trip.theDay')}>
                {!day && planning && (
                  <p className="text-[17px] text-muted" role="status">{t('trip.writingDay', { n: activeDay })}</p>
                )}
                {!day && !planning && failedDays.includes(activeDay) && (
                  <div role="alert">
                    <p className="text-[17px]">{t('trip.dayFailed', { n: activeDay })}</p>
                    {canEdit && (
                      <button type="button" onClick={() => void retry()} className="btn-primary mt-12">{t('trip.tryAgain')}</button>
                    )}
                  </div>
                )}
                {day && (
                  <div>
                    <ol className="p-0" style={{ listStyle: 'none' }}>
                      {(['morning', 'afternoon', 'evening'] as const).filter((s) => day[s]).map((s) => (
                        <li key={s} className="grid grid-cols-[96px_minmax(0,1fr)] gap-16 border-t border-rule py-16 first:border-t-0 first:pt-0">
                          <span className="text-[16px] text-muted">{day[s].time || t(`trip.slot.${s}`)}</span>
                          <span>
                            <span className="block text-ink" style={{ fontWeight: 500 }}>{day[s].activity}</span>
                            <span className="block">{day[s].description}</span>
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                <a href={go(`https://www.getyourguide.com/s/?q=${encodeURIComponent(sleepTown)}`)} target="_blank" rel="noopener noreferrer sponsored" className="inline-block text-[17px] text-ink">
                  {t('trip.thingsToDo', { town: sleepTown })}
                </a>
                <a href={go(`https://www.tiqets.com/en/search?q=${encodeURIComponent(sleepTown)}`)} target="_blank" rel="noopener noreferrer sponsored" className="block text-[17px] text-ink">
                  {t('trip.tickets', { town: sleepTown })}
                </a>

            </DayBlock>

            {trip.costs && (
              <DayCosts
                day={activeDay}
                costs={trip.costs}
                fromLeg={fromIdx}
                toLeg={toIdx}
                withNight={activeDay < dayCount}
                vehicle={planner?.vehicle}
                stay={stayTypes[0]}
              />
            )}

            <DayBlock kind="sleep" id="day-sleep" title={t('trip.sleepIn', { town: sleepTown })}>
                  {picked[activeDay] && <p className="mt-6">{t('trip.yourChoice', { name: picked[activeDay].name })}</p>}
                  {tonight.length > 0 && (
                    <ul aria-label={t('trip.staysTonight')} className="mt-16 grid gap-12 p-0" style={{ listStyle: 'none' }}>
                      {tonight.map((o) => (
                        <li key={o.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-16 gap-y-4 rounded-part border border-rule bg-paper p-16">
                          <span className="text-[18px] text-ink" style={{ fontWeight: 500 }}><span className="stay-tag">{t(STAY_TAG[o.type] ?? 'trip.stayTag.other')}</span>{o.name}</span>
                          <span className="num text-[18px] text-ink" style={{ fontWeight: 500 }}>{t('trip.aNight', { price: formatMoney(Math.round(o.pricePerNight), undefined, { whole: true }) })}</span>
                          <span className="text-[16px] text-muted">{o.rating ? t('trip.ratedGoogle', { rating: o.rating.toFixed(1) }) : t(`stay.${o.type === 'airbnb' ? 'holiday_home' : o.type === 'campsite' ? 'campsite' : 'hotel'}`)}</span>
                          <a href={go(o.affiliateUrl)} target="_blank" rel="noopener noreferrer sponsored" aria-label={t('trip.checkPricesFor', { name: o.name })} className="justify-self-end text-[17px] text-ink">
                            {t('trip.checkPrices')}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                  {tonight.length > 0 && <p className="mt-8 text-[15px] text-muted">{t('trip.pricesNote')}</p>}
                  <div className="mt-16 flex flex-wrap gap-12">
                    {stayTypes.map((s) => (
                      <a key={s} href={go(stayUrl(s, sleepTown, checkin, checkout, travellers))} target="_blank" rel="noopener noreferrer sponsored" className="btn-header no-underline">
                        {t(`stay.${s}`)}
                      </a>
                    ))}
                    <Button variant="primary" onClick={() => setStaysOpen(true)}>{tonight.length ? t('trip.moreStays') : t('trip.staysNearby')}</Button>
                  </div>
                  {stayTypes.includes('campsite') && pitchupSlug && (
                    <a href={go(`https://www.pitchup.com/campsites/${pitchupSlug}/`)} target="_blank" rel="noopener noreferrer sponsored" className="mt-12 inline-block text-[17px] text-ink">
                      {t('trip.pitchup', { country: countryName(nightCountry!) })}
                    </a>
                  )}
                  {canEdit && (
                    <div className="mt-20 grid gap-12 border-t border-rule pt-16 sm:grid-cols-2">
                      <label className="flex flex-col gap-[6px] text-[16px] text-muted" style={{ fontWeight: 500 }}>
                        {t('trip.moveStop')}
                        <select
                          disabled={saving}
                          value={toIdx}
                          onChange={(e) => void change({ type: 'night', day: activeDay, stopIndex: Number(e.target.value) })}
                          className="h-[52px] rounded-input border border-rule bg-paper px-12 text-[18px] text-ink"
                        >
                          {stops.map((st, i) => (i === 0 ? null : <option key={`${st.location}-${i}`} value={i}>{town(st.location)}</option>))}
                        </select>
                      </label>
                      <Button type="button" disabled={saving || dayCount >= 30} className="self-end" onClick={() => void change({ type: 'restDay', afterDay: activeDay })}>
                        {t('trip.addRestDay')}
                      </Button>
                    </div>
                  )}
                  {editError && <p className="mt-12 text-error" role="alert">{editError}</p>}
                  {saving && <p className="mt-12 text-[16px] text-muted" role="status">{t('trip.saving')}</p>}
            </DayBlock>
          </section>
        </div>

        <aside className="grid content-start gap-24">
          {wide && <div>{tripMap}</div>}
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-header no-underline">{t('trip.openRoute')}</a>
          {renting === 'campervan' ? (
            <Panel>
              <h3 className="font-display text-[24px] text-ink" style={head}>{t('trip.rentCamper')}</h3>
              <p className="mt-6">{t('trip.rentCamperBody', { town: from })}</p>
              <div className="mt-16 grid gap-8">
                <a href={go('https://roadsurfer.com/')} target="_blank" rel="noopener noreferrer sponsored" className="btn-primary w-full no-underline">Roadsurfer</a>
                <a href={go('https://indiecampers.com/')} target="_blank" rel="noopener noreferrer sponsored" className="btn-header w-full no-underline">Indie Campers</a>
              </div>
            </Panel>
          ) : (
          <Panel>
            <h3 className="font-display text-[24px] text-ink" style={head}>{t('trip.rentalCar')}</h3>
            <p className="mt-6">
              {start && trip.endDate
                ? t('trip.pickupDates', { from, to, start: formatDate(format(start, 'yyyy-MM-dd'), undefined, { day: 'numeric', month: 'long' }), end: formatDate(String(trip.endDate).slice(0, 10), undefined, { day: 'numeric', month: 'long' }) })
                : t('trip.pickup', { from, to })}
            </p>
            <p className="mt-6 text-ink" style={{ fontWeight: 500 }}>{t('trip.carFor', { car: t(carForGroup(travellers).key), count: travellers })}</p>
            <div className="mt-16 grid gap-8">
              {/* The traveller enters the places and dates on the partner's site. DiscoverCars compares the big rental firms; Localrent the local ones. */}
              <a href={go('https://www.discovercars.com/')} target="_blank" rel="noopener noreferrer sponsored" className="btn-primary w-full no-underline">{t('trip.compareCars')}</a>
              <a href={go('https://localrent.com/en')} target="_blank" rel="noopener noreferrer sponsored" className="btn-header w-full no-underline">Localrent</a>
            </div>
          </Panel>
          )}
          {roamingOut.length > 0 && (
            <Panel>
              <h3 className="font-display text-[24px] text-ink" style={head}>{t('trip.mobileData')}</h3>
              <p className="mt-6">{t('trip.roaming', { countries: roamingOut.join(', ') })}</p>
              <a href={go('https://www.airalo.com/')} target="_blank" rel="noopener noreferrer sponsored" className="btn-header mt-16 w-full no-underline">{t('trip.esim')}</a>
            </Panel>
          )}
          {trip.tripId && <ExplorerGems tripId={trip.tripId} />}
          {gemsOn && !isPremium && (
            <Panel>
              <h3 className="font-display text-[24px] text-ink" style={head}>{t('trip.everyGemPlus')}</h3>
              {lockedGems > 0 && <p className="mt-6 text-ink" style={{ fontWeight: 500 }}>{t('trip.moreGems', { count: lockedGems })}</p>}
              <p className="mt-6">{t('trip.plusPitch')}</p>
              <div className="mt-16 grid gap-8">
                <Button variant="primary" disabled={passBusy} onClick={() => void buyPass()} aria-label={t('trip.passLabel', { price: formatMoney(4.99) })}>
                  {passBusy ? t('trip.openingCheckout') : t('trip.passFor', { price: formatMoney(4.99) })}
                </Button>
                <Link to="/pricing" className="btn-header no-underline">{t('trip.seePlus')}</Link>
              </div>
              {passError && <p className="mt-8 text-[16px] text-muted" role="status">{passError}</p>}
            </Panel>
          )}
        </aside>
      </div>

      <Modal isOpen={staysOpen} title={t('trip.staysIn', { town: sleepTown })} onClose={() => setStaysOpen(false)}>
        {staysLoading ? (
          <div className="flex justify-center py-40"><LoadingSpinner size={28} /></div>
        ) : accommodations.length === 0 ? (
          <p className="py-24 text-center">{t('trip.noStays')}</p>
        ) : (
          <div className="mt-12 grid max-h-[60vh] gap-12 overflow-y-auto sm:grid-cols-2">
            {accommodations.map((a) => (
              <AccommodationCard
                key={a.id}
                accommodation={a}
                selected={picked[activeDay]?.id === a.id}
                onSelect={(acc) => {
                  setPicked((p) => ({ ...p, [activeDay]: acc }));
                  setStaysOpen(false);
                }}
              />
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
