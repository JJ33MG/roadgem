import { Router, Request, Response, NextFunction } from 'express';
import { findNearbyPlaces, NearbyPlace } from '../utils/places';
import { buildBookingUrl, buildAirbnbUrl } from '../utils/affiliates';

const router = Router();

type AccommodationType = 'hotel' | 'hostel' | 'campsite' | 'airbnb';

const HOTEL_PRICE_BY_LEVEL = [45, 70, 110, 170, 260];
const CAMPSITE_PRICE_BY_LEVEL = [15, 22, 32, 45, 65];

function estimatePrice(priceLevel: number | null, type: AccommodationType): number {
  const table = type === 'campsite' ? CAMPSITE_PRICE_BY_LEVEL : HOTEL_PRICE_BY_LEVEL;
  if (priceLevel === null || priceLevel < 0 || priceLevel >= table.length) {
    return table[type === 'campsite' ? 1 : 2];
  }
  return table[priceLevel];
}

function toOption(place: NearbyPlace, type: AccommodationType, location: string, checkin?: string, checkout?: string) {
  return {
    id: place.placeId,
    name: place.name,
    type,
    rating: place.rating,
    pricePerNight: estimatePrice(place.priceLevel, type),
    imageUrl: place.photoRef ? `/api/photos/image/${encodeURIComponent(place.photoRef)}` : null,
    address: place.address,
    latitude: place.latitude,
    longitude: place.longitude,
    affiliateUrl: buildBookingUrl(`${place.name}, ${location}`, checkin, checkout),
  };
}

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const location = String(req.query.location || '').trim();
    const checkin = req.query.checkin ? String(req.query.checkin) : undefined;
    const checkout = req.query.checkout ? String(req.query.checkout) : undefined;

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    const requestedTypes = String(req.query.types || 'hotel,hostel,campsite,airbnb')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean) as AccommodationType[];

    const results: ReturnType<typeof toOption>[] = [];

    if (requestedTypes.includes('hotel') || requestedTypes.includes('hostel')) {
      const lodging = await findNearbyPlaces(lat, lng, 'lodging');
      for (const place of lodging) {
        const isHostel = /hostel/i.test(place.name);
        const type: AccommodationType = isHostel ? 'hostel' : 'hotel';
        if (!requestedTypes.includes(type)) continue;
        results.push(toOption(place, type, location || place.address, checkin, checkout));
      }
    }

    if (requestedTypes.includes('campsite')) {
      const campgrounds = await findNearbyPlaces(lat, lng, 'campground');
      for (const place of campgrounds) {
        results.push(toOption(place, 'campsite', location || place.address, checkin, checkout));
      }
    }

    if (requestedTypes.includes('airbnb') && location) {
      results.push({
        id: 'airbnb-search',
        name: `Airbnb stays in ${location}`,
        type: 'airbnb',
        rating: 0,
        pricePerNight: estimatePrice(null, 'hotel'),
        imageUrl: null,
        address: location,
        latitude: lat,
        longitude: lng,
        affiliateUrl: buildAirbnbUrl(location, checkin, checkout),
      });
    }

    res.json({ accommodations: results });
  } catch (err) {
    next(err);
  }
});

export default router;
