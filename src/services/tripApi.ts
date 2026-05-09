import type { LocationData, TripPlan, TripLeg } from '../types';

interface TripPayload {
  location: { name: string; address: string; lat: number; lng: number };
  destination: { name: string; address: string; lat: number; lng: number };
  mustSee: { name: string; description: string; type: string }[];
  travelMode: 'walking' | 'driving' | 'transit';
  legs: TripLeg[];
}

export async function generateTrip(payload: TripPayload): Promise<TripPlan> {
  const res = await fetch('/api/trip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    let message = `HTTP ${res.status}`;
    const trimmed = text.trim();
    if (trimmed) {
      try {
        const body = JSON.parse(trimmed) as { error?: string };
        if (body?.error) message = body.error;
      } catch {
        message = trimmed.slice(0, 400);
      }
    }
    throw new Error(message);
  }

  return (await res.json()) as TripPlan;
}