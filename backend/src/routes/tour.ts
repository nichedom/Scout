import { Router } from 'express';
import { fetchWikipedia } from '../services/wikipedia';
import { generateTourContent } from '../services/gemini';

const router = Router();

router.post('/', async (req, res) => {
  const { name, address, lat, lng, placeId, types } = req.body;

  if (!name || lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'name, lat, and lng are required' });
  }

  const startTime = Date.now();

  try {
    // Step 1: Fetch Wikipedia context (parallel with initial setup)
    const wikiData = await fetchWikipedia(name).catch(() => null);

    // Step 2: Generate tour with Gemini
    const { tour, tokens } = await generateTourContent({
      name,
      address,
      lat,
      lng,
      placeId,
      types,
      wikiExtract: wikiData?.extract ?? null,
    });

    return res.json({
      tour,
      meta: {
        durationMs: Date.now() - startTime,
        tokens,
        wikipediaFound: !!wikiData,
        redditPosts: 0, // placeholder for Phase 2
      },
    });
  } catch (err) {
    console.error('[tour] generation error:', err);
    return res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
