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
import { STAY_LABELS, type StayType } from '@/lib/tripPlan';
import { goLink } from '@/lib/track';
import { carForGroup } from '@/lib/cars';
import { OnTheRoad } from '@/components/trip/OnTheRoad';
import { ExplorerGems } from '@/components/trip/ExplorerGems';
import { ShareTrip } from '@/components/trip/ShareTrip';
import { outsideRoaming } from '@/lib/roaming';
import { editKeyFor, retryDays, sendEdit, type TripEdit } from '@/lib/tripEdits';
import type { AccommodationOption, AccommodationType, GeneratedTrip, HiddenGem } from '@/types';
import { MapBoundary } from '@/components/map/MapBoundary';
import { TripMapImage } from '@/components/map/TripMapImage';

const town = (location?: string) => (location ?? '').split(',')[0].trim();
const GEM_KIND: Record<string, string> = {
  experience: 'Experience', food: 'Food & drink', nightlife: 'Night out', wellness: 'Wellness', culture: 'Culture', nature: 'Nature',
  hike: 'Hike', viewpoint: 'Viewpoint', historic: 'History', family: 'Day out',
};
const AUDIENCE: Record<string, string> = { family: 'Family', couples: 'Couples', friends: 'Friends' };
const STAY_TAG: Record<string, string> = { hotel: 'Hotel', campsite: 'Campsite', airbnb: 'Holiday home', hostel: 'Hostel' };
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
const COUNTRY_NAME: Record<string, string> = {
  ES: 'Spain', FR: 'France', IT: 'Italy', NL: 'the Netherlands', DE: 'Germany', PT: 'Portugal', HR: 'Croatia', AT: 'Austria',
  CH: 'Switzerland', BE: 'Belgium', GR: 'Greece', IE: 'Ireland', SI: 'Slovenia', DK: 'Denmark', NO: 'Norway', SE: 'Sweden',
};

const STAY_TO_ACCOMMODATION: Record<StayType, AccommodationType> = { campsite: 'campsite', hotel: 'hotel', holiday_home: 'airbnb' };
const head = { fontWeight: 400, letterSpacing: '-0.03em' } as const;

export function TripResultsPage() {
  const location = useLocation();
  const { tripId } = useParams<{ tripId: string }>();
  const fromState = (location.state as { trip?: GeneratedTrip } | null)?.trip ?? null;
  const [trip, setTrip] = useState<GeneratedTrip | null>(fromState);
  const [loading, setLoading] = useState(!fromState);
  const [activeDay, setActiveDay] = useState(1);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [staysOpen, setStaysOpen] = useState(false);
  const [picked, setPicked] = useState<Record<number, AccommodationOption>>({});
  const { isPremium: hasPlus } = useSubscription();
  const [passBusy, setPassBusy] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const wide = useWide();
  // Plus, or a Trip pass bought for this trip: every gem, the cheapest route and the PDF.
  const isPremium = hasPlus || trip?.planner?.pass === true;
  usePageTitle(trip?.stops?.length ? `${town(trip.stops[0].location)} to ${town(trip.stops[trip.stops.length - 1].location) || trip.destination}` : trip?.destination);
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
      setEditError(err instanceof Error ? err.message : 'The change could not be saved.');
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
      setEditError(err instanceof Error ? err.message : 'Could not start again.');
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
      <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Loading the trip">
        <LoadingSpinner size={32} />
      </div>
    );
  }
  if (!trip) {
    return (
      <section className="mx-auto max-w-[640px] px-16 py-80 text-center">
        <h1 className="font-display text-[40px] text-ink" style={head}>Trip not found</h1>
        <p className="mt-12">This trip is no longer here. Plan a new one in half a minute.</p>
        <Link to="/plan" className="btn-primary mt-24 no-underline">Plan a trip</Link>
      </section>
    );
  }

  const days = (trip.itinerary ?? []).slice(0, trip.days ?? undefined);
  const failedDays = planner?.failedDays ?? [];
  const day = days.find((d) => d.day === activeDay) ?? (planning || failedDays.includes(activeDay) ? undefined : days[0]);
  const dayNumbers = Array.from({ length: trip.days || days.length || 1 }, (_, i) => i + 1);
  const from = town(stops[0]?.location) || 'Start';
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
  const roamingOut = outsideRoaming(planner?.legs);

  async function buyPass() {
    setPassBusy(true);
    setPassError(null);
    try {
      const res = await apiClient.post<{ url: string }>('/stripe/trip-pass', { tripId: trip!.tripId });
      window.location.href = res.data.url;
    } catch {
      setPassError('Payments open soon. The Trip pass is not for sale yet.');
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
          <h1 className="font-display text-[40px] leading-[1.04] text-ink md:text-[60px]" style={head}>{`${from} to ${to}`}</h1>
          <ul className="mt-12 flex flex-wrap gap-x-24 gap-y-4 p-0 text-[18px]" style={{ listStyle: 'none' }}>
            <li>{trip.days} days</li>
            {trip.totalDistance > 0 && <li className="num">{Math.round(trip.totalDistance).toLocaleString('en')} km</li>}
            {planner && <li>About {planner.kmPerDay} km a day</li>}
            {trip.costs && <li>{`About ${euros(tripTotal(trip.costs, dayCount))} for the trip`}</li>}
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
            {copied ? 'Link copied' : 'Copy link'}
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
            <Button onClick={exportPdf} disabled={exporting}>{exporting ? 'Making the PDF' : 'Download PDF'}</Button>
          ) : (
            <Link to="/pricing" className="btn-header no-underline">PDF with Plus</Link>
          )}
        </div>
      </div>

      {trip.costs?.cheaper && (
        <CheaperRoute cheaper={trip.costs.cheaper} isPremium={isPremium} canEdit={canEdit} busy={saving} onSwitch={() => void change({ type: 'route' })} />
      )}

      <nav aria-label="Days" className="mt-32 flex gap-8 overflow-x-auto pb-4">
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
              Day {n}
            </button>
          );
        })}
      </nav>
      {!wide && <div className="mt-16">{tripMap}</div>}

      <div className="trip-results-grid mt-32 grid gap-32">
        <div className="min-w-0">
          <section aria-labelledby="day-head" className="border-t border-rule pt-24">
            <p className="text-[16px] text-muted" style={{ fontWeight: 500 }}>
              Day {activeDay}
              {dayDate ? `, ${format(new Date(dayDate), 'EEEE d MMMM')}` : ''}
            </p>
            <h2 id="day-head" className="mt-4 font-display text-[32px] text-ink md:text-[40px]" style={head}>
              {onRoad ? `${town(legFrom?.location)} to ${sleepTown}` : `A day in ${sleepTown}`}
            </h2>
            <div className="day-glance" role="region" aria-label={`Day ${activeDay} at a glance`}>
              <div><span className="day-glance-k">Drive</span><span className="day-glance-v">{!onRoad ? 'No long drive' : dayKm > 0 ? `${Math.round(dayKm).toLocaleString('en')} km` : '–'}</span></div>
              <div><span className="day-glance-k">Time</span><span className="day-glance-v">{onRoad && dayHours > 0 ? hoursLabel(dayHours) : '–'}</span></div>
              <div><span className="day-glance-k">Weather</span><span className="day-glance-v">{weather ? `${Math.round(weather.temp)}°, ${weather.condition}` : '–'}</span></div>
              <div><span className="day-glance-k">Cost today</span><span className="day-glance-v">{costToday !== null ? euros(costToday) : '–'}</span></div>
            </div>
            <nav className="day-jump" aria-label="Jump to">
              {onRoad && <a href="#day-drive" className="kind-drive"><BlockIcon kind="drive" size={16} />Drive</a>}
              {showGems.length > 0 && <a href="#day-gems" className="kind-gems"><BlockIcon kind="gems" size={16} />{`${showGems.length} gem${showGems.length === 1 ? '' : 's'}`}</a>}
              <a href="#day-plan" className="kind-plan"><BlockIcon kind="plan" size={16} />The day</a>
              {trip.costs && <a href="#day-cost" className="kind-cost"><BlockIcon kind="cost" size={16} />Costs</a>}
              <a href="#day-sleep" className="kind-sleep"><BlockIcon kind="sleep" size={16} />Sleep</a>
            </nav>

            {onRoad && (
              <DayBlock kind="drive" id="day-drive" title="The drive" meta={dayKm > 0 ? `${Math.round(dayKm).toLocaleString('en')} km · ${hoursLabel(dayHours)}` : undefined}>
                <div className="drive-line">
                  <span className="stop" /><span>{town(legFrom?.location)}</span><span />
                  {showGems.map((g) => (
                    <Fragment key={`dl-${g.placeId ?? g.name}`}>
                      <span className="link" /><span /><span />
                      <span className="gem" /><span>{g.name}</span><span className="text-[14px] text-muted">gem</span>
                    </Fragment>
                  ))}
                  <span className="link" /><span /><span />
                  <span className="stop" /><span>{sleepTown}</span><span className="text-[14px] text-muted">tonight</span>
                </div>
                <div className="flex flex-wrap gap-8">
                  <a href={dayMapsUrl} target="_blank" rel="noopener noreferrer" className="btn-primary no-underline">Navigate in Google Maps</a>
                  {legTo?.latitude && legTo?.longitude && (
                    <a href={`https://waze.com/ul?ll=${legTo.latitude},${legTo.longitude}&navigate=yes`} target="_blank" rel="noopener noreferrer" className="btn-header no-underline">Waze</a>
                  )}
                </div>
              </DayBlock>
            )}

            {(showGems.length > 0 || (canEdit && hiddenIds.length > 0)) && (
              <DayBlock kind="gems" id="day-gems" title="Gems on the way" meta="Checked on Google">
                {showGems.length > 0 && (
                  <div>
                    <ul className="grid gap-12 p-0 sm:grid-cols-2" style={{ listStyle: 'none' }}>
                      {showGems.map((g) => (
                        <li key={g.placeId ?? g.name} className="grid gap-4 rounded-part border border-rule bg-paper p-16">
                          {g.photoUrl && (
                            <img src={g.photoUrl.startsWith('http') ? g.photoUrl : `${import.meta.env.VITE_BACKEND_URL ?? ''}${g.photoUrl}`} alt={g.name} loading="lazy" width={640} height={400} className="mb-8 aspect-[16/10] w-full rounded-part object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          )}
                          {g.photoCredit && <span className="text-[13px] text-muted">{`Photo: ${g.photoCredit}`}</span>}
                          <span className="flex flex-wrap gap-6">
                            {GEM_KIND[g.category] && <span className="gem-chip">{GEM_KIND[g.category]}</span>}
                            {(g.audience ?? []).map((a) => <span key={a} className="gem-chip gem-chip-who">{AUDIENCE[a] ?? a}</span>)}
                          </span>
                          <span className="font-display text-[22px] text-ink" style={head}>{g.name}</span>
                          <GemProof placeId={g.placeId} rating={g.rating} reviews={g.reviews} />
                          {/* Real gems carry their rating as the description: the proof line already says it. */}
                          {!(g.rating && g.description?.startsWith('Rated ')) && <span>{g.description}</span>}
                          {g.address && <span className="text-[16px] text-muted">{g.address}</span>}
                          <a className="text-[17px] text-ink" href={g.mapsUrl ?? `https://www.google.com/maps/search/?api=1&query=${g.latitude},${g.longitude}`} target="_blank" rel="noopener noreferrer">
                            Open in Google Maps
                          </a>
                          {g.placeId && (
                            <Link
                              className="text-[17px] text-ink"
                              to={`/community/post?${new URLSearchParams({ placeId: g.placeId, name: g.name, lat: String(g.latitude), lng: String(g.longitude), address: g.address ?? '' })}`}
                            >
                              Post a photo here
                            </Link>
                          )}
                          {canEdit && g.placeId && (
                            <button type="button" disabled={saving} aria-label={`Hide ${g.name}`} onClick={() => void change({ type: 'hideGem', placeId: g.placeId! })} className="min-h-[48px] justify-self-start text-[17px] text-muted underline">
                              Hide
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
                    {`Show ${hiddenIds.length} hidden gem${hiddenIds.length === 1 ? '' : 's'}`}
                  </button>
                )}

              </DayBlock>
            )}

            <DayBlock kind="plan" id="day-plan" title="The day">
                {!day && planning && (
                  <p className="text-[17px] text-muted" role="status">{`Writing day ${activeDay}. It appears here in a few seconds.`}</p>
                )}
                {!day && !planning && failedDays.includes(activeDay) && (
                  <div role="alert">
                    <p className="text-[17px]">{`Day ${activeDay} could not be written.`}</p>
                    {canEdit && (
                      <button type="button" onClick={() => void retry()} className="btn-primary mt-12">Try again</button>
                    )}
                  </div>
                )}
                {day && (
                  <div>
                    <ol className="p-0" style={{ listStyle: 'none' }}>
                      {(['morning', 'afternoon', 'evening'] as const).filter((s) => day[s]).map((s) => (
                        <li key={s} className="grid grid-cols-[96px_minmax(0,1fr)] gap-16 border-t border-rule py-16 first:border-t-0 first:pt-0">
                          <span className="text-[16px] text-muted">{day[s].time || s}</span>
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
                  {`Things to do in ${sleepTown}`}
                </a>
                <a href={go(`https://www.tiqets.com/en/search?q=${encodeURIComponent(sleepTown)}`)} target="_blank" rel="noopener noreferrer sponsored" className="block text-[17px] text-ink">
                  {`Tickets for sights in ${sleepTown}`}
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

            <DayBlock kind="sleep" id="day-sleep" title={`Sleep in ${sleepTown}`}>
                  {picked[activeDay] && <p className="mt-6">Your choice: {picked[activeDay].name}</p>}
                  {tonight.length > 0 && (
                    <ul aria-label="Stays tonight" className="mt-16 grid gap-12 p-0" style={{ listStyle: 'none' }}>
                      {tonight.map((o) => (
                        <li key={o.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-16 gap-y-4 rounded-part border border-rule bg-paper p-16">
                          <span className="text-[18px] text-ink" style={{ fontWeight: 500 }}><span className="stay-tag">{STAY_TAG[o.type] ?? 'Stay'}</span>{o.name}</span>
                          <span className="num text-[18px] text-ink" style={{ fontWeight: 500 }}>{`About €${Math.round(o.pricePerNight)} a night`}</span>
                          <span className="text-[16px] text-muted">{o.rating ? `Rated ${o.rating.toFixed(1)} on Google` : STAY_LABELS[o.type === 'airbnb' ? 'holiday_home' : o.type === 'campsite' ? 'campsite' : 'hotel']}</span>
                          <a href={go(o.affiliateUrl)} target="_blank" rel="noopener noreferrer sponsored" aria-label={`Check prices for ${o.name}`} className="justify-self-end text-[17px] text-ink">
                            Check prices
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                  {tonight.length > 0 && <p className="mt-8 text-[15px] text-muted">Prices are estimates from the place's price level. The booking site shows the real price for your dates.</p>}
                  <div className="mt-16 flex flex-wrap gap-12">
                    {stayTypes.map((s) => (
                      <a key={s} href={go(stayUrl(s, sleepTown, checkin, checkout, travellers))} target="_blank" rel="noopener noreferrer sponsored" className="btn-header no-underline">
                        {STAY_LABELS[s]}
                      </a>
                    ))}
                    <Button variant="primary" onClick={() => setStaysOpen(true)}>{tonight.length ? 'More stays' : 'Stays nearby'}</Button>
                  </div>
                  {stayTypes.includes('campsite') && pitchupSlug && (
                    <a href={go(`https://www.pitchup.com/campsites/${pitchupSlug}/`)} target="_blank" rel="noopener noreferrer sponsored" className="mt-12 inline-block text-[17px] text-ink">
                      {`Campsites in ${COUNTRY_NAME[nightCountry!]} on Pitchup`}
                    </a>
                  )}
                  {canEdit && (
                    <div className="mt-20 grid gap-12 border-t border-rule pt-16 sm:grid-cols-2">
                      <label className="flex flex-col gap-[6px] text-[16px] text-muted" style={{ fontWeight: 500 }}>
                        Move tonight's stop
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
                        Add a rest day here
                      </Button>
                    </div>
                  )}
                  {editError && <p className="mt-12 text-error" role="alert">{editError}</p>}
                  {saving && <p className="mt-12 text-[16px] text-muted" role="status">Saving the change</p>}
            </DayBlock>
          </section>
        </div>

        <aside className="grid content-start gap-24">
          {wide && <div>{tripMap}</div>}
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-header no-underline">Open the route in Google Maps</a>
          {renting === 'campervan' ? (
            <Panel>
              <h3 className="font-display text-[24px] text-ink" style={head}>Rent a campervan</h3>
              <p className="mt-6">{`No campervan of your own? Pick one up near ${from}.`}</p>
              <div className="mt-16 grid gap-8">
                <a href={go('https://roadsurfer.com/')} target="_blank" rel="noopener noreferrer sponsored" className="btn-primary w-full no-underline">Roadsurfer</a>
                <a href={go('https://indiecampers.com/')} target="_blank" rel="noopener noreferrer sponsored" className="btn-header w-full no-underline">Indie Campers</a>
              </div>
            </Panel>
          ) : (
          <Panel>
            <h3 className="font-display text-[24px] text-ink" style={head}>Rental car</h3>
            <p className="mt-6">
              {start && trip.endDate
                ? `Pick up in ${from} on ${format(start, 'd MMMM')}, drop off in ${to} on ${format(new Date(trip.endDate), 'd MMMM')}.`
                : `Pick up in ${from}, drop off in ${to}.`}
            </p>
            <p className="mt-6 text-ink" style={{ fontWeight: 500 }}>{`${carForGroup(travellers).label} for ${travellers} ${travellers === 1 ? 'traveller' : 'travellers'}.`}</p>
            <div className="mt-16 grid gap-8">
              {/* The traveller enters the places and dates on the partner's site. DiscoverCars compares the big rental firms; Localrent the local ones. */}
              <a href={go('https://www.discovercars.com/')} target="_blank" rel="noopener noreferrer sponsored" className="btn-primary w-full no-underline">Compare cars</a>
              <a href={go('https://localrent.com/en')} target="_blank" rel="noopener noreferrer sponsored" className="btn-header w-full no-underline">Localrent</a>
            </div>
          </Panel>
          )}
          {roamingOut.length > 0 && (
            <Panel>
              <h3 className="font-display text-[24px] text-ink" style={head}>Mobile data</h3>
              <p className="mt-6">{`EU roaming does not cover ${roamingOut.join(', ')}. Data there can cost extra on a plan from home; a travel eSIM is often cheaper.`}</p>
              <a href={go('https://www.airalo.com/')} target="_blank" rel="noopener noreferrer sponsored" className="btn-header mt-16 w-full no-underline">eSIM from Airalo</a>
            </Panel>
          )}
          {trip.tripId && <ExplorerGems tripId={trip.tripId} />}
          {gemsOn && !isPremium && (
            <Panel>
              <h3 className="font-display text-[24px] text-ink" style={head}>Every gem with Plus</h3>
              {lockedGems > 0 && <p className="mt-6 text-ink" style={{ fontWeight: 500 }}>{`${lockedGems} more gems on this trip with Plus.`}</p>}
              <p className="mt-6">Unlimited trips, every gem on the route and a printable trip.</p>
              <div className="mt-16 grid gap-8">
                <Button variant="primary" disabled={passBusy} onClick={() => void buyPass()} aria-label="Get the Trip pass for this trip, €4.99">
                  {passBusy ? 'Opening checkout' : 'Trip pass for this trip, €4.99'}
                </Button>
                <Link to="/pricing" className="btn-header no-underline">See Plus</Link>
              </div>
              {passError && <p className="mt-8 text-[16px] text-muted" role="status">{passError}</p>}
            </Panel>
          )}
        </aside>
      </div>

      <Modal isOpen={staysOpen} title={`Stays in ${sleepTown}`} onClose={() => setStaysOpen(false)}>
        {staysLoading ? (
          <div className="flex justify-center py-40"><LoadingSpinner size={28} /></div>
        ) : accommodations.length === 0 ? (
          <p className="py-24 text-center">No stays found nearby. Try the booking buttons for more choice.</p>
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
