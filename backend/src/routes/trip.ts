import { Router } from 'express';
import { generateTripCosts } from '../services/gemini';
import type { TripLeg, PointOfInterest } from '../types';

const router = Router();

router.post('/', async (req, res) => {
  const { location, selectedPois, mustSee, travelMode, legs } = req.body as {
    location: { name: string; address: string; lat: number; lng: number };
    selectedPois: string[];
    mustSee: PointOfInterest[];
    travelMode: 'walking' | 'driving' | 'transit';
    legs: TripLeg[];
  };

  if (!location?.name || !selectedPois?.length) {
    return res.status(400).json({ error: 'location and selectedPois are required' });
  }

  try {
    const tripPlan = await generateTripCosts({
      location: location.name,
      selectedPois,
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