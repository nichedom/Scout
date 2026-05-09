import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import ContentPanel from './components/ContentPanel';
import FullscreenStreetView from './components/FullscreenStreetView';
import Globe3D from './components/Globe3D';
import LandmarkPhotos from './components/LandmarkPhotos';
import SearchBar from './components/SearchBar';
import { useTourStore } from './store/useTourStore';
import { generateTour } from './services/api';
import type { LocationData } from './types';
import { DEMO_LOCATION_TOKYO_SHIBUYA } from './constants/demoLocation';

export default function App() {
  const {
    phase, location, isLoading,
    setPhase, setLocation, setTourContent,
    updateStep, resetPipeline, setIsLoading, setActiveTab, setStreetViewFocus,
  } = useTourStore();

  const [globeIntroDone, setGlobeIntroDone] = useState(false);
  const [streetViewOk, setStreetViewOk] = useState(false);
  const [mapsInitError, setMapsInitError] = useState(false);

  const revealStreetView = phase === 'exploring' && globeIntroDone && streetViewOk;
  const hideGlobe = revealStreetView || mapsInitError;

  useEffect(() => {
    if (phase === 'landing') {
      setGlobeIntroDone(false);
      setStreetViewOk(false);
      setMapsInitError(false);
    }
  }, [phase]);

  const handleGlobeIntroDone = useCallback(() => {
    setGlobeIntroDone(true);
  }, []);

  const handlePanoramaOk = useCallback(() => {
    setStreetViewOk(true);
  }, []);

  const handlePanoramaUnavailable = useCallback(() => {
    setStreetViewOk(false);
  }, []);

  const handleMapsInitError = useCallback(() => {
    setMapsInitError(true);
  }, []);

  const handleLocationSelect = async (loc: LocationData) => {
    setGlobeIntroDone(false);
    setStreetViewOk(false);
    setMapsInitError(false);
    setStreetViewFocus(null);
    setLocation(loc);
    setPhase('exploring');
    setIsLoading(true);
    setTourContent(null);
    resetPipeline();
    setActiveTab('tour');

    updateStep('geocode', 'done', `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`);

    try {
      const tour = await generateTour(loc, updateStep);
      setTourContent(tour);
    } catch (err) {
      console.error('Tour generation failed:', err);
      updateStep('gemini', 'error', (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const mapPlaceKey = location
    ? `${location.lat.toFixed(5)},${location.lng.toFixed(5)},${location.placeId ?? ''}`
    : '';

  const showGlobe =
    phase === 'landing' || (phase === 'exploring' && !hideGlobe);

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: 'var(--bg-void)' }}>

      {phase === 'exploring' && location && (
        <div
          className="absolute inset-0 z-[1]"
          style={{ pointerEvents: hideGlobe ? 'auto' : 'none' }}
        >
          <FullscreenStreetView
            key={mapPlaceKey}
            location={location}
            globeHidden={hideGlobe}
            onPanoramaOk={handlePanoramaOk}
            onPanoramaUnavailable={handlePanoramaUnavailable}
            onMapsInitError={handleMapsInitError}
          />
        </div>
      )}

      {showGlobe && (
        <motion.div
          className={`absolute inset-0 ${phase === 'exploring' && location ? 'z-[2]' : 'z-[1]'}`}
          initial={false}
          animate={{
            opacity: hideGlobe ? 0 : 1,
            scale: hideGlobe ? 1.06 : 1,
          }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{ pointerEvents: hideGlobe ? 'none' : 'auto' }}
        >
          <Globe3D
            selectedLocation={phase === 'exploring' ? location : null}
            onIntroAnimationComplete={phase === 'exploring' ? handleGlobeIntroDone : undefined}
            pointerCaptureDisabled={hideGlobe}
          />
        </motion.div>
      )}

      <motion.div
        className="absolute top-6 left-8 z-40 flex items-center gap-4 pointer-events-none pr-4"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="inline-flex h-10 items-center gap-2.5 shrink-0">
          <img
            src="/logo-scout.png"
            alt=""
            width={40}
            height={40}
            draggable={false}
            className="block h-10 w-10 rounded-full object-contain object-center shrink-0 select-none"
            aria-hidden
          />
          <span className="inline-flex h-10 items-center text-sm font-medium tracking-wide leading-none text-white/70 select-none">
            Scout
          </span>
        </div>
        {phase === 'exploring' && (
          <div className="min-w-0 w-full max-w-xs sm:max-w-sm pointer-events-auto">
            <SearchBar onSelect={handleLocationSelect} compact />
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {phase === 'landing' && (
          <motion.div
            key="landing-screen"
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-14 px-6 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.8 } }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
          >
            <div className="flex flex-col items-center -translate-y-10 sm:-translate-y-14">
              <div className="flex flex-col items-center gap-0">
                <img
                  src="/logo-scout.png"
                  alt=""
                  width={176}
                  height={176}
                  draggable={false}
                  className="h-36 w-36 sm:h-44 sm:w-44 object-contain select-none pointer-events-none"
                  aria-hidden
                />
                <p
                  className="-mt-2 sm:-mt-2.5 font-display text-6xl sm:text-7xl font-light tracking-tight text-white/95 text-center pointer-events-none"
                  aria-hidden
                >
                  Scout
                </p>
              </div>
              <h1 className="text-5xl font-light text-white/90 mt-11 sm:mt-14 mb-0 text-center leading-tight">
                Every place<br />
                <span className="visit-text font-normal">has a story.</span>
              </h1>
              <p className="text-white/30 text-sm tracking-widest uppercase mt-1.5 text-center">
                Search a place · Hear the story
              </p>
            </div>
            <motion.div
              className="w-full max-w-2xl pointer-events-auto"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 1 } }}
            >
              <SearchBar onSelect={handleLocationSelect} />
              <button
                type="button"
                onClick={() => handleLocationSelect(DEMO_LOCATION_TOKYO_SHIBUYA)}
                className="sr-only"
              >
                Skip search · try static Tokyo (Shibuya)
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isLoading && (
          <motion.div
            className="absolute inset-x-0 bottom-0 z-[15] flex items-end pb-8 pl-8 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="flex items-center gap-2 rounded-full px-4 py-2 pointer-events-auto backdrop-blur-md"
              style={{
                background: 'color-mix(in srgb, var(--bg-card) 72%, transparent)',
                border: '1px solid var(--border)',
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs text-white/50 font-mono">Researching…</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === 'exploring' && (
          <motion.div
            className="absolute z-30 top-20 bottom-8 right-6 w-full max-w-md pointer-events-none"
            initial={{ opacity: 0, x: 24, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          >
            <div className="h-full pointer-events-auto min-h-0">
              <ContentPanel onBack={() => {
                useTourStore.getState().reset();
              }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {phase === 'exploring' && location && (
        <LandmarkPhotos location={location} />
      )}
    </div>
  );
}
