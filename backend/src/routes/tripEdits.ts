// PATCH /api/trips/:tripId/plan — change a planned trip (move a night, hide or show a gem, add a rest day).
import type { PrismaClient } from '@prisma/client';
import { applyEdit, editKeyMatches, EditError, type Edit } from '../utils/edits';

type Db = Pick<PrismaClient, 'trip' | 'tripDay' | '$transaction'>;

const denied = () => Object.assign(new EditError('Only the person who planned this trip can change it.'), { status: 403 });
const plusDay = (iso: string) => {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

export async function editTrip(db: Db, input: { tripId: string; edit: Edit; userId?: string; key?: string }) {
  const trip = await db.trip.findUnique({ where: { id: input.tripId } });
  if (!trip) throw Object.assign(new EditError('Trip not found.'), { status: 404 });
  const planner = JSON.parse(trip.planner || '{}') as Record<string, unknown> & { overnights?: string[]; editKeyHash?: string };
  const owner = Boolean(trip.userId && input.userId && trip.userId === input.userId);
  if (!owner && !editKeyMatches(planner.editKeyHash, input.key)) throw denied();

  const stops = (JSON.parse(trip.stops || '[]') as { location: string }[]).map((s) => s.location);
  const next = applyEdit(planner, input.edit, stops);
  const data: Record<string, unknown> = { planner: JSON.stringify(next) };

  if (input.edit.type === 'restDay') {
    const after = input.edit.afterDay;
    const town = String(next.overnights?.[after] ?? '').split(',')[0] || 'town';
    await db.$transaction([
      db.tripDay.updateMany({ where: { tripId: trip.id, day: { gt: after } }, data: { day: { increment: 1 } } }),
      db.tripDay.create({
        data: {
          tripId: trip.id,
          day: after + 1,
          activities: {
            create: [{ slot: 'morning', time: '', activity: `Rest day in ${town}`, location: town, description: 'No driving today. Sleep in and explore at your own pace.', estimatedCost: 0, notes: '' }],
          },
        },
      }),
    ]);
    data.days = (trip.days ?? 0) + 1;
    data.endDate = plusDay(String(trip.endDate));
  }
  return db.trip.update({ where: { id: trip.id }, data });
}
