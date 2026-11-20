import { Router, Response, NextFunction } from 'express';
import { generateTripItinerary } from '../utils/claude';
import { calculateRoute } from '../utils/googleMaps';
import { getWeather } from '../utils/weather';
import { findNearbyPlaces } from '../utils/places';
import { buildBookingUrl } from '../utils/affiliates';
import { prisma } from '../utils/prisma';
import { optionalAuth, AuthRequest } from '../middleware/auth';
import { gemsFor } from '../utils/gems';
import { findRouteGems, overnightsFrom, routeLine } from '../utils/routeGems';
import { parseGenerateBody } from '../utils/tripRequest';

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
    const parsed = parseGenerateBody(req.body);
    if (!parsed.ok) {
      return res.status(400).json({ error: parsed.error });
    }
    const {
      startLocation, destination, startDate, endDate, budget, travelStyle, priorities, transportType, days: reqDays,
      kmPerDay, gemsPerDay, gemsEnabled, stayTypes, filters,
    } = parsed.value;
    const planner = { kmPerDay, gemsPerDay, gemsEnabled, stayTypes, filters };

    let isPremium = false;
    if (req.userId) {
      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      isPremium = user?.subscriptionTier === 'premium';
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
    const daysFromDates = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const days = reqDays ? Math.max(1, Number(reqDays)) : daysFromDates;

    const tripData = await generateTripItinerary(
      startLocation,
      destination,
      days,
      budget,
      travelStyle || 'balanced',
      priorities || [],
      transportType || 'own_car',
      planner
    );

    // The page follows each day's overnight town as the plan names it.
    const savedPlanner: typeof planner & { overnights: string[]; route?: string } = { ...planner, overnights: overnightsFrom(tripData.itinerary, days) };

    let totalDistance = 0;
    if (Array.isArray(tripData.stops) && tripData.stops.length > 1) {
      const route = await calculateRoute(tripData.stops);
      totalDistance = route.totalDistance;
    }

    const weather = await getWeather(destination, startDate, endDate);

    // The real road (also drawn on the trip map), then real gems along it: Google places
    // sampled every ~75 km plus the start and the end.
    const road = await routeLine(
      (tripData.stops || []).map((st: any) => ({ lat: Number(st.latitude), lng: Number(st.longitude) })),
    ).catch(() => ({ points: [], encoded: '' }));
    savedPlanner.route = road.encoded;
    const hiddenGems = !gemsEnabled ? [] : await findRouteGems(road, Math.max(3, gemsPerDay * days)).catch(() => []);

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
        planner: JSON.stringify(savedPlanner),
        itineraryDays: {
          create: (tripData.itinerary || []).slice(0, days).map((day: any) => ({
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
      ...gemsFor<(typeof hiddenGems)[number]>(hiddenGems, isPremium),
      planner: savedPlanner,
    };

    res.json(trip);
  } catch (err) {
    next(err);
  }
});

router.get('/:tripId', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: req.params.tripId },
      include: { itineraryDays: { include: { activities: true }, orderBy: { day: 'asc' } } },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const viewer = req.userId ? await prisma.user.findUnique({ where: { id: req.userId } }) : null;
    const viewerIsPremium = viewer?.subscriptionTier === 'premium';

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
      ...gemsFor(trip.hiddenGems ? JSON.parse(trip.hiddenGems) : [], viewerIsPremium),
      planner: JSON.parse(trip.planner || '{}'),
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
