import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { tripsApi } from '@/lib/api';
import { addDays, format } from 'date-fns';
import { Download, Share2, Sunrise, Sun, Sunset, Cloud, BedDouble, Lock, ExternalLink, MapPin, Car } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { TripMap } from '@/components/map/TripMap';
import { DestinationImage } from '@/components/display/DestinationImage';
import { AccommodationCard, ACCOMMODATION_TYPE_LABELS } from '@/components/display/AccommodationCard';
import { RentalCarCard } from '@/components/display/RentalCarCard';
import { Modal } from '@/components/utility/Modal';
import { LoadingSpinner } from '@/components/utility/LoadingSpinner';
import { useAccommodations } from '@/hooks/useAccommodations';
import { useSubscription } from '@/hooks/useSubscription';
import { generateTripPDF } from '@/utils/generatePDF';
import type { AccommodationOption, AccommodationType, GeneratedItineraryDay, GeneratedTrip } from '@/types';


const SLOT_CONFIG: Record<'morning' | 'afternoon' | 'evening', { label: string; icon: typeof Sunrise }> = {
  morning: { label: 'Morning', icon: Sunrise },
  afternoon: { label: 'Afternoon', icon: Sun },
  evening: { label: 'Evening', icon: Sunset },
};

function buildViatorUrl(activity: string, location: string): string {
  return `https://www.viator.com/search?text=${encodeURIComponent(`${activity} ${location}`)}`;
}
function buildGetYourGuideUrl(activity: string, location: string): string {
  return `https://www.getyourguide.com/s/?q=${encodeURIComponent(`${activity} ${location}`)}`;
}
function buildRentalcarsUrl(pickup: string, dropoff: string, from: string, to: string): string {
  return `https://www.rentalcars.com/en/?pickup-location=${encodeURIComponent(pickup)}&dropoff-location=${encodeURIComponent(dropoff)}&pickup-date=${from}&dropoff-date=${to}`;
}
function buildAutoEuropeUrl(pickup: string, from: string, to: string): string {
  function toEuDate(iso: string) {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }
  return `https://www.autoeurope.eu/car-hire/?locationA=${encodeURIComponent(pickup)}&dateFrom=${toEuDate(from)}&dateTo=${toEuDate(to)}`;
}
function buildMapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
function buildTheForkUrl(activity: string, location: string): string {
  return `https://www.thefork.com/search#cityName=${encodeURIComponent(location)}&searchPhrase=${encodeURIComponent(activity)}`;
}

const FOOD_KEYWORDS = ['dinner', 'restaurant', 'dining', 'lunch', 'food', 'eat', 'cuisine', 'cafe', 'café', 'bistro', 'brasserie', 'tavern', 'eatery'];

function isFoodActivity(slot: 'morning' | 'afternoon' | 'evening', activity: string): boolean {
  if (slot === 'evening') return true;
  const lower = activity.toLowerCase();
  return FOOD_KEYWORDS.some((kw) => lower.includes(kw));
}

function SlotRow({ slot, item }: { slot: 'morning' | 'afternoon' | 'evening'; item: GeneratedItineraryDay['morning'] }) {
  const { label, icon: Icon } = SLOT_CONFIG[slot];

  return (
    <div className="flex gap-12 rounded-container border border-lead/40 p-12 transition-colors hover:border-mercury-blue/30">
      <div className="flex h-32 w-32 flex-shrink-0 items-center justify-center rounded-full bg-mercury-blue/20 text-mercury-blue">
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-8">
          <p className="text-body-sm font-w480 text-starlight">{item.activity}</p>
          <span className="flex-shrink-0 text-caption text-silver">&euro;{item.estimatedCost}</span>
        </div>
        <p className="text-caption text-silver">
          {label} &middot; {item.time} &middot; {item.location}
        </p>
        <p className="mt-4 text-caption text-lead">{item.description}</p>
        {item.notes && <p className="mt-4 text-caption italic text-lead/80">{item.notes}</p>}
        <div className="mt-6 flex flex-wrap gap-8">
          <a href={buildViatorUrl(item.activity, item.location)} target="_blank" rel="noopener noreferrer sponsored"
            className="inline-flex items-center gap-4 text-caption text-mercury-blue/70 hover:text-mercury-blue">
            Viator <ExternalLink size={10} />
          </a>
          <span className="text-caption text-graphite">·</span>
          <a href={buildGetYourGuideUrl(item.activity, item.location)} target="_blank" rel="noopener noreferrer sponsored"
            className="inline-flex items-center gap-4 text-caption text-mercury-blue/70 hover:text-mercury-blue">
            GetYourGuide <ExternalLink size={10} />
          </a>
          {isFoodActivity(slot, item.activity) && (
            <>
              <span className="text-caption text-graphite">·</span>
              <a href={buildTheForkUrl(item.activity, item.location)} target="_blank" rel="noopener noreferrer sponsored"
                className="inline-flex items-center gap-4 text-caption text-mercury-blue/70 hover:text-mercury-blue">
                TheFork <ExternalLink size={10} />
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DayTabs({ days, activeDay, onSelect }: { days: GeneratedItineraryDay[]; activeDay: number; onSelect: (day: number) => void }) {
  return (
    <div className="flex flex-wrap gap-8">
      {days.map((day) => (
        <button
          key={day.day}
          onClick={() => onSelect(day.day)}
          className={clsx(
            'rounded-btn px-16 py-8 text-caption font-w480 transition-colors',
            activeDay === day.day
              ? 'bg-mercury-blue text-starlight'
              : 'bg-graphite text-silver hover:text-starlight'
          )}
        >
          Day {day.day}
        </button>
      ))}
    </div>
  );
}

export function TripResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { tripId } = useParams<{ tripId: string }>();
  const locationState = location.state as { trip?: GeneratedTrip; accommodationTypes?: AccommodationType[] } | null;
  const [trip, setTrip] = useState<GeneratedTrip | null>(locationState?.trip ?? null);
  const [tripLoading, setTripLoading] = useState(!locationState?.trip);
  const accommodationTypes: AccommodationType[] =
    locationState?.accommodationTypes && locationState.accommodationTypes.length > 0
      ? locationState.accommodationTypes
      : ['hotel', 'hostel', 'campsite', 'airbnb'];
  const { isPremium } = useSubscription();
  const [activeDay, setActiveDay] = useState(1);
  const [, setRentalCarModalOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [accommodationModalOpen, setAccommodationModalOpen] = useState(false);
  const [accommodationFilter, setAccommodationFilter] = useState<AccommodationType | 'all'>('all');
  const [selectedAccommodations, setSelectedAccommodations] = useState<Record<number, AccommodationOption>>({});
  const contentRef = useRef<HTMLDivElement>(null);

  const currentStop = trip?.stops[Math.min(activeDay - 1, trip.stops.length - 1)];
  const checkinDate = trip ? addDays(new Date(trip.startDate), activeDay - 1) : null;
  const checkin = checkinDate ? format(checkinDate, 'yyyy-MM-dd') : undefined;
  const checkout = checkinDate ? format(addDays(checkinDate, 1), 'yyyy-MM-dd') : undefined;

  useEffect(() => {
    if (!trip && tripId) {
      setTripLoading(true);
      tripsApi.getById(tripId)
        .then((res) => {
          const data = res.data as unknown as GeneratedTrip;
          setTrip(data);
        })
        .catch(() => setTrip(null))
        .finally(() => setTripLoading(false));
    }
  }, [tripId]);

  const { accommodations, isLoading: accommodationsLoading } = useAccommodations({
    lat: currentStop?.latitude,
    lng: currentStop?.longitude,
    location: currentStop?.location ?? trip?.destination ?? '',
    types: accommodationTypes,
    checkin,
    checkout,
    enabled: accommodationModalOpen,
  });

  if (tripLoading) {
    return (
      <div className="section flex justify-center py-80">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="section py-80 text-center">
        <h2 className="text-heading font-display font-w360 text-starlight">Trip not found</h2>
        <p className="mt-12 text-body-sm text-silver">
          This trip's data isn't available. Please generate a new trip.
        </p>
        <button onClick={() => navigate('/plan')} className="btn-primary mt-24">
          Plan a trip
        </button>
      </div>
    );
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  }

  async function handleDownloadPdf() {
    if (!contentRef.current || !trip) return;
    setIsExporting(true);
    try {
      await generateTripPDF(contentRef.current, trip.destination, trip.startDate);
    } finally {
      setIsExporting(false);
    }
  }

  const currentDay = trip.itinerary.find((d) => d.day === activeDay) ?? trip.itinerary[0];
  const slots: ('morning' | 'afternoon' | 'evening')[] = ['morning', 'afternoon', 'evening'];
  const dayWeather = trip.weather?.find((w) => w.day === activeDay);

  const accommodationFilterOptions: (AccommodationType | 'all')[] = ['all', ...accommodationTypes];

  const filteredAccommodations =
    accommodationFilter === 'all' ? accommodations : accommodations.filter((a) => a.type === accommodationFilter);

  const selectedAccommodation = selectedAccommodations[activeDay];

  function handleSelectAccommodation(accommodation: AccommodationOption) {
    setSelectedAccommodations((prev) => ({ ...prev, [activeDay]: accommodation }));
    setAccommodationModalOpen(false);
  }

  return (
    <motion.div
      ref={contentRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="section py-40"
    >
      {/* Hero banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative h-[260px] overflow-hidden rounded-container sm:h-[340px]"
      >
        <DestinationImage query={trip.destination} alt={trip.destination} className="h-full w-full" />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ backgroundImage: 'linear-gradient(180deg, rgba(9,9,9,0.2) 0%, rgba(9,9,9,0.75) 60%, rgba(9,9,9,0.95) 100%)' }}
        />
        <div className="absolute bottom-0 left-0 right-0 p-24 sm:p-32">
          <h1 className="text-heading font-display font-w360 text-starlight sm:text-heading-lg">{trip.destination}</h1>
          <div className="mt-8 flex flex-wrap items-center gap-x-16 gap-y-4 text-body-sm text-silver">
            <span>{format(new Date(trip.startDate), 'MMM d')} – {format(new Date(trip.endDate), 'MMM d, yyyy')}</span>
            <span className="hidden sm:inline text-lead">·</span>
            <span>{trip.days} days</span>
            <span className="hidden sm:inline text-lead">·</span>
            <span className="font-w480 text-starlight">&euro;{trip.totalCost.toLocaleString()}</span>
            <span className="hidden sm:inline text-lead">·</span>
            <span>{trip.totalDistance.toLocaleString()} km</span>
          </div>
        </div>
        {/* Action buttons in top-right */}
        <div className="absolute right-16 top-16 flex gap-8 sm:right-24 sm:top-24">
          <button
            onClick={handleShare}
            className="flex items-center gap-6 rounded-btn border border-starlight/20 bg-deep-space/60 px-12 py-8 text-caption text-starlight backdrop-blur-sm transition-colors hover:border-mercury-blue/60"
          >
            <Share2 size={14} /> {shareCopied ? 'Copied!' : 'Share'}
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={isExporting}
            className="flex items-center gap-6 rounded-btn border border-starlight/20 bg-deep-space/60 px-12 py-8 text-caption text-starlight backdrop-blur-sm transition-colors hover:border-mercury-blue/60 disabled:opacity-50"
          >
            <Download size={14} /> {isExporting ? 'Exporting...' : 'PDF'}
          </button>
        </div>
      </motion.div>

      <div className="mt-32 grid gap-24 lg:grid-cols-[1fr_360px]">
        {/* Center — map */}
        <div className="min-h-[420px] overflow-hidden rounded-container border border-lead/40">
          <TripMap
            stops={trip.stops}
            hiddenGems={trip.hiddenGems}
            accommodations={Object.values(selectedAccommodations)}
            className="h-full"
          />
        </div>

        {/* Right sidebar — day-by-day itinerary */}
        <aside className="rounded-container border border-lead/40 p-24">
          <h3 className="mb-12 text-body-sm font-w480 text-starlight">Itinerary</h3>
          <DayTabs days={trip.itinerary} activeDay={activeDay} onSelect={setActiveDay} />

          {dayWeather && (
            <div className="mt-12 flex items-center gap-8 text-caption text-silver">
              <Cloud size={14} />
              {dayWeather.temp}&deg;C &middot; {dayWeather.condition}
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeDay}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="mt-16 flex flex-col gap-8"
            >
              {currentDay &&
                slots.map((slot, i) => {
                  const item = currentDay[slot];
                  if (!item) return null;
                  return (
                    <motion.div
                      key={slot}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08, duration: 0.25 }}
                    >
                      <SlotRow slot={slot} item={item} />
                    </motion.div>
                  );
                })}
            </motion.div>
          </AnimatePresence>

          {/* Overnight stay */}
          <div className="mt-16 border-t border-lead/40 pt-16">
            <div className="flex items-center justify-between">
              <h3 className="text-body-sm font-w480 text-starlight">Overnight stay</h3>
              <button
                onClick={() => setAccommodationModalOpen(true)}
                className="btn-header flex items-center gap-4 text-caption"
              >
                <BedDouble size={14} /> {selectedAccommodation ? 'Change' : 'Add'}
              </button>
            </div>
            {selectedAccommodation && (
              <div className="mt-12">
                <AccommodationCard accommodation={selectedAccommodation} selected />
              </div>
            )}
          </div>

          {/* Rental car */}
          <div className="mt-16 border-t border-lead/40 pt-16">
            <div className="flex items-center justify-between mb-12">
              <h3 className="text-body-sm font-w480 text-starlight">Rental car</h3>
              <button
                onClick={() => setRentalCarModalOpen(true)}
                className="btn-header flex items-center gap-4 text-caption"
              >
                <Car size={14} /> Compare
              </button>
            </div>
            <RentalCarCard rental={{
              pickupLocation: trip.stops[0]?.location ?? trip.destination,
              dropoffLocation: trip.destination,
              pickupDate: format(new Date(trip.startDate), 'yyyy-MM-dd'),
              dropoffDate: format(new Date(trip.endDate), 'yyyy-MM-dd'),
              rentalcarsUrl: buildRentalcarsUrl(
                trip.stops[0]?.location ?? trip.destination,
                trip.destination,
                format(new Date(trip.startDate), 'yyyy-MM-dd'),
                format(new Date(trip.endDate), 'yyyy-MM-dd')
              ),
              autoeuropeUrl: buildAutoEuropeUrl(
                trip.stops[0]?.location ?? trip.destination,
                format(new Date(trip.startDate), 'yyyy-MM-dd'),
                format(new Date(trip.endDate), 'yyyy-MM-dd')
              ),
            }} />
          </div>
        </aside>
      </div>

      {/* Hidden gems — premium feature */}
      {trip.hiddenGems?.length > 0 && (
        <div className="relative mt-24 rounded-container border border-lead/40 p-24">
          <div className="flex items-center justify-between">
            <h3 className="text-body-sm font-w480 text-starlight">Local favourites & hidden spots</h3>
            {!isPremium && (
              <Link to="/pricing" className="flex items-center gap-6 text-caption text-mercury-blue hover:underline">
                <Lock size={12} /> Premium
              </Link>
            )}
          </div>

          {isPremium ? (
            <div className="mt-12 grid gap-12 sm:grid-cols-2">
              {trip.hiddenGems.map((gem, i) => {
                const badgeColor =
                  gem.category === 'restaurant' || gem.category === 'café' || gem.category === 'bar'
                    ? '#ffb648'
                    : gem.category === 'viewpoint' || gem.category === 'nature'
                    ? '#4ade80'
                    : gem.category === 'culture' || gem.category === 'historic'
                    ? '#af50ff'
                    : gem.category === 'activity' || gem.category === 'market'
                    ? '#60a5fa'
                    : '#454545';
                const badgeTextColor =
                  gem.category === 'viewpoint' || gem.category === 'nature' || gem.category === 'activity' || gem.category === 'market'
                    ? '#090909'
                    : '#f7f9fa';
                return (
                  <motion.div
                    key={gem.name}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.3 }}
                    className="overflow-hidden rounded-container border border-starlight/10 transition-colors hover:border-mercury-blue/30"
                  >
                    <DestinationImage query={`${gem.name}, ${trip.destination}`} alt={gem.name} className="h-[140px] w-full" />
                    <div className="p-12">
                      <div className="flex items-start justify-between gap-8">
                        <p className="text-body-sm font-w480 text-starlight leading-tight">{gem.name}</p>
                        <span
                          className="flex-shrink-0 rounded-full px-8 py-2 text-[10px] font-w480 capitalize"
                          style={{ backgroundColor: badgeColor, color: badgeTextColor }}
                        >
                          {gem.category}
                        </span>
                      </div>
                      {gem.address && (
                        <p className="mt-2 text-caption text-silver truncate">{gem.address}</p>
                      )}
                      <p className="mt-6 text-caption text-lead">{gem.description}</p>
                      {gem.address && (
                        <a
                          href={buildMapsUrl(gem.address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-6 inline-flex items-center gap-4 text-caption text-mercury-blue/60 hover:text-mercury-blue"
                        >
                          <MapPin size={10} /> Open in Maps
                        </a>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="relative mt-12">
              {/* Blurred preview of first 2 gems */}
              <div className="grid gap-12 select-none sm:grid-cols-2" style={{ filter: 'blur(6px)', pointerEvents: 'none' }}>
                {trip.hiddenGems.slice(0, 2).map((gem) => (
                  <div key={gem.name} className="overflow-hidden rounded-container border border-starlight/10">
                    <div className="h-[120px] w-full bg-gradient-to-br from-mercury-blue/20 via-plum/10 to-deep-space" />
                    <div className="p-12">
                      <p className="text-body-sm font-w480 text-starlight">{gem.name}</p>
                      <p className="mt-4 text-caption text-silver">{gem.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              {/* Upgrade overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-12 rounded-container bg-deep-space/60 backdrop-blur-[2px]">
                <Lock size={20} className="text-mercury-blue" />
                <p className="text-body-sm font-w480 text-starlight">Hidden gems are a Premium feature</p>
                <Link to="/pricing" className="btn-primary text-body-sm">
                  Unlock with Premium
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Highlights & tips */}
      <div className="mt-24 grid gap-24 lg:grid-cols-2">
        {trip.highlights?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="rounded-container border border-lead/40 p-24"
          >
            <h3 className="text-body-sm font-w480 text-starlight">Highlights</h3>
            <ul className="mt-12 flex flex-col gap-8">
              {trip.highlights.map((highlight, i) => (
                <motion.li
                  key={highlight}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.2 }}
                  className="text-caption text-silver"
                >
                  &bull; {highlight}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}

        {trip.tips?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="rounded-container border border-lead/40 p-24"
          >
            <h3 className="text-body-sm font-w480 text-starlight">Tips</h3>
            <ul className="mt-12 flex flex-col gap-8">
              {trip.tips.map((tip, i) => (
                <motion.li
                  key={tip}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.2 }}
                  className="text-caption text-silver"
                >
                  &bull; {tip}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>


      <Modal
        isOpen={accommodationModalOpen}
        title={`Overnight stay — Day ${activeDay}`}
        onClose={() => setAccommodationModalOpen(false)}
      >
        <div className="flex gap-8 overflow-x-auto pb-8">
          {accommodationFilterOptions.map((type) => (
            <button
              key={type}
              onClick={() => setAccommodationFilter(type)}
              className={clsx(
                'flex-shrink-0 rounded-btn px-12 py-6 text-caption font-w480 transition-colors',
                accommodationFilter === type
                  ? 'bg-mercury-blue text-starlight'
                  : 'bg-graphite text-silver hover:text-starlight'
              )}
            >
              {type === 'all' ? 'All' : ACCOMMODATION_TYPE_LABELS[type]}
            </button>
          ))}
        </div>

        {accommodationsLoading ? (
          <div className="flex justify-center py-40">
            <LoadingSpinner size={28} />
          </div>
        ) : filteredAccommodations.length === 0 ? (
          <p className="py-24 text-center text-body-sm text-silver">No accommodation options found nearby.</p>
        ) : (
          <div className="mt-12 grid max-h-[60vh] gap-12 overflow-y-auto sm:grid-cols-2">
            {filteredAccommodations.map((accommodation) => (
              <AccommodationCard
                key={accommodation.id}
                accommodation={accommodation}
                selected={selectedAccommodation?.id === accommodation.id}
                onSelect={handleSelectAccommodation}
              />
            ))}
          </div>
        )}
      </Modal>
    </motion.div>
  );
}
