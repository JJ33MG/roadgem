import axios from 'axios';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config();

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';

interface TripStop {
  location: string;
  latitude: number;
  longitude: number;
}

export interface HiddenGem {
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  category: 'restaurant' | 'café' | 'viewpoint' | 'activity' | 'market' | 'bar' | 'nature' | 'culture' | 'historic' | 'other';
}

async function searchHiddenGems(location: string): Promise<string> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey || apiKey === 'your_tavily_key_here') return '';

  try {
    const response = await axios.post('https://api.tavily.com/search', {
      api_key: apiKey,
      query: `hidden gems local favorites lesser-known spots restaurants cafes bars ${location} locals recommend`,
      max_results: 6,
      search_depth: 'basic',
    });

    const results: any[] = response.data?.results || [];
    return results.map((r) => `${r.title}: ${r.content}`).join('\n');
  } catch {
    return '';
  }
}

export async function findHiddenGems(stops: TripStop[]): Promise<HiddenGem[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey || apiKey === 'your_tavily_key_here' || stops.length === 0) return [];

  const sampledStops = stops.slice(0, 4);
  const searchResults = await Promise.all(
    sampledStops.map(async (stop) => ({
      stop,
      results: await searchHiddenGems(stop.location),
    }))
  );

  const usableResults = searchResults.filter((r) => r.results.trim().length > 0);

  // Build context — even without Tavily results, generate gems from location knowledge
  const context = usableResults.length > 0
    ? usableResults.map((r) =>
        `Stop: "${r.stop.location}" (lat: ${r.stop.latitude}, lng: ${r.stop.longitude})\n${r.results}`
      ).join('\n\n')
    : sampledStops.map((s) =>
        `Stop: "${s.location}" (lat: ${s.latitude}, lng: ${s.longitude})`
      ).join('\n');

  const gemsPerStop = Math.max(2, Math.ceil(8 / sampledStops.length));

  const prompt = `You are a local travel expert. Based on these locations along a road trip, identify ${gemsPerStop} genuinely interesting hidden gems per stop — places locals love but most tourists miss. Mix categories: restaurants, cafés, viewpoints, bars, markets, nature spots, cultural sites.

${context}

For each gem include a realistic street address. Use the lat/lng of the nearest stop (do not invent coordinates far from the stop).

Respond with ONLY a JSON array (no markdown):
[
  {
    "name": "string",
    "description": "string (max 20 words, specific and enticing)",
    "address": "string (street address, city)",
    "latitude": number,
    "longitude": number,
    "category": "restaurant" | "café" | "viewpoint" | "activity" | "market" | "bar" | "nature" | "culture" | "historic" | "other"
  }
]`;

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    const text = content.type === 'text' ? content.text : '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    return JSON.parse(jsonMatch[0]);
  } catch {
    return [];
  }
}
