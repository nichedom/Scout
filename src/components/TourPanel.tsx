import { motion } from 'framer-motion';
import { useCallback, useRef, type ReactNode } from 'react';
import { useGoogleMaps } from '../context/GoogleMapsProvider';
import { photosFromLegacyPlace } from '../services/placePhotos';
import { useTourStore, type StreetViewFocus } from '../store/useTourStore';
import type { LocationData, PointOfInterest } from '../types';
import AudioPlayer, { type AudioPlayerHandle } from './AudioPlayer';

const stagger = {
  container: { animate: { transition: { staggerChildren: 0.07 } } },
  item: {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  },
};

const BAD_PLACE_TYPES = new Set([
  'subway_station',
  'transit_station',
  'train_station',
  'parking',
  'lodging',
]);

function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 rounded animate-pulse"
          style={{
            background: 'rgba(255,255,255,0.05)',
            width: i === lines - 1 ? '65%' : '100%',
          }}
        />
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <motion.div variants={stagger.item} className="mb-6">
      <h3 className="text-[11px] uppercase tracking-widest text-white/30 font-mono mb-2">{title}</h3>
      {children}
    </motion.div>
  );
}

function geocodeBiasBounds(lat: number, lng: number, radiusKm: number) {
  const dLat = radiusKm / 111;
  const dLng = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  return new google.maps.LatLngBounds(
    new google.maps.LatLng(lat - dLat, lng - dLng),
    new google.maps.LatLng(lat + dLat, lng + dLng),
  );
}

function tokenScore(name: string, query: string) {
  const normalizedName = name.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 2 && normalizedName.includes(token))
    .length;
}

function placeTypePenalty(types?: string[]) {
  return types?.some((type) => BAD_PLACE_TYPES.has(type)) ? 4 : 0;
}

function resolvePoiWithPlaces(poi: PointOfInterest, loc: LocationData): Promise<StreetViewFocus | null> {
  return new Promise((resolve) => {
    if (!google.maps.places?.PlacesService) {
      resolve(null);
      return;
    }

    const serviceNode = document.createElement('div');
    const service = new google.maps.places.PlacesService(serviceNode);
    const location = new google.maps.LatLng(loc.lat, loc.lng);
    const query = `${poi.name} ${loc.name}`;

    service.textSearch(
      {
        query,
        location,
        radius: 8000,
      },
      (results, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !results?.length) {
          resolve(null);
          return;
        }

        const ranked = results
          .filter((result) => result.geometry?.location)
          .map((result) => {
            const name = result.name ?? '';
            const placeLocation = result.geometry!.location!;
            const distanceKm = google.maps.geometry?.spherical
              ? google.maps.geometry.spherical.computeDistanceBetween(location, placeLocation) / 1000
              : 0;
            const score =
              tokenScore(name, poi.name) * 3 +
              tokenScore(result.formatted_address ?? '', loc.name) -
              placeTypePenalty(result.types) -
              Math.min(distanceKm, 8) * 0.15;

            return { result, score };
          })
          .sort((a, b) => b.score - a.score);

        const best = ranked[0]?.result;
        const bestLocation = best?.geometry?.location;
        if (!best || !bestLocation) {
          resolve(null);
          return;
        }

        resolve({
          lat: bestLocation.lat(),
          lng: bestLocation.lng(),
          lookAt: {
            lat: bestLocation.lat(),
            lng: bestLocation.lng(),
          },
          label: best.name || poi.name,
          placeId: best.place_id,
          photos: photosFromLegacyPlace(best.photos),
        });
      },
    );
  });
}

function geocodePoiForStreetView(poi: PointOfInterest, loc: LocationData): Promise<StreetViewFocus | null> {
  return new Promise((resolve) => {
    const geocoder = new google.maps.Geocoder();
    const bounds = geocodeBiasBounds(loc.lat, loc.lng, 28);
    const run = (address: string, next?: () => void) => {
      geocoder.geocode({ address, bounds }, (results, status) => {
        if (status === 'OK' && results?.[0]?.geometry?.location) {
          const p = results[0].geometry.location;
          resolve({
            lat: p.lat(),
            lng: p.lng(),
            lookAt: { lat: p.lat(), lng: p.lng() },
            label: results[0].formatted_address || poi.name,
          });
        } else if (next) {
          next();
        } else {
          resolve(null);
        }
      });
    };
    run(`${poi.name}, ${loc.name}`, () => {
      run(`${poi.name}, ${loc.address}`);
    });
  });
}

async function resolvePoiFocus(poi: PointOfInterest, loc: LocationData): Promise<StreetViewFocus> {
  return (
    (await resolvePoiWithPlaces(poi, loc)) ??
    (await geocodePoiForStreetView(poi, loc)) ?? {
      lat: loc.lat,
      lng: loc.lng,
      lookAt: { lat: loc.lat, lng: loc.lng },
      label: loc.name,
    }
  );
}

export default function TourPanel() {
  const { tourContent, isLoading, location, setStreetViewFocus, setActiveTab } = useTourStore();
  const { isLoaded: mapsLoaded } = useGoogleMaps();
  const audioPlayerRef = useRef<AudioPlayerHandle>(null);

  const onMustSeeClick = useCallback(
    (poi: PointOfInterest) => {
      void audioPlayerRef.current?.speakStop(poi);
      if (!location || !mapsLoaded || typeof google === 'undefined' || !google.maps) return;

      void resolvePoiFocus(poi, location).then((focus) => {
        setStreetViewFocus(focus);
      });
    },
    [location, mapsLoaded, setStreetViewFocus],
  );

  return (
    <div className="h-full overflow-y-auto panel-scroll px-5 py-4">
      {isLoading && !tourContent ? (
        <div className="space-y-8 pt-2">
          <div>
            <div className="h-2 w-24 rounded animate-pulse mb-3" style={{ background: 'rgba(245,166,35,0.3)' }} />
            <Skeleton lines={4} />
          </div>
          <div>
            <div className="h-2 w-20 rounded animate-pulse mb-3" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <Skeleton lines={6} />
          </div>
          <div>
            <div className="h-2 w-28 rounded animate-pulse mb-3" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="grid grid-cols-1 gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
              ))}
            </div>
          </div>
          <p className="text-center text-white/20 text-xs font-mono pt-4">
            Gemini is researching {location?.name}...
          </p>
        </div>
      ) : !tourContent ? (
        <div className="h-full flex items-center justify-center">
          <p className="text-white/20 text-sm font-mono">Waiting for data...</p>
        </div>
      ) : (
        <motion.div
          variants={stagger.container}
          initial="initial"
          animate="animate"
        >
          <AudioPlayer ref={audioPlayerRef} tourContent={tourContent} placeName={location?.name} autoPlay />

          <motion.div variants={stagger.item} className="mb-5">
            <blockquote
              className="text-base leading-relaxed text-white/85 border-l-2 pl-3.5"
              style={{ borderColor: 'var(--amber)' }}
            >
              {tourContent.welcome}
            </blockquote>
          </motion.div>

          <Section title="History">
            <p className="text-sm leading-relaxed font-body" style={{ color: 'var(--text-secondary)' }}>
              {tourContent.history}
            </p>
          </Section>

          <Section title="Did you know?">
            <ul className="space-y-1.5">
              {tourContent.curiosities.map((fact, i) => (
                <li
                  key={i}
                  className="flex gap-2.5 px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}
                >
                  <span className="flex-shrink-0 text-amber-400/70">-</span>
                  <span className="text-white/70">{fact}</span>
                </li>
              ))}
            </ul>
          </Section>

          {tourContent.mustSee.length > 0 && (
            <Section title="Must See">
              <p className="text-[10px] text-white/25 font-mono mb-2">
                Tap a place - Street View faces the landmark
              </p>
              <div className="space-y-2">
                {tourContent.mustSee.map((poi, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onMustSeeClick(poi)}
                    disabled={!mapsLoaded}
                    className="w-full text-left p-3 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:border-amber-400/35 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-400/50"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}
                    title={mapsLoaded ? 'Show in Street View' : 'Maps loading...'}
                  >
                    <p className="text-sm font-medium text-white/85 mb-0.5">{poi.name}</p>
                    <p className="text-xs text-white/45">
                      {poi.description}
                    </p>
                  </button>
                ))}
              </div>
            </Section>
          )}

          {tourContent.localTips && (
            <Section title="Local Tips">
              <div
                className="p-3 rounded-lg text-sm"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                {tourContent.localTips}
              </div>
            </Section>
          )}

          {tourContent.closing && (
            <motion.div variants={stagger.item} className="mb-4">
              <p className="text-xs text-white/35 text-center">
                {tourContent.closing}
              </p>
            </motion.div>
          )}

          {tourContent.sources.length > 0 && (
            <motion.div variants={stagger.item} className="text-[10px] font-mono pb-4 text-white/20">
              Sources - {tourContent.sources.join(', ')}
            </motion.div>
          )}

          <motion.div variants={stagger.item} className="pt-2 pb-4">
            <button
              onClick={() => setActiveTab('trip')}
              className="w-full py-3 rounded-xl font-mono text-sm bg-amber-400/10 border border-amber-400/20 text-amber-400 hover:bg-amber-400/20 transition-all"
            >
              Plan my visit
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
