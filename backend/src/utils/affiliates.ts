import dotenv from 'dotenv';
dotenv.config();

// --- Accommodation ---

export function buildBookingUrl(query: string, checkin?: string, checkout?: string): string {
  const params = new URLSearchParams({ ss: query });
  if (checkin) params.set('checkin', checkin);
  if (checkout) params.set('checkout', checkout);
  const aid = process.env.BOOKING_AFFILIATE_ID;
  if (aid) params.set('aid', aid);
  return `https://www.booking.com/searchresults.html?${params.toString()}`;
}

export function buildAirbnbUrl(query: string, checkin?: string, checkout?: string): string {
  const params = new URLSearchParams();
  if (checkin) params.set('checkin', checkin);
  if (checkout) params.set('checkout', checkout);
  const af = process.env.AIRBNB_AFFILIATE_ID;
  if (af) params.set('af', af);
  const qs = params.toString();
  return `https://www.airbnb.com/s/${encodeURIComponent(query)}/homes${qs ? `?${qs}` : ''}`;
}

// --- Activities & Tours ---

export function buildViatorUrl(activity: string, location: string): string {
  const q = encodeURIComponent(`${activity} ${location}`);
  const pid = process.env.VIATOR_AFFILIATE_ID;
  const base = `https://www.viator.com/search?text=${q}`;
  return pid ? `${base}&pid=${pid}` : base;
}

export function buildGetYourGuideUrl(activity: string, location: string): string {
  const q = encodeURIComponent(`${activity} ${location}`);
  const pid = process.env.GETYOURGUIDE_AFFILIATE_ID;
  const base = `https://www.getyourguide.com/s/?q=${q}`;
  return pid ? `${base}&partner_id=${pid}` : base;
}

// --- Restaurants ---

export function buildTheForkUrl(restaurantName: string, location: string): string {
  const q = encodeURIComponent(`${restaurantName} ${location}`);
  return `https://www.thefork.com/search#cityName=${encodeURIComponent(location)}&searchPhrase=${q}`;
}

// --- Train & Bus ---

export function buildTrainlineUrl(
  origin: string,
  destination: string,
  departureDate?: string
): string {
  const params = new URLSearchParams({
    origin,
    destination,
    outboundDate: departureDate ?? '',
    transportModes: 'train',
  });
  const affiliate = process.env.TRAINLINE_AFFILIATE_ID;
  // Trainline affiliate uses impact.com — partner ID appended as utm source until full integration
  const base = `https://www.trainline.eu/search/${encodeURIComponent(origin)}/${encodeURIComponent(destination)}`;
  return affiliate ? `${base}?utm_source=routify&utm_medium=affiliate&ref=${affiliate}` : base;
}

export function buildOmioUrl(
  origin: string,
  destination: string,
  departureDate?: string
): string {
  const params = new URLSearchParams({ origin, destination });
  if (departureDate) params.set('departure', departureDate);
  const affiliate = process.env.OMIO_AFFILIATE_ID;
  if (affiliate) params.set('ref', affiliate);
  return `https://www.omio.com/results?${params.toString()}`;
}

export function buildFlixbusUrl(origin: string, destination: string): string {
  const q = `${encodeURIComponent(origin)}-${encodeURIComponent(destination)}`;
  const affiliate = process.env.FLIXBUS_AFFILIATE_ID;
  const base = `https://shop.flixbus.com/search?rideDate=&departureCity=${encodeURIComponent(origin)}&arrivalCity=${encodeURIComponent(destination)}`;
  return affiliate ? `${base}&utm_source=routify&utm_medium=affiliate&utm_campaign=${affiliate}` : base;
}

// --- Car Rental ---

export function buildRentalcarsUrl(
  pickupLocation: string,
  dropoffLocation: string,
  pickupDate?: string,
  dropoffDate?: string
): string {
  const params = new URLSearchParams({
    'pickup-location': pickupLocation,
    'dropoff-location': dropoffLocation || pickupLocation,
  });
  if (pickupDate) params.set('pickup-date', pickupDate);
  if (dropoffDate) params.set('dropoff-date', dropoffDate);
  const affiliate = process.env.RENTALCARS_AFFILIATE_ID;
  if (affiliate) params.set('affiliateCode', affiliate);
  return `https://www.rentalcars.com/en/?${params.toString()}`;
}

export function buildAutoEuropeUrl(
  pickupLocation: string,
  pickupDate?: string,
  dropoffDate?: string
): string {
  // AutoEurope expects DD/MM/YYYY date format and /car-hire/ path
  function toEuDate(iso?: string) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }
  const params = new URLSearchParams({ locationA: pickupLocation });
  if (pickupDate) params.set('dateFrom', toEuDate(pickupDate));
  if (dropoffDate) params.set('dateTo', toEuDate(dropoffDate));
  const affiliate = process.env.AUTOEUROPE_AFFILIATE_ID;
  if (affiliate) params.set('a', affiliate);
  return `https://www.autoeurope.eu/car-hire/?${params.toString()}`;
}
