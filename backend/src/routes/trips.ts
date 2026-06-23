import { Router, Response, NextFunction } from 'express';
import { generateTripItinerary } from '../utils/claude';
import { calculateRoute } from '../utils/googleMaps';
import { getWeather } from '../utils/weather';
import { findHiddenGems } from '../utils/tavily';
import { findNearbyPlaces } from '../utils/places';
import { buildBookingUrl } from '../utils/affiliates';
import { prisma } from '../utils/prisma';
import { optionalAuth, AuthRequest } from '../middleware/auth';

const HOTEL_PRICE_BY_LEVEL = [45, 70, 110, 170, 260];
const RESTAURANT_PRICE_LEVEL_DEFAULT = 2;

function estimateHotelPrice(priceLevel: number | null): number {
  if (priceLevel === null || priceLevel < 0 || priceLevel >= HOTEL_PRICE_BY_LEVEL.length) {
    return HOTEL_PRICE_BY_LEVEL[2];
  }
  return HOTEL_PRICE_BY_LEVEL[priceLevel];
}

function firstStopCoords(stopsJson: string): { lat: number; lng: number; location: string } | null {
  try {
    const stops = JSON.parse(stopsJson);
    const stop = Array.isArray(stops) ? stops[0] : null;
    if (!stop || typeof stop.latitude !== 'number' || typeof stop.longitude !== 'number') return null;
    return { lat: stop.latitude, lng: stop.longitude, location: stop.location || '' };
  } catch {
    return null;
  }
}

const router = Router();

router.post('/generate', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startLocation, destination, startDate, endDate, budget, travelStyle, priorities } = req.body;

    if (!startLocation || !destination || !startDate || !endDate || !budget) {
      return res
        .status(400)
        .json({ error: 'startLocation, destination, startDate, endDate, and budget are required' });
    }

    if (req.userId) {
      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      if (user && user.subscriptionTier !== 'premium') {
        const existingTrips = await prisma.trip.count({ where: { userId: req.userId } });
        if (existingTrips >= 1) {
          return res.status(403).json({
            error: 'Free plan is limited to 1 saved trip. Upgrade to premium for unlimited trips.',
            code: 'TRIP_LIMIT_REACHED',
          });
        }
      }
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    const tripData = await generateTripItinerary(
      startLocation,
      destination,
      days,
      budget,
      travelStyle || 'balanced',
      priorities || []
    );

    let totalDistance = 0;
    if (Array.isArray(tripData.stops) && tripData.stops.length > 1) {
      const route = await calculateRoute(tripData.stops);
      totalDistance = route.totalDistance;
    }

    const weather = await getWeather(destination, startDate, endDate);

    // Use pre-researched gems from DB first, fall back to Tavily if none exist
    const destinationKey = destination.split(',')[0].trim();
    const preResearched = await prisma.destinationGem.findMany({
      where: { destination: { contains: destinationKey, mode: 'insensitive' } },
      take: 6,
    });

    const hiddenGems = preResearched.length > 0
      ? preResearched.map((g) => ({
          name: g.name,
          description: g.description,
          address: g.address,
          category: g.category,
          whyHidden: g.whyHidden,
          photoUrl: g.photoUrl ?? undefined,
        }))
      : await findHiddenGems(tripData.stops || []);

    const saved = await prisma.trip.create({
      data: {
        userId: req.userId ?? null,
        startLocation,
        destination,
        startDate,
        endDate,
        days,
        budget,
        travelStyle: travelStyle || 'balanced',
        priorities: JSON.stringify(priorities || []),
        totalCost: tripData.totalCost ?? 0,
        totalDistance,
        stops: JSON.stringify(tripData.stops || []),
        highlights: JSON.stringify(tripData.highlights || []),
        tips: JSON.stringify(tripData.tips || []),
        weather: JSON.stringify(weather),
        hiddenGems: JSON.stringify(hiddenGems),
        itineraryDays: {
          create: (tripData.itinerary || []).map((day: any) => ({
            day: day.day,
            activities: {
              create: (['morning', 'afternoon', 'evening'] as const)
                .filter((slot) => day[slot])
                .map((slot) => ({
                  slot,
                  time: day[slot].time ?? '',
                  activity: day[slot].activity ?? '',
                  location: day[slot].location ?? '',
                  description: day[slot].description ?? '',
                  estimatedCost: day[slot].estimatedCost ?? 0,
                  notes: day[slot].notes ?? '',
                })),
            },
          })),
        },
      },
    });

    const trip = {
      tripId: saved.id,
      destination,
      startDate,
      endDate,
      days,
      stops: tripData.stops,
      itinerary: tripData.itinerary,
      totalCost: tripData.totalCost,
      totalDistance,
      highlights: tripData.highlights,
      tips: tripData.tips,
      weather,
      hiddenGems,
    };

    res.json(trip);
  } catch (err) {
    next(err);
  }
});

router.get('/:tripId', async (req, res: Response, next: NextFunction) => {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: req.params.tripId },
      include: { itineraryDays: { include: { activities: true }, orderBy: { day: 'asc' } } },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const itinerary = trip.itineraryDays.map((d) => {
      const day: Record<string, unknown> = { day: d.day };
      for (const activity of d.activities) {
        day[activity.slot] = {
          time: activity.time,
          activity: activity.activity,
          location: activity.location,
          description: activity.description,
          estimatedCost: activity.estimatedCost,
          notes: activity.notes,
        };
      }
      return day;
    });

    res.json({
      tripId: trip.id,
      destination: trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
      days: trip.days,
      stops: JSON.parse(trip.stops),
      itinerary,
      totalCost: trip.totalCost,
      totalDistance: trip.totalDistance,
      highlights: JSON.parse(trip.highlights),
      tips: JSON.parse(trip.tips),
      weather: JSON.parse(trip.weather),
      hiddenGems: trip.hiddenGems ? JSON.parse(trip.hiddenGems) : [],
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:tripId/hotel-options', async (req, res: Response, next: NextFunction) => {
  try {
    const trip = await prisma.trip.findUnique({ where: { id: req.params.tripId } });
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const coords = firstStopCoords(trip.stops);
    if (!coords) {
      return res.json([]);
    }

    const lodging = await findNearbyPlaces(coords.lat, coords.lng, 'lodging');
    const hotels = lodging.map((place) => ({
      id: place.placeId,
      name: place.name,
      rating: place.rating,
      pricePerNight: estimateHotelPrice(place.priceLevel),
      imageUrl: place.photoRef ? `/api/photos/image/${encodeURIComponent(place.photoRef)}` : '',
      affiliateUrl: buildBookingUrl(`${place.name}, ${coords.location || trip.destination}`),
    }));

    res.json(hotels);
  } catch (err) {
    next(err);
  }
});

router.get('/:tripId/restaurant-options', async (req, res: Response, next: NextFunction) => {
  try {
    const trip = await prisma.trip.findUnique({ where: { id: req.params.tripId } });
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const coords = firstStopCoords(trip.stops);
    if (!coords) {
      return res.json([]);
    }

    const places = await findNearbyPlaces(coords.lat, coords.lng, 'restaurant');
    const restaurants = places.map((place) => ({
      id: place.placeId,
      name: place.name,
      cuisine: coords.location || trip.destination,
      priceLevel: place.priceLevel ?? RESTAURANT_PRICE_LEVEL_DEFAULT,
      rating: place.rating,
      imageUrl: place.photoRef ? `/api/photos/image/${encodeURIComponent(place.photoRef)}` : '',
    }));

    res.json(restaurants);
  } catch (err) {
    next(err);
  }
});

router.post('/:tripId/book', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { type, optionId } = req.body;
    if (!type || !optionId) {
      return res.status(400).json({ error: 'type and optionId are required' });
    }

    const trip = await prisma.trip.findUnique({ where: { id: req.params.tripId } });
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const booking = await prisma.booking.create({
      data: {
        tripId: trip.id,
        userId: req.userId ?? null,
        type,
        bookingId: optionId,
        status: 'confirmed',
      },
    });

    res.json(booking);
  } catch (err) {
    next(err);
  }
});

export default router;
