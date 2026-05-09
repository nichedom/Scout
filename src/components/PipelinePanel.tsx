import { motion, AnimatePresence } from 'framer-motion';
import { useTourStore } from '../store/useTourStore';
import type { PipelineStep } from '../types';

function StepRow({ step, isLast }: { step: PipelineStep; isLast: boolean }) {
  const statusColor = {
    idle: 'rgba(255,255,255,0.15)',
    running: 'var(--cyan)',
    done: '#4ade80',
    error: '#f87171',
  }[step.status];

  const statusBg = {
    idle: 'rgba(255,255,255,0.03)',
    running: 'rgba(0,198,255,0.06)',
    done: 'rgba(74,222,128,0.06)',
    error: 'rgba(248,113,113,0.06)',
  }[step.status];

  return (
    <div className="flex gap-4">
      {/* Left: connector line + icon */}
      <div className="flex flex-col items-center">
        <motion.div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg relative"
          style={{ background: statusBg, border: `1px solid ${statusColor}30` }}
          animate={step.status === 'running' ? { boxShadow: [`0 0 0px ${statusColor}`, `0 0 12px ${statusColor}`, `0 0 0px ${statusColor}`] } : {}}
          transition={{ duration: 1.2, repeat: Infinity }}
        >
          <span>{step.icon}</span>
          {step.status === 'running' && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          )}
        </motion.div>
        {!isLast && (
          <div className="w-px flex-1 my-1" style={{ background: step.status === 'done' ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.06)' }} />
        )}
      </div>

      {/* Right: content */}
      <div className="flex-1 pb-5">
        <div className="flex items-center justify-between mb-0.5">
          <span
            className="text-sm font-body"
            style={{ color: step.status === 'idle' ? 'rgba(255,255,255,0.25)' : 'rgba(221,238,255,0.85)' }}
          >
            {step.label}
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
      <span className="flex items-center gap-1 text-[10px] font-mono text-cyan-400">
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
      {/* Header */}
      <div className="mb-6">
        <p className="text-[10px] uppercase tracking-[0.25em] text-white/30 font-mono mb-1">Research pipeline</p>
        <h3 className="text-white/80 font-body text-sm">
          {isLoading ? 'Gathering data in real time…' : 'Pipeline complete'}
        </h3>
      </div>

      {/* Steps */}
      <div>
        {pipeline.map((step, i) => (
          <StepRow key={step.id} step={step} isLast={i === pipeline.length - 1} />
        ))}
      </div>

      {/* Data sources info */}
      <div
        className="mt-6 p-4 rounded-xl text-xs font-mono space-y-2"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}
      >
        <p className="text-white/30 text-[10px] uppercase tracking-widest mb-3">Data sources</p>
        <div className="flex items-center gap-2 text-white/40">
          <span>📖</span>
          <span>Wikipedia REST API</span>
        </div>
        <div className="flex items-center gap-2 text-white/40">
          <span>🧠</span>
          <span>Gemini 2.0 Flash</span>
        </div>
        <div className="flex items-center gap-2 text-white/40">
          <span>📍</span>
          <span>Google Places API</span>
        </div>
        {location && (
          <div className="pt-2 border-t border-white/5 text-white/20">
            Target: {location.name} ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})
          </div>
        )}
      </div>
    </div>
  );
}
