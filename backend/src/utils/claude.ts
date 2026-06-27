import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';

export async function generateTripItinerary(
  startLocation: string,
  destination: string,
  days: number,
  budget: number,
  travelStyle: string,
  priorities: string[],
  transportType: string = 'own_car'
) {
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

The "stops" array MUST begin with "${startLocation}" as the first stop (the departure point), followed by the route stops leading to and through "${destination}", in the order the traveler will visit them. Limit to a maximum of 5 stops total.

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
