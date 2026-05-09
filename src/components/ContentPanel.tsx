import { motion, AnimatePresence } from 'framer-motion';
import { useTourStore } from '../store/useTourStore';
import TourPanel from './TourPanel';
import MapView from './MapView';
import PipelinePanel from './PipelinePanel';

const TABS = [
  { id: 'tour' as const, label: 'Tour', icon: '🗺️' },
  { id: 'map' as const, label: 'Street View', icon: '📷' },
  { id: 'pipeline' as const, label: 'Pipeline', icon: '⚡' },
];

interface Props {
  onBack: () => void;
}

export default function ContentPanel({ onBack }: Props) {
  const { location, activeTab, setActiveTab } = useTourStore();

  if (!location) return null;

  return (
    <div
      className="h-full flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #080d14 0%, #0e1824 100%)',
        borderLeft: '1px solid var(--border)',
      }}
    >
      {/* Panel header */}
      <div
        className="flex-shrink-0 px-5 pt-5 pb-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-white/30 font-mono mb-1">
              Now exploring
            </p>
            <h2 className="font-display text-2xl font-bold text-white leading-tight">
              {location.name}
            </h2>
            <p className="text-xs text-white/40 mt-1 font-body">{location.address}</p>
          </div>
          <button
            onClick={onBack}
            className="text-white/30 hover:text-white/70 transition-colors mt-1 p-1"
            title="Back to globe"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono
                transition-all duration-200
                ${activeTab === tab.id
                  ? 'text-white'
                  : 'text-white/35 hover:text-white/60'
                }
              `}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="tab-bg"
                  className="absolute inset-0 rounded-lg"
                  style={{ background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.3)' }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                />
              )}
              <span className="relative z-10">{tab.icon}</span>
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'tour' && (
            <motion.div
              key="tour"
              className="h-full"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <TourPanel />
            </motion.div>
          )}
          {activeTab === 'map' && (
            <motion.div
              key="map"
              className="h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <MapView />
            </motion.div>
          )}
          {activeTab === 'pipeline' && (
            <motion.div
              key="pipeline"
              className="h-full"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <PipelinePanel />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
