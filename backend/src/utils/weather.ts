import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export interface WeatherDay {
  day: number;
  temp: number;
  condition: string;
}

interface CacheEntry {
  expires: number;
  data: WeatherDay[];
}

const CACHE_TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function mockWeather(days: number): WeatherDay[] {
  const conditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain', 'Clear'];
  const weather: WeatherDay[] = [];
  for (let i = 0; i < days; i++) {
    weather.push({
      day: i + 1,
      temp: Math.round(15 + Math.random() * 15),
      condition: conditions[Math.floor(Math.random() * conditions.length)],
    });
  }
  return weather;
}

export async function getWeather(destination: string, startDate: string, endDate: string): Promise<WeatherDay[]> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  if (!apiKey || apiKey === 'your_openweather_key_here') {
    return mockWeather(days);
  }

  const cacheKey = `${destination.toLowerCase()}|${startDate}|${endDate}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  try {
    const response = await axios.get('https://api.openweathermap.org/data/2.5/forecast', {
      params: {
        q: destination,
        appid: apiKey,
        units: 'metric',
      },
    });

    const list: any[] = response.data?.list || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const byDay = new Map<number, { temps: number[]; conditions: string[] }>();
    for (const entry of list) {
      const entryDate = new Date(entry.dt * 1000);
      entryDate.setHours(0, 0, 0, 0);
      const dayOffset = Math.round((entryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (dayOffset < 1 || dayOffset > days) continue;

      if (!byDay.has(dayOffset)) byDay.set(dayOffset, { temps: [], conditions: [] });
      const bucket = byDay.get(dayOffset)!;
      bucket.temps.push(entry.main.temp);
      bucket.conditions.push(entry.weather?.[0]?.main || 'Clear');
    }

    const weather: WeatherDay[] = [];
    for (let i = 1; i <= days; i++) {
      const bucket = byDay.get(i);
      if (!bucket || bucket.temps.length === 0) {
        weather.push(mockWeather(1)[0]);
        weather[weather.length - 1].day = i;
        continue;
      }

      const avgTemp = bucket.temps.reduce((a, b) => a + b, 0) / bucket.temps.length;
      const conditionCounts = new Map<string, number>();
      for (const c of bucket.conditions) {
        conditionCounts.set(c, (conditionCounts.get(c) || 0) + 1);
      }
      const condition = [...conditionCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];

      weather.push({ day: i, temp: Math.round(avgTemp), condition });
    }

    cache.set(cacheKey, { data: weather, expires: Date.now() + CACHE_TTL_MS });
    return weather;
  } catch {
    return mockWeather(days);
  }
}
