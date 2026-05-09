import { motion, AnimatePresence } from 'framer-motion';
import { useTourStore } from '../store/useTourStore';
import type { PipelineStep } from '../types';

function StepRow({ step, isLast }: { step: PipelineStep; isLast: boolean }) {
  const statusColor = {
    idle: 'rgba(255,255,255,0.12)',
    running: 'rgba(232,168,73,0.7)',
    done: '#4ade80',
    error: '#f87171',
  }[step.status];

  const statusBg = {
    idle: 'rgba(255,255,255,0.02)',
    running: 'rgba(232,168,73,0.06)',
    done: 'rgba(74,222,128,0.06)',
    error: 'rgba(248,113,113,0.06)',
  }[step.status];

  const isGeminiStep = step.id === 'gemini';

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <motion.div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
          style={{ background: statusBg, border: `1px solid ${statusColor}30` }}
        >
          <span>{step.icon}</span>
        </motion.div>
        {!isLast && (
          <div className="w-px flex-1 my-1" style={{ background: step.status === 'done' ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.05)' }} />
        )}
      </div>

      <div className="flex-1 pb-5">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-sm" style={{ color: step.status === 'idle' ? 'rgba(255,255,255,0.25)' : 'rgba(240,240,240,0.85)' }}>
            {step.label}
            {isGeminiStep && step.status === 'running' && (
              <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(232,168,73,0.15)', color: '#e8a849' }}>
                AI
              </span>
            )}
          </span>
          <StatusBadge status={step.status} />
        </div>
        <AnimatePresence>
          {step.detail && (
            <motion.p
              className="text-xs font-mono mt-1"
              style={{ color: 'var(--text-secondary)' }}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              {step.detail}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: PipelineStep['status'] }) {
  if (status === 'idle') return <span className="text-[10px] font-mono text-white/20">waiting</span>;
  if (status === 'running') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-mono" style={{ color: '#e8a849' }}>
        <svg className="w-3 h-3 animate-spin-slow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83" />
        </svg>
        running
      </span>
    );
  }
  if (status === 'done') return <span className="text-[10px] font-mono text-green-400">✓ done</span>;
  return <span className="text-[10px] font-mono text-red-400">✕ error</span>;
}

export default function PipelinePanel() {
  const { pipeline, location, isLoading } = useTourStore();

  return (
    <div className="h-full overflow-y-auto panel-scroll px-5 py-5">
      <div className="mb-6">
        <p className="text-[10px] uppercase tracking-widest text-white/30 font-mono mb-1">Research pipeline</p>
        <h3 className="text-white/80 text-sm">
          {isLoading ? 'Gathering data in real time…' : 'Pipeline complete'}
        </h3>
      </div>

      <div>
        {pipeline.map((step, i) => (
          <StepRow key={step.id} step={step} isLast={i === pipeline.length - 1} />
        ))}
      </div>

      <div
        className="mt-6 p-4 rounded-lg text-xs font-mono space-y-3"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}
      >
        <p className="text-white/30 text-[10px] uppercase tracking-widest mb-2">APIs & Data sources</p>
        <div className="flex items-start gap-3">
          <span className="text-sm mt-0.5">📖</span>
          <div>
            <p className="text-white/50 font-medium">Wikipedia REST API</p>
            <p className="text-white/20 text-[10px] mt-0.5">Historical context & encyclopedic data</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-sm mt-0.5">✨</span>
          <div>
            <p className="text-white/50 font-medium" style={{ color: '#e8a849' }}>Gemini 2.5 Flash</p>
            <p className="text-white/20 text-[10px] mt-0.5">AI-powered narrative generation & analysis</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-sm mt-0.5">📍</span>
          <div>
            <p className="text-white/50 font-medium">Google Places API</p>
            <p className="text-white/20 text-[10px] mt-0.5">Location search & geocoding</p>
          </div>
        </div>
        {location && (
          <div className="pt-3 mt-1" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-white/20 text-[10px]">
              Target: {location.name} ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})
            </p>
          </div>
        )}
      </div>
    </div>
  );
}