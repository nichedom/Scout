import { motion, AnimatePresence } from 'framer-motion';
import { useTourStore } from '../store/useTourStore';
import TourPanel from './TourPanel';
import PipelinePanel from './PipelinePanel';

const TABS = [
  { id: 'tour' as const, label: 'Tour' },
  { id: 'pipeline' as const, label: 'Pipeline' },
];

interface Props {
  onBack: () => void;
}

export default function ContentPanel({ onBack }: Props) {
  const { location, activeTab, setActiveTab } = useTourStore();

  if (!location) return null;

  return (
    <div
      className="h-full min-h-0 flex flex-col rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl"
      style={{
        background: 'color-mix(in srgb, var(--bg-surface) 92%, transparent)',
        border: '1px solid var(--border)',
      }}
    >
      <div
        className="flex-shrink-0 px-5 pt-5 pb-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-start justify-between mb-4 gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-white/25 font-mono mb-1">
              Now exploring
            </p>
            <h2 className="text-xl font-medium text-white leading-tight break-words">
              {location.name}
            </h2>
            <p className="text-xs text-white/40 mt-1">{location.address}</p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="text-white/30 hover:text-white/60 transition-colors p-1 flex-shrink-0"
            title="Back to globe"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex gap-4 flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`
                text-xs font-mono tracking-wide pb-1 border-b transition-colors duration-200
                ${activeTab === tab.id
                  ? 'text-white border-white/40'
                  : 'text-white/25 border-transparent hover:text-white/50'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          {activeTab === 'tour' && (
            <motion.div
              key="tour"
              className="h-full min-h-0 flex-1"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <TourPanel />
            </motion.div>
          )}
          {activeTab === 'pipeline' && (
            <motion.div
              key="pipeline"
              className="h-full min-h-0 flex-1"
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
