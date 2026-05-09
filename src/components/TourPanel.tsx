import { motion } from 'framer-motion';
import { useCallback, useRef, type ReactNode } from 'react';
import { useGoogleMaps } from '../context/GoogleMapsProvider';
import { useTourStore } from '../store/useTourStore';
import type { LocationData, PointOfInterest } from '../types';
import AudioPlayer, { type AudioPlayerHandle } from './AudioPlayer';

const stagger = {
  container: { animate: { transition: { staggerChildren: 0.07 } } },
  item: {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  },
};

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

function geocodePoiForStreetView(
  poi: PointOfInterest,
  loc: LocationData,
  onLatLng: (lat: number, lng: number) => void,
) {
  const geocoder = new google.maps.Geocoder();
  const bounds = geocodeBiasBounds(loc.lat, loc.lng, 28);
  const run = (address: string, next?: () => void) => {
    geocoder.geocode({ address, bounds }, (results, status) => {
      if (status === 'OK' && results?.[0]?.geometry?.location) {
        const p = results[0].geometry.location;
        onLatLng(p.lat(), p.lng());
      } else if (next) {
        next();
      }
    });
  };
  run(`${poi.name}, ${loc.name}`, () => {
    run(`${poi.name}, ${loc.address}`);
  });
}

export default function TourPanel() {
  const { tourContent, isLoading, location, setStreetViewFocus, setActiveTab } = useTourStore();
  const { isLoaded: mapsLoaded } = useGoogleMaps();
  const audioPlayerRef = useRef<AudioPlayerHandle>(null);

  const onMustSeeClick = useCallback(
    (poi: PointOfInterest) => {
      void audioPlayerRef.current?.speakStop(poi);
      if (!location || !mapsLoaded || typeof google === 'undefined' || !google.maps) return;
      geocodePoiForStreetView(poi, location, (lat, lng) => {
        setStreetViewFocus({ lat, lng });
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

          {/* Welcome */}
          <motion.div variants={stagger.item} className="mb-5">
            <blockquote
              className="text-base leading-relaxed text-white/85 border-l-2 pl-3.5"
              style={{ borderColor: 'var(--amber)' }}
            >
              {tourContent.welcome}
            </blockquote>
          </motion.div>

          {/* History */}
          <Section title="History">
            <p className="text-sm leading-relaxed font-body" style={{ color: 'var(--text-secondary)' }}>
              {tourContent.history}
            </p>
          </Section>

          {/* Curiosities */}
          <Section title="Did you know?">
            <ul className="space-y-1.5">
              {tourContent.curiosities.map((fact, i) => (
                <li
                  key={i}
                  className="flex gap-2.5 px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}
                >
                  <span className="flex-shrink-0 text-amber-400/70">·</span>
                  <span className="text-white/70">{fact}</span>
                </li>
              ))}
            </ul>
          </Section>

          {/* Must See */}
          {tourContent.mustSee.length > 0 && (
            <Section title="Must See">
              <p className="text-[10px] text-white/25 font-mono mb-2">
                Tap a place · Street View moves there
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

          {/* Local tips */}
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

          {/* Closing */}
          {tourContent.closing && (
            <motion.div variants={stagger.item} className="mb-4">
              <p className="text-xs text-white/35 text-center">
                {tourContent.closing}
              </p>
            </motion.div>
          )}

          {/* Sources */}
          {tourContent.sources.length > 0 && (
            <motion.div variants={stagger.item} className="text-[10px] font-mono pb-4 text-white/20">
              Sources · {tourContent.sources.join(', ')}
            </motion.div>
          )}

          {/* Plan my visit */}
          <motion.div variants={stagger.item} className="pt-2 pb-4">
            <button
              onClick={() => setActiveTab('trip')}
              className="w-full py-3 rounded-xl font-mono text-sm bg-amber-400/10 border border-amber-400/20 text-amber-400 hover:bg-amber-400/20 transition-all"
            >
              Plan my visit â†’
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
