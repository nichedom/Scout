import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useGoogleMaps } from '../context/GoogleMapsProvider';
import { fetchPlacePhotos } from '../services/placePhotos';
import { useTourStore } from '../store/useTourStore';
import type { LocationData, PlacePhotoData } from '../types';

interface Props {
  location: LocationData;
}

function PhotoAttribution({ photo }: { photo: PlacePhotoData }) {
  if (photo.attributionHtml) {
    return (
      <span
        className="[&_a]:text-white/70 [&_a]:underline"
        dangerouslySetInnerHTML={{ __html: photo.attributionHtml }}
      />
    );
  }

  return <>{photo.attribution ?? 'Google Places'}</>;
}

export default function LandmarkPhotos({ location }: Props) {
  const { isLoaded: mapsLoaded } = useGoogleMaps();
  const streetViewFocus = useTourStore((s) => s.streetViewFocus);
  const [expanded, setExpanded] = useState(false);
  const [photos, setPhotos] = useState<PlacePhotoData[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const target = useMemo(() => {
    const focusPhotos = streetViewFocus?.photos ?? [];
    const locationPhotos = location.photos ?? [];
    const lat = streetViewFocus?.lookAt?.lat ?? streetViewFocus?.lat ?? location.lat;
    const lng = streetViewFocus?.lookAt?.lng ?? streetViewFocus?.lng ?? location.lng;
    const label = streetViewFocus?.label ?? location.name;
    const placeId = streetViewFocus?.placeId ?? location.placeId;

    return {
      key: `${placeId ?? label}:${lat.toFixed(5)},${lng.toFixed(5)}`,
      label,
      query: `${label} ${location.address || location.name}`,
      lat,
      lng,
      placeId,
      seedPhotos: focusPhotos.length > 0 ? focusPhotos : locationPhotos,
    };
  }, [location, streetViewFocus]);

  useEffect(() => {
    let cancelled = false;

    setExpanded(false);
    setActiveIndex(0);
    setPhotos(target.seedPhotos);
    setLoading(target.seedPhotos.length === 0);

    if (!mapsLoaded) {
      setLoading(false);
      return;
    }

    fetchPlacePhotos({
      query: target.query,
      lat: target.lat,
      lng: target.lng,
      placeId: target.placeId,
    })
      .then((nextPhotos) => {
        if (cancelled) return;
        if (nextPhotos.length > 0) {
          setPhotos(nextPhotos);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mapsLoaded, target.key, target.label, target.lat, target.lng, target.placeId, target.query, target.seedPhotos]);

  if (!loading && photos.length === 0) return null;

  const activePhoto = photos[Math.min(activeIndex, photos.length - 1)];

  return (
    <div className="absolute left-6 bottom-7 z-30 pointer-events-auto">
      <AnimatePresence mode="wait">
        {!expanded ? (
          <motion.button
            key="photos-button"
            type="button"
            onClick={() => photos.length > 0 && setExpanded(true)}
            disabled={photos.length === 0}
            className="glass rounded-xl px-4 py-3 text-xs font-mono text-white/75 hover:text-white transition-colors disabled:opacity-60 disabled:cursor-wait"
            style={{ borderColor: 'rgba(255,255,255,0.16)' }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            {loading ? 'Finding photos...' : `Photos (${photos.length})`}
          </motion.button>
        ) : (
          <motion.div
            key="photos-panel"
            className="w-[min(380px,calc(100vw-32px))] overflow-hidden rounded-xl backdrop-blur-md"
            style={{ background: 'rgba(14,14,14,0.88)', border: '1px solid rgba(255,255,255,0.14)' }}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-white/30 font-mono">Landmark photos</p>
                <p className="truncate text-sm text-white/80">{target.label}</p>
              </div>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="ml-3 rounded-lg px-2 py-1 text-sm text-white/40 hover:text-white/80"
              >
                x
              </button>
            </div>

            {activePhoto && (
              <div className="relative aspect-[4/3] bg-black">
                <img
                  src={activePhoto.url}
                  alt={`${target.label} landmark`}
                  className="h-full w-full object-cover"
                />
                <p className="absolute bottom-0 left-0 right-0 bg-black/55 px-3 py-1.5 text-[10px] text-white/55">
                  <PhotoAttribution photo={activePhoto} />
                </p>
              </div>
            )}

            {photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto p-2">
                {photos.map((photo, i) => (
                  <button
                    key={photo.url}
                    type="button"
                    onClick={() => setActiveIndex(i)}
                    className={`h-14 w-20 flex-shrink-0 overflow-hidden rounded-md border transition-colors ${
                      i === activeIndex ? 'border-amber-400/80' : 'border-white/10 hover:border-white/35'
                    }`}
                  >
                    <img
                      src={photo.url}
                      alt={`${target.label} thumbnail ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
