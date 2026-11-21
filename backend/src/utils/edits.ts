// Changes a traveller makes to a planned trip without planning it again: move a night, hide or show a
// gem, add a rest day. Anonymous trips are edited with a key handed out once when the trip is made.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export type Edit =
  | { type: 'night'; day: number; stopIndex: number }
  | { type: 'hideGem'; placeId: string }
  | { type: 'showGem'; placeId: string }
  | { type: 'restDay'; afterDay: number };

export class EditError extends Error {
  status = 400;
  expose = true;
}

type Planner = { overnights?: string[]; hiddenGems?: string[]; [k: string]: unknown };

const fail = (msg: string) => new EditError(msg);

export function applyEdit<P extends Planner>(planner: P, edit: Edit, stops: string[]): P {
  const overnights = [...(planner.overnights ?? [])];
  const hidden = [...(planner.hiddenGems ?? [])];
  switch (edit?.type) {
    case 'night': {
      if (!Number.isInteger(edit.day) || edit.day < 1 || edit.day > overnights.length) throw fail('That day is not in this trip.');
      if (!Number.isInteger(edit.stopIndex) || edit.stopIndex < 1 || edit.stopIndex >= stops.length) throw fail('That stop is not on this route.');
      overnights[edit.day - 1] = stops[edit.stopIndex];
      return { ...planner, overnights };
    }
    case 'hideGem':
    case 'showGem': {
      const id = typeof edit.placeId === 'string' ? edit.placeId.slice(0, 300) : '';
      if (!id) throw fail('Which gem?');
      const rest = hidden.filter((h) => h !== id);
      return { ...planner, hiddenGems: edit.type === 'hideGem' ? [...rest, id] : rest };
    }
    case 'restDay': {
      if (!Number.isInteger(edit.afterDay) || edit.afterDay < 1 || edit.afterDay > overnights.length) throw fail('That day is not in this trip.');
      if (overnights.length >= 30) throw fail('A trip has at most 30 days.');
      overnights.splice(edit.afterDay, 0, overnights[edit.afterDay - 1]);
      return { ...planner, overnights };
    }
    default:
      throw fail('Unknown change.');
  }
}

const sha = (s: string) => createHash('sha256').update(s).digest('hex');

export function newEditKey(): { key: string; hash: string } {
  const key = randomBytes(24).toString('hex');
  return { key, hash: sha(key) };
}

export function editKeyMatches(hash: unknown, key: unknown): boolean {
  if (typeof hash !== 'string' || typeof key !== 'string' || !key) return false;
  const a = Buffer.from(sha(key));
  const b = Buffer.from(hash);
  return a.length === b.length && timingSafeEqual(a, b);
}
