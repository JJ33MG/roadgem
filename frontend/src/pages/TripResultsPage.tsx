import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { addDays, format } from 'date-fns';
import { tripsApi } from '@/lib/api';
import { AccommodationCard } from '@/components/display/AccommodationCard';
import { Modal } from '@/components/utility/Modal';
import { LoadingSpinner } from '@/components/utility/LoadingSpinner';
import { RouteSketch } from '@/components/map/RouteSketch';
import { Button, Panel } from '@/components/ui';
import { useAccommodations } from '@/hooks/useAccommodations';
import { useSubscription } from '@/hooks/useSubscription';
import { generateTripPDF } from '@/utils/generatePDF';
import { buildGoogleMapsRouteUrl } from '@/components/display/GlobeView';
import { STAY_LABELS, type StayType } from '@/lib/tripPlan';
import { partnerFor, trackClick } from '@/lib/track';
import type { AccommodationOption, AccommodationType, GeneratedTrip, HiddenGem } from '@/types';

const town = (location?: string) => (location ?? '').split(',')[0].trim();

/** Booking links per stay type: Booking.com lists hotels and campsites, Airbnb the holiday homes. */
export function stayUrl(type: StayType, place: string, checkin?: string, checkout?: string): string {
  if (type === 'holiday_home') {
    const p = new URLSearchParams({ ...(checkin ? { checkin } : {}), ...(checkout ? { checkout } : {}) });
    return `https://www.airbnb.com/s/${encodeURIComponent(place)}/homes?${p}`;
  }
  const p = new URLSearchParams({ ss: place, ...(checkin ? { checkin } : {}), ...(checkout ? { checkout } : {}) });
  if (type === 'campsite') p.set('nflt', 'ht_id=214');
  return `https://www.booking.com/searchresults.html?${p}`;
}

function rentalUrl(pickup: string, dropoff: string, from: string, to: string) {
  return `https://www.rentalcars.com/en/?pickup-location=${encodeURIComponent(pickup)}&dropoff-location=${encodeURIComponent(dropoff)}&pickup-date=${from}&dropoff-date=${to}`;
}

/** Gems near one day's leg: inside the leg's box (with a little margin), else none. */
function gemsForLeg(gems: HiddenGem[], a?: { latitude: number; longitude: number }, b?: { latitude: number; longitude: number }) {
  if (!a || !b) return [];
  const m = 0.35;
  const [lo, hi] = [Math.min(a.latitude, b.latitude) - m, Math.max(a.latitude, b.latitude) + m];
  const [lw, le] = [Math.min(a.longitude, b.longitude) - m, Math.max(a.longitude, b.longitude) + m];
  return gems.filter((g) => g.latitude && g.longitude && g.latitude >= lo && g.latitude <= hi && g.longitude >= lw && g.longitude <= le);
}

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
  const { isPremium } = useSubscription();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!trip && tripId) {
      tripsApi
        .getById(tripId)
        .then((res) => setTrip(res.data as unknown as GeneratedTrip))
        .catch(() => setTrip(null))
        .finally(() => setLoading(false));
    }
  }, [tripId]);

  const stops = trip?.stops ?? [];
  const legFrom = stops[Math.min(activeDay - 1, Math.max(0, stops.length - 2))];
  const legTo = stops[Math.min(activeDay, stops.length - 1)];
  const start = trip?.startDate ? new Date(trip.startDate) : null;
  const checkin = start ? format(addDays(start, activeDay - 1), 'yyyy-MM-dd') : undefined;
  const checkout = start ? format(addDays(start, activeDay), 'yyyy-MM-dd') : undefined;
  const planner = trip?.planner;
  const gemsOn = planner?.gemsEnabled ?? true;
  const stayTypes = (planner?.stayTypes ?? ['campsite', 'hotel']) as StayType[];

  const { accommodations, isLoading: staysLoading } = useAccommodations({
    lat: legTo?.latitude,
    lng: legTo?.longitude,
    location: legTo?.location ?? trip?.destination ?? '',
    types: stayTypes.map((s) => STAY_TO_ACCOMMODATION[s]),
    checkin,
    checkout,
    enabled: staysOpen,
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
  const day = days.find((d) => d.day === activeDay) ?? days[0];
  const from = town(stops[0]?.location) || 'Start';
  const to = town(stops[stops.length - 1]?.location) || trip.destination;
  const legGems = gemsOn ? gemsForLeg(trip.hiddenGems ?? [], legFrom, legTo) : [];
  const showGems = gemsOn ? (legGems.length ? legGems : (trip.hiddenGems ?? []).slice(0, planner?.gemsPerDay ?? 3)) : [];
  const sleepTown = town(legTo?.location) || trip.destination;
  const weather = trip.weather?.find((w) => w.day === activeDay);
  const sketchStops = stops.filter((s) => s.latitude && s.longitude).map((s) => ({ lat: s.latitude, lng: s.longitude, label: s.location }));
  const sketchGems = gemsOn ? (trip.hiddenGems ?? []).filter((g) => g.latitude && g.longitude).map((g) => ({ lat: g.latitude, lng: g.longitude, label: g.name })) : [];
  const mapsUrl = buildGoogleMapsRouteUrl(sketchStops);
  const endStr = trip.endDate ? format(new Date(trip.endDate), 'yyyy-MM-dd') : '';
  const startStr = start ? format(start, 'yyyy-MM-dd') : '';

  function countClick(e: React.MouseEvent<HTMLAnchorElement>) {
    const partner = partnerFor(e.currentTarget.href);
    if (partner) trackClick(partner, trip!.tripId);
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
            {copied ? 'Link copied' : 'Share'}
          </Button>
          <Button onClick={exportPdf} disabled={exporting}>{exporting ? 'Making the PDF' : 'Download PDF'}</Button>
        </div>
      </div>

      <nav aria-label="Days" className="mt-32 flex gap-8 overflow-x-auto pb-4">
        {days.map((d) => (
          <button
            key={d.day}
            type="button"
            aria-current={d.day === activeDay ? 'step' : undefined}
            onClick={() => setActiveDay(d.day)}
            className={`min-h-[48px] shrink-0 rounded-btn border px-20 text-[17px] ${d.day === activeDay ? 'border-ink bg-ink text-paper' : 'border-rule bg-paper text-ink'}`}
            style={{ fontWeight: 500 }}
          >
            Day {d.day}
          </button>
        ))}
      </nav>

      <div className="trip-results-grid mt-32 grid gap-32">
        <div className="min-w-0">
          <section aria-labelledby="day-head" className="border-t border-rule pt-24">
            <p className="text-[16px] text-muted" style={{ fontWeight: 500 }}>
              Day {activeDay}
              {checkin ? `, ${format(new Date(checkin), 'EEEE d MMMM')}` : ''}
            </p>
            <h2 id="day-head" className="mt-4 font-display text-[32px] text-ink md:text-[40px]" style={head}>
              {`${town(legFrom?.location)} to ${sleepTown}`}
            </h2>
            {weather && <p className="mt-8 text-[17px]">{`${weather.condition}, ${Math.round(weather.temp)}°`}</p>}

            {showGems.length > 0 && (
              <div className="mt-24">
                <h3 className="text-[19px] text-ink" style={{ fontWeight: 500 }}>Gems on the way</h3>
                <ul className="mt-12 grid gap-12 p-0" style={{ listStyle: 'none' }}>
                  {showGems.map((g) => (
                    <li key={g.name} className="grid gap-4 rounded-part border border-rule bg-paper p-16">
                      <span className="font-display text-[22px] text-ink" style={head}>{g.name}</span>
                      <span>{g.description}</span>
                      <a className="text-[17px] text-ink" href={`https://www.google.com/maps/search/?api=1&query=${g.latitude},${g.longitude}`} target="_blank" rel="noopener noreferrer">
                        Open in Google Maps
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {day && (
              <div className="mt-24">
                <h3 className="text-[19px] text-ink" style={{ fontWeight: 500 }}>The day</h3>
                <ol className="mt-8 p-0" style={{ listStyle: 'none' }}>
                  {(['morning', 'afternoon', 'evening'] as const).filter((s) => day[s]).map((s) => (
                    <li key={s} className="grid grid-cols-[96px_minmax(0,1fr)] gap-16 border-t border-rule py-16">
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

            <Panel className="mt-24">
              <h3 className="font-display text-[26px] text-ink" style={head}>Sleep in {sleepTown}</h3>
              {picked[activeDay] && <p className="mt-6">Your choice: {picked[activeDay].name}</p>}
              <div className="mt-16 flex flex-wrap gap-12">
                {stayTypes.map((s) => (
                  <a key={s} href={stayUrl(s, sleepTown, checkin, checkout)} target="_blank" rel="noopener noreferrer sponsored" onClick={countClick} className="btn-header no-underline">
                    {STAY_LABELS[s]}
                  </a>
                ))}
                <Button variant="primary" onClick={() => setStaysOpen(true)}>Stays nearby</Button>
              </div>
            </Panel>
          </section>
        </div>

        <aside className="grid content-start gap-24">
          <div className="overflow-hidden rounded-card border border-rule">
            <RouteSketch stops={sketchStops} gems={sketchGems} activeLeg={Math.min(activeDay - 1, Math.max(0, sketchStops.length - 2))} />
          </div>
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-header no-underline">Open the route in Google Maps</a>
          <Panel>
            <h3 className="font-display text-[24px] text-ink" style={head}>Rental car</h3>
            <p className="mt-6">{`Pick up in ${from}, drop off in ${to}.`}</p>
            <a href={rentalUrl(stops[0]?.location ?? from, stops[stops.length - 1]?.location ?? to, startStr, endStr)} target="_blank" rel="noopener noreferrer sponsored" onClick={countClick} className="btn-primary mt-16 w-full no-underline">
              Find a car
            </a>
          </Panel>
          {gemsOn && !isPremium && (
            <Panel>
              <h3 className="font-display text-[24px] text-ink" style={head}>Every gem with Plus</h3>
              <p className="mt-6">Unlimited trips, every gem on the route and a printable trip.</p>
              <Link to="/pricing" className="btn-header mt-16 no-underline">See Plus</Link>
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
