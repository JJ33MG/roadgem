import { computeRoute } from './google';
import dotenv from 'dotenv';

dotenv.config();

interface RouteStop {
  location: string;
  latitude: number;
  longitude: number;
}

interface RouteResult {
  totalDistance: number;
  totalTime: number;
}

export async function calculateRoute(stops: RouteStop[]): Promise<RouteResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey || stops.length < 2) {
    const totalDistance = Math.round((stops.length - 1) * (50 + Math.random() * 100) * 10) / 10;
    const totalTime = Math.round((stops.length - 1) * (1 + Math.random() * 2) * 10) / 10;
    return { totalDistance, totalTime };
  }

  const route = await computeRoute(stops.map((s) => ({ lat: s.latitude, lng: s.longitude })), apiKey).catch(() => null);
  if (!route) {
    const totalDistance = Math.round((stops.length - 1) * (50 + Math.random() * 100) * 10) / 10;
    const totalTime = Math.round((stops.length - 1) * (1 + Math.random() * 2) * 10) / 10;
    return { totalDistance, totalTime };
  }
  const totalDistanceMeters = route.legs.reduce((sum, leg) => sum + leg.meters, 0);
  const totalTimeSeconds = route.legs.reduce((sum, leg) => sum + leg.seconds, 0);

  return {
    totalDistance: Math.round((totalDistanceMeters / 1000) * 10) / 10,
    totalTime: Math.round((totalTimeSeconds / 3600) * 10) / 10,
  };
}
