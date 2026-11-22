// Plus: Explorer gems (places travellers found that turned official) near the road, and the monthly challenge.
import { nearLine, type LatLng } from '../utils/routeGems';

type GemRow = { id: string; name: string; lat: number; lng: number; status: string; finderId: string | null };

/** Official gems found by travellers within `km` of the road. */
export function explorerGemsNear<T extends GemRow>(gems: T[], line: LatLng[], km = 20): T[] {
  return nearLine(gems.filter((g) => g.status === 'official' && g.finderId), line, km);
}

const MONTHLY = [
  'Snow on a road you drove: show the view, not the car.',
  'A sunrise at a gem, before anyone else is there.',
  'The oldest bridge on your route.',
  'A local market stall at a gem town.',
  'A road through flowers: fields, verges or balconies.',
  'Your camp or stay for the night, with the gem in sight.',
  'The highest point of your trip, and the road up to it.',
  'Lunch with a view at a gem.',
  'A road lined with trees in their colours.',
  'A castle or tower lit at night.',
  'Fog in a valley you drove through.',
  'A gem town in its winter lights.',
];

/** The challenge of the month (Plus members take part; the best photo wins a prize). */
export const monthlyChallenge = (now = new Date()) => MONTHLY[now.getUTCMonth()];
