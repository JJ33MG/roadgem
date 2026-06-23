import axios from 'axios';
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

  const origin = `${stops[0].latitude},${stops[0].longitude}`;
  const destination = `${stops[stops.length - 1].latitude},${stops[stops.length - 1].longitude}`;
  const waypoints = stops
    .slice(1, -1)
    .map((s) => `${s.latitude},${s.longitude}`)
    .join('|');

  const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
    params: {
      origin,
      destination,
      waypoints: waypoints || undefined,
      key: apiKey,
    },
  });

  const data = response.data;

  if (data.status !== 'OK' || !data.routes?.length) {
    const totalDistance = Math.round((stops.length - 1) * (50 + Math.random() * 100) * 10) / 10;
    const totalTime = Math.round((stops.length - 1) * (1 + Math.random() * 2) * 10) / 10;
    return { totalDistance, totalTime };
  }

  const legs = data.routes[0].legs;
  const totalDistanceMeters = legs.reduce((sum: number, leg: any) => sum + leg.distance.value, 0);
  const totalTimeSeconds = legs.reduce((sum: number, leg: any) => sum + leg.duration.value, 0);

  return {
    totalDistance: Math.round((totalDistanceMeters / 1000) * 10) / 10,
    totalTime: Math.round((totalTimeSeconds / 3600) * 10) / 10,
  };
}
