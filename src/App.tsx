import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import ContentPanel from './components/ContentPanel';
import FullscreenStreetView from './components/FullscreenStreetView';
import Globe3D from './components/Globe3D';
import SearchBar from './components/SearchBar';
import { useTourStore } from './store/useTourStore';
import { generateTour } from './services/api';
import type { LocationData } from './types';
import { DEMO_LOCATION_TOKYO_SHIBUYA } from './constants/demoLocation';

export default function App() {
  const {
    phase, location, isLoading,
    setPhase, setLocation, setTourContent,
    updateStep, resetPipeline, setIsLoading, setActiveTab,
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
        className="absolute top-6 left-8 z-20 flex items-center gap-3 pointer-events-none"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="w-6 h-6 rounded-full bg-white/10" />
        <span className="text-sm font-medium tracking-wide text-white/70 select-none">
          Scout
        </span>
      </motion.div>

      <AnimatePresence>
        {phase === 'landing' && (
          <motion.div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.8 } }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
          >
            <h1 className="text-5xl font-light text-white/90 mb-4 text-center leading-tight">
              Every place<br />
              <span className="visit-text font-normal">has a story.</span>
            </h1>
            <p className="text-white/30 text-sm tracking-widest uppercase mt-2">
              Drop a pin · Hear the story
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {phase === 'landing' ? (
          <motion.div
            key="search-landing"
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 w-full max-w-2xl px-6 flex flex-col items-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 1 } }}
            exit={{ opacity: 0, y: -10, transition: { duration: 0.25 } }}
          >
            <SearchBar onSelect={handleLocationSelect} />
            <button
              type="button"
              onClick={() => handleLocationSelect(DEMO_LOCATION_TOKYO_SHIBUYA)}
              className="glass rounded-xl px-5 py-2.5 text-xs font-mono text-white/55 hover:text-amber-400/95 hover:border-amber-400/25 transition-colors"
              style={{ borderColor: 'var(--border)' }}
            >
              Skip search · try static Tokyo (Shibuya)
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="search-explore"
            className="absolute top-20 z-40 left-6 right-[min(28rem,calc(100vw-1.5rem))] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="pointer-events-auto">
              <SearchBar onSelect={handleLocationSelect} compact />
            </div>
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
            <div className="flex items-center gap-2 rounded-full px-4 py-2 pointer-events-auto" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
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
    </div>
  );
}
