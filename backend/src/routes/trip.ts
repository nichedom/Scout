import { Router } from 'express';
import { generateTripCosts } from '../services/gemini';
import type { TripLeg, PointOfInterest } from '../types';

const router = Router();

router.post('/', async (req, res) => {
  const { location, destination, mustSee, travelMode, legs } = req.body as {
    location: { name: string; address: string; lat: number; lng: number };
    destination: { name: string; address: string; lat: number; lng: number };
    mustSee: PointOfInterest[];
    travelMode: 'walking' | 'driving' | 'transit';
    legs: TripLeg[];
  };

  if (!location?.name || !destination?.name) {
    return res.status(400).json({ error: 'location and destination are required' });
  }

  try {
    const tripPlan = await generateTripCosts({
      location: location.name,
      destination: destination.name,
      selectedPois: [destination.name],
      mustSee: mustSee ?? [],
      travelMode: travelMode ?? 'walking',
      legs: legs ?? [],
    });

    return res.json(tripPlan);
  } catch (err) {
    console.error('[trip] generation error:', err);
    return res.status(500).json({ error: (err as Error).message });
  }
});

export default router;