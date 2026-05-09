import type { LocationData, TourContent } from '../types';

type StepCallback = (id: string, status: 'running' | 'done' | 'error', detail?: string) => void;

export async function generateTour(
  location: LocationData,
  onStep: StepCallback
): Promise<TourContent> {
  onStep('wikipedia', 'running');

  const res = await fetch('/api/tour', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: location.name,
      address: location.address,
      lat: location.lat,
      lng: location.lng,
      placeId: location.placeId,
      types: location.types,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  const data = await res.json();

  onStep('wikipedia', 'done', data.meta?.wikipediaFound ? 'Found article' : 'No article found');
  onStep('reddit', 'done', data.meta?.redditPosts ? `${data.meta.redditPosts} posts` : 'Skipped');
  onStep('gemini', 'done', `${data.meta?.tokens ?? '—'} tokens`);

  return data.tour as TourContent;
}
