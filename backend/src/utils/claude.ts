import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';

export interface PlannerOptions {
  kmPerDay: number;
  gemsPerDay: number;
  gemsEnabled: boolean;
  stayTypes: ('campsite' | 'hotel' | 'holiday_home')[];
  filters: string[];
  vehicle?: 'car' | 'ev' | 'campervan' | 'caravan';
}

const VEHICLE_RULES: Record<NonNullable<PlannerOptions['vehicle']>, string> = {
  car: 'VEHICLE: car.',
  ev: 'VEHICLE: electric car. Overnight towns with public charging; mention a charging stop on long days.',
  campervan:
    'VEHICLE: campervan. Prefer campsites and aires, avoid narrow old centres and low bridges, suggest parking at the edge of old towns.',
  caravan:
    'VEHICLE: car with caravan. Keep days shorter and on main roads, prefer campsites with easy pitches, avoid narrow old centres and steep passes.',
};

const STAY_WORDS: Record<PlannerOptions['stayTypes'][number], string> = {
  campsite: 'campsites',
  hotel: 'hotels',
  holiday_home: 'holiday homes (Airbnb)',
};

/** The Routify planner's rules for the itinerary: daily distance, overnight stops, gems on or off. */
export function plannerPrompt(p: PlannerOptions, transportType: string): string {
  const lines: string[] = [];
  if (p.vehicle) lines.push(VEHICLE_RULES[p.vehicle]);
  if (transportType !== 'public') {
    lines.push(
      `DAILY DISTANCE: each driving day ends near ${p.kmPerDay} km from where it started, and never more than ${Math.round(p.kmPerDay * 1.2)} km. ` +
        `If the whole route is shorter than one day's distance, stay at the destination and do NOT add extra driving to fill the days.`,
    );
  }
  lines.push(`OVERNIGHT STOPS: every night is in a town that has ${p.stayTypes.map((s) => STAY_WORDS[s]).join(' and ')} available.`);
  lines.push(
    'DAYS AND STOPS MATCH: stop 1 is the start. Day N drives from stop N to stop N+1, and the evening of day N is in stop N+1 (that is where the traveller sleeps). ' +
      'Never mention sleeping or staying overnight anywhere else. Days after the last stop are spent at the destination without long drives.',
  );
  lines.push('Never call a place a "road gem" or "hidden gem" in the itinerary text: Routify adds its own checked gems next to the plan.');
  lines.push(
    p.gemsEnabled
      ? `ROAD GEMS: on each travel day suggest about ${p.gemsPerDay} short stops (old towns, viewpoints, nature) spread along that day's road, each a short detour.`
      : 'NO GEMS: the traveller switched gems off. Do not suggest detours, hidden gems or sightseeing stops on the road; plan only the route, the driving and the overnight stays.',
  );
  if (p.filters.length) lines.push(`TRAVELLER PREFERENCES: ${p.filters.join(', ')}.`);
  return lines.join('\n');
}

export async function generateTripItinerary(
  startLocation: string,
  destination: string,
  days: number,
  budget: number,
  travelStyle: string,
  priorities: string[],
  transportType: string = 'own_car',
  planner: PlannerOptions = { kmPerDay: 350, gemsPerDay: 3, gemsEnabled: true, stayTypes: ['campsite', 'hotel'], filters: [] }
) {
  const plannerRules = plannerPrompt(planner, transportType);
  const transportNote =
    transportType === 'rental_car'
      ? 'The traveler will RENT a car — include car rental pickup/dropoff considerations and mention rental-friendly stops. For each stop include "transit": null.'
      : transportType === 'public'
      ? `The traveler uses PUBLIC TRANSPORT (trains and buses ONLY) — do NOT mention driving, parking, or car rental anywhere.

CRITICAL RULES for public transport trips:
1. Choose stops that are major rail hubs with direct or 1-transfer connections between them (e.g. Amsterdam, Brussels, Paris, Cologne, Vienna, Prague, Barcelona — NOT small villages unreachable by train).
2. For every stop after the first, you MUST include a "transit" object with: the real train/bus operator (Eurostar, Thalys/Izy, TGV, ICE, Intercity, Flixbus, etc.), realistic journey duration, the exact departure and arrival station names, and frequency or booking tip.
3. In the itinerary, the first activity of each day should be arriving/settling in — mention the train arrival.
4. Suggest buying tickets in advance for high-speed trains.
Example transit object: { "mode": "train", "operator": "ICE / Deutsche Bahn", "duration": "1h 55min", "from": "Cologne Hbf", "to": "Frankfurt Hbf", "notes": "Runs every 30 min, book 2+ weeks ahead for best fares" }`
      : 'The traveler uses their OWN CAR — focus on road trip routes and parking tips. For each stop include "transit": null.';

  const prompt = `You are a travel planning assistant. Create a road trip itinerary starting from "${startLocation}" and traveling to/around "${destination}", lasting ${days} days, with a total budget of €${budget}. The traveler's style is "${travelStyle}" and their priorities are: ${priorities.join(', ')}.

Transport: ${transportNote}

IMPORTANT: Every activity, location, and attraction in the itinerary MUST be physically located in or near "${destination}" and along the route from "${startLocation}" to "${destination}". Do NOT suggest activities from other cities or countries.

The "stops" array MUST begin with "${startLocation}" as the first stop (the departure point), followed by the route stops leading to and through "${destination}", in the order the traveler will visit them. Limit to a maximum of ${Math.min(15, days + 1)} stops total.

${plannerRules}

Keep all text fields SHORT and scannable:
- "reason" and "description": max 1 short sentence (under 20 words)
- "activities": max 3 items, each a short phrase (under 8 words)
- "localSpecialties": max 3 items, each 1-3 words
- itinerary slot "description": max 1 short sentence (under 25 words)
- itinerary slot "notes": max 1 short sentence (under 15 words), or empty string if nothing important
- "highlights" and "tips": max 5 items each, each under 15 words

Respond with ONLY a single JSON object (no markdown, no commentary) matching this exact structure:

{
  "stops": [
    {
      "location": "string",
      "reason": "string",
      "description": "string",
      "latitude": number,
      "longitude": number,
      "activities": ["string"],
      "bestTimeOfDay": "string",
      "estimatedDuration": "string",
      "localSpecialties": ["string"],
      "transit": { "mode": "string", "operator": "string", "duration": "string", "from": "string", "to": "string", "notes": "string" } | null
    }
  ],
  "itinerary": [
    {
      "day": number,
      "overnight": "string (the stop where the traveller sleeps after this day, written exactly as in stops[].location)",
      "morning": { "time": "string", "activity": "string", "location": "string", "description": "string", "estimatedCost": number, "notes": "string" },
      "afternoon": { "time": "string", "activity": "string", "location": "string", "description": "string", "estimatedCost": number, "notes": "string" },
      "evening": { "time": "string", "activity": "string", "location": "string", "description": "string", "estimatedCost": number, "notes": "string" }
    }
  ],
  "totalCost": number,
  "highlights": ["string"],
  "tips": ["string"]
}`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  const text = content.type === 'text' ? content.text : '';

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse trip data from Claude response');
  }

  return JSON.parse(jsonMatch[0]);
}
