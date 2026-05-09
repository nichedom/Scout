import { AnimatePresence, motion } from 'framer-motion';
import Globe3D from './components/Globe3D';
import SearchBar from './components/SearchBar';
import ContentPanel from './components/ContentPanel';
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

  const handleLocationSelect = async (loc: LocationData) => {
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

  return (
    <div className="relative w-full h-full overflow-hidden scanlines" style={{ background: 'var(--bg-void)' }}>

      {/* Globe — always visible, shrinks left on explore */}
      <motion.div
        className="absolute inset-0 z-0"
        animate={{ right: phase === 'exploring' ? '42%' : '0%' }}
        transition={{ type: 'spring', stiffness: 80, damping: 18 }}
      >
        <Globe3D selectedLocation={phase === 'exploring' ? location : null} />
      </motion.div>

      {/* Branding */}
      <motion.div
        className="absolute top-6 left-8 z-20 flex items-center gap-3"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="w-8 h-8 rounded-full border border-amber-400/60 flex items-center justify-center">
          <span className="text-sm">🌍</span>
        </div>
        <span className="font-display text-lg font-bold tracking-wide text-white/90">
          Scout
        </span>
      </motion.div>

      {/* Landing hero text */}
      <AnimatePresence>
        {phase === 'landing' && (
          <motion.div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.8 } }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
          >
            <h1 className="font-display text-6xl font-bold text-white/90 mb-4 text-center leading-tight">
              Every place<br />
              <span className="gradient-text">has a story.</span>
            </h1>
            <p className="font-body text-white/40 text-base tracking-[0.25em] uppercase mt-2">
              Drop a pin · Hear the story
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search bar — centered on landing, compact top-left on explore */}
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
            className="absolute top-6 z-20"
            style={{ left: '5%', right: '44%' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <SearchBar onSelect={handleLocationSelect} compact />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading pulse overlay on globe */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            className="absolute inset-y-0 left-0 z-10 flex items-end pb-8 pl-8"
            style={{ right: phase === 'exploring' ? '42%' : '0' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center gap-2 glass rounded-full px-4 py-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping-slow" />
              <span className="text-xs text-white/60 font-mono">Researching…</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content panel */}
      <AnimatePresence>
        {phase === 'exploring' && (
          <motion.div
            className="absolute top-0 right-0 z-10 h-full"
            style={{ width: '42%' }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 80, damping: 18 }}
          >
            <ContentPanel onBack={() => {
              useTourStore.getState().reset();
            }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
