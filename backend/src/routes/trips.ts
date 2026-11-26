import { Router, Response, NextFunction } from 'express';
import { generateTripDay, generateTripSkeleton } from '../utils/claude';
import { editKeyMatches } from '../utils/edits';
import { planningState } from '../utils/dayByDay';
import { logLine } from '../middleware/errors';
import { missingDays } from '../utils/dayByDay';
import { calculateRoute } from '../utils/googleMaps';
import { getWeather } from '../utils/weather';
import { findNearbyPlaces } from '../utils/places';
import { buildBookingUrl } from '../utils/affiliates';
import { prisma } from '../utils/prisma';
import { optionalAuth, AuthRequest } from '../middleware/auth';
import { generateLimit, limit } from '../middleware/limits';
import { gemsFor } from '../utils/gems';
import { findRouteGems, routeLine, type RoadLeg } from '../utils/routeGems';
import { costsOfPlanner } from '../costs/costs';
import { hasPlus, tripUnlocked } from '../utils/billing';
import { candidatesAt, libraryDeps } from '../gems/library';
import { newEditKey } from '../utils/edits';
import { editTrip } from './tripEdits';
import { fetchGoogleImage, tripMapImage } from './tripMap';
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
// Gems come from the library; Google is asked only for stretches of road not searched yet.
const gemLibrary = libraryDeps(prisma);
const gemSource = (p: { lat: number; lng: number }) => candidatesAt(gemLibrary, p, 'trip').then((r) => r.cands);

router.post('/generate', optionalAuth, generateLimit(), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = parseGenerateBody(req.body);
    if (!parsed.ok) {
      return res.status(400).json({ error: parsed.error });
    }
    const {
      startLocation, destination, startDate, endDate, budget, travelStyle, priorities, transportType, days: reqDays,
      kmPerDay, gemsPerDay, gemsEnabled, stayTypes, filters, vehicle, travellers,
    } = parsed.value;
    const planner = { kmPerDay, gemsPerDay, gemsEnabled, stayTypes, filters, vehicle, travellers };

    let isPremium = false;
    if (req.userId) {
      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      isPremium = hasPlus(user);
      if (user && !isPremium) {
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

    // Weather needs only the destination and dates: fetched while Claude writes the plan.
    const t0 = Date.now();
    const weatherP = getWeather(destination, startDate, endDate).catch(() => []);
    // First only the route (stops and where each night is): the trip page opens in seconds and the
    // day texts are written afterwards, one per day, in parallel (fillDays below).
    const tripData = await generateTripSkeleton(
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
    const editKey = newEditKey();
    const savedPlanner: typeof planner & { overnights: string[]; planning?: boolean; transportType?: string; route?: string; legs?: RoadLeg[]; hiddenGems?: string[]; alt?: { route: string; legs: RoadLeg[]; tollFree: boolean } } = { ...planner, transportType: transportType || 'own_car', overnights: tripData.overnights, planning: true };

    const tPlan = Date.now();

    // The real road (also drawn on the trip map); its legs give the distance, so no second route call.
    const roadStops = (tripData.stops || []).map((st: any) => ({ lat: Number(st.latitude), lng: Number(st.longitude), label: String(st.location ?? '') }));
    const road = await routeLine(roadStops).catch(() => ({ points: [], encoded: '', legs: [] as RoadLeg[] }));
    savedPlanner.route = road.encoded;
    savedPlanner.legs = road.legs;
    let totalDistance = road.legs.reduce((n, l) => n + l.km, 0);
    if (!totalDistance && Array.isArray(tripData.stops) && tripData.stops.length > 1) {
      totalDistance = (await calculateRoute(tripData.stops).catch(() => ({ totalDistance: 0 }))).totalDistance;
    }

    // At the same time: the toll-free road (when the fastest pays tolls; Plus can switch) and real
    // gems along the road from the gem library (Google only for stretches not searched yet).
    const paysTolls = Boolean(costsOfPlanner(savedPlanner)?.legs.some((l) => l.tolls > 0));
    const [free, hiddenGems, weather] = await Promise.all([
      paysTolls ? routeLine(roadStops, { avoidTolls: true }).catch(() => null) : Promise.resolve(null),
      gemsEnabled ? findRouteGems(road, Math.max(3, gemsPerDay * days), 2, gemSource).catch(() => []) : Promise.resolve([]),
      weatherP,
    ]);
    if (free?.legs.length) savedPlanner.alt = { route: free.encoded, legs: free.legs, tollFree: true };
    console.log(`[generate] ${days} days: plan ${tPlan - t0} ms, road and gems ${Date.now() - tPlan} ms`);

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
        planner: JSON.stringify({ ...savedPlanner, editKeyHash: editKey.hash }),
      },
    });
    // The days are written now, after the answer: the page shows each one as it arrives.
    void track(fillDays(saved.id).catch((err) => console.error('[generate] fillDays', logLine(err))));

    const trip = {
      tripId: saved.id,
      destination,
      startDate,
      endDate,
      days,
      stops: tripData.stops,
      itinerary: [],
      totalCost: tripData.totalCost,
      totalDistance,
      highlights: tripData.highlights,
      tips: tripData.tips,
      weather,
      ...gemsFor<(typeof hiddenGems)[number]>(hiddenGems, isPremium),
      planner: savedPlanner,
      costs: costsOfPlanner(savedPlanner),
      // Handed out once: the browser keeps it to change this trip later without an account.
      editKey: editKey.key,
    };

    res.json(trip);
  } catch (err) {
    next(err);
  }
});

/** What the browser gets for a saved trip (the edit key's hash never leaves the server). */
/** Writes every day of a trip that has no text yet (4 at a time) and marks the plan as finished. */
/** Day-writing still running, so a shutdown can wait for it. */
export const writingTrips = new Set<Promise<unknown>>();
const track = (p: Promise<unknown>) => {
  writingTrips.add(p);
  void p.finally(() => writingTrips.delete(p));
  return p;
};

export async function fillDays(tripId: string): Promise<void> {
  const trip = await prisma.trip.findUnique({ where: { id: tripId }, include: { itineraryDays: { select: { day: true } } } });
  if (!trip) return;
  const planner = JSON.parse(trip.planner || '{}');
  const stops = JSON.parse(trip.stops || '[]') as { location: string }[];
  const overnights: string[] = planner.overnights ?? [];
  const todo = missingDays(trip.days, trip.itineraryDays.map((d) => d.day));
  const failed: number[] = [];
  const queue = [...todo];
  const work = async () => {
    for (let d = queue.shift(); d !== undefined; d = queue.shift()) {
      const from = d === 1 ? stops[0]?.location ?? trip.destination : overnights[d - 2] ?? trip.destination;
      const to = overnights[d - 1] ?? trip.destination;
      try {
        const day = await generateTripDay({
          day: d, from, to, destination: trip.destination, travelStyle: trip.travelStyle,
          priorities: JSON.parse(trip.priorities || '[]'), transportType: planner.transportType ?? 'own_car', planner,
        });
        await prisma.tripDay.create({
          data: {
            tripId,
            day: d,
            activities: {
              create: (['morning', 'afternoon', 'evening'] as const)
                .filter((slot) => day[slot])
                .map((slot) => ({
                  slot,
                  time: day[slot]!.time ?? '',
                  activity: day[slot]!.activity ?? '',
                  location: day[slot]!.location ?? '',
                  description: day[slot]!.description ?? '',
                  estimatedCost: day[slot]!.estimatedCost ?? 0,
                  notes: day[slot]!.notes ?? '',
                })),
            },
          },
        });
      } catch (err) {
        console.error(`[fillDays] trip ${tripId} day ${d}`, logLine(err));
        failed.push(d);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, todo.length) }, work));
  const fresh = await prisma.trip.findUnique({ where: { id: tripId } });
  const p = JSON.parse(fresh?.planner || '{}');
  await prisma.trip.update({ where: { id: tripId }, data: { planner: JSON.stringify({ ...p, planning: false, failedDays: failed }) } });
}

async function readTrip(tripId: string, userId?: string) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { itineraryDays: { include: { activities: true }, orderBy: { day: 'asc' } } },
  });
  if (!trip) return null;
  const viewer = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
  const viewerIsPremium = hasPlus(viewer) || tripUnlocked(JSON.parse(trip.planner || '{}'));
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
  const { editKeyHash: _hidden, ...stored } = JSON.parse(trip.planner || '{}');
  const planner = stored.planning === undefined ? stored : {
    ...stored,
    ...planningState({ planning: stored.planning, createdAt: trip.createdAt, now: new Date(), days: trip.days, have: itinerary.map((d) => Number(d.day)), failed: stored.failedDays }),
  };
  return {
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
    planner,
    costs: costsOfPlanner(planner),
    yours: Boolean(trip.userId && userId && trip.userId === userId),
  };
}

router.get('/:tripId', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const trip = await readTrip(req.params.tripId, req.userId);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    res.json(trip);
  } catch (err) {
    next(err);
  }
});

// Change a planned trip: the signed-in owner, or whoever holds the edit key handed out when it was made.
// Days that could not be written (or a plan cut short by a restart): write the missing ones again.
router.post('/:tripId/days/retry', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const trip = await prisma.trip.findUnique({ where: { id: req.params.tripId } });
    if (!trip) return res.status(404).json({ error: 'Trip not found.' });
    const planner = JSON.parse(trip.planner || '{}');
    const owner = Boolean(trip.userId && req.userId && trip.userId === req.userId);
    const key = typeof req.headers['x-edit-key'] === 'string' ? req.headers['x-edit-key'] : undefined;
    if (!owner && !editKeyMatches(planner.editKeyHash, key)) return res.status(403).json({ error: 'Only whoever planned this trip can do this.' });
    // A plan still being written (less than 5 minutes old) is left alone.
    if (planner.planning === true && Date.now() - trip.createdAt.getTime() < 5 * 60_000) return res.status(409).json({ error: 'Still writing your days.' });
    await prisma.trip.update({ where: { id: trip.id }, data: { planner: JSON.stringify({ ...planner, planning: true, failedDays: [] }) } });
    void track(fillDays(trip.id).catch((err) => console.error('[retry] fillDays', logLine(err))));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.patch('/:tripId/plan', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const key = typeof req.headers['x-edit-key'] === 'string' ? req.headers['x-edit-key'] : undefined;
    const viewer = req.userId ? await prisma.user.findUnique({ where: { id: req.userId } }) : null;
    await editTrip(prisma, { tripId: req.params.tripId, edit: req.body?.edit, userId: req.userId, key, premium: hasPlus(viewer) });
    res.json(await readTrip(req.params.tripId, req.userId));
  } catch (err) {
    next(err);
  }
});

// A real Google map image of the trip; ?from=&to= are the stop indexes of the day being viewed.
router.get('/:tripId/map', optionalAuth, limit('map', 200, 60 * 60_000), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const int = (v: unknown, d: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(Number(v)) || d));
    const viewer = req.userId ? await prisma.user.findUnique({ where: { id: req.userId } }) : null;
    const r = await tripMapImage(prisma, fetchGoogleImage, {
      tripId: req.params.tripId,
      from: int(req.query.from, 0, 0, 60),
      to: int(req.query.to, 0, 0, 60),
      width: int(req.query.w, 640, 200, 640),
      height: int(req.query.h, 400, 200, 640),
      key: process.env.GOOGLE_MAPS_API_KEY ?? '',
      premium: hasPlus(viewer),
    });
    if (r.status !== 200) return res.status(r.status).json({ error: r.error });
    res.set('Content-Type', r.type!);
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(r.body);
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
