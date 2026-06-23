import { Router, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/trips', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const trips = await prisma.trip.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(
      trips.map((trip) => ({
        id: trip.id,
        userId: trip.userId,
        destination: trip.destination,
        startDate: trip.startDate,
        endDate: trip.endDate,
        budget: trip.budget,
        travelStyle: trip.travelStyle,
        priorities: JSON.parse(trip.priorities),
        route: null,
        totalCost: trip.totalCost,
        totalDistance: trip.totalDistance,
        status: 'saved',
        createdAt: trip.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    next(err);
  }
});

export default router;
