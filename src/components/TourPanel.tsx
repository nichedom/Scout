import { motion } from 'framer-motion';
import { useTourStore } from '../store/useTourStore';
import AudioPlayer from './AudioPlayer';

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div variants={stagger.item} className="mb-7">
      <h3 className="text-[11px] uppercase tracking-widest text-white/30 font-mono mb-2">{title}</h3>
      {children}
    </motion.div>
  );
}

export default function TourPanel() {
  const { tourContent, isLoading, location } = useTourStore();

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
            Gemini is researching {location?.name}…
          </p>
        </div>
      ) : !tourContent ? (
        <div className="h-full flex items-center justify-center">
          <p className="text-white/20 text-sm font-mono">Waiting for data…</p>
        </div>
      ) : (
        <motion.div
          variants={stagger.container}
          initial="initial"
          animate="animate"
        >
          <AudioPlayer tourContent={tourContent} placeName={location?.name} />

          {/* Welcome */}
          <motion.div variants={stagger.item} className="mb-7">
            <blockquote
              className="text-lg leading-relaxed text-white/80 border-l-2 pl-4"
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
            <ul className="space-y-2">
              {tourContent.curiosities.map((fact, i) => (
                <li
                  key={i}
                  className="flex gap-3 p-3 rounded-lg text-sm"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}
                >
                  <span className="flex-shrink-0 text-base">·</span>
                  <span className="text-white/70">{fact}</span>
                </li>
              ))}
            </ul>
          </Section>

          {/* Must See */}
          {tourContent.mustSee.length > 0 && (
            <Section title="Must See">
              <div className="space-y-2">
                {tourContent.mustSee.map((poi, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}
                  >
                    <p className="text-sm font-medium text-white/80 mb-0.5">{poi.name}</p>
                    <p className="text-xs text-white/50">
                      {poi.description}
                    </p>
                  </div>
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
            <motion.div variants={stagger.item} className="mb-6">
              <p className="text-sm text-white/30 text-center">
                {tourContent.closing}
              </p>
            </motion.div>
          )}

          {/* Sources */}
          {tourContent.sources.length > 0 && (
            <motion.div variants={stagger.item} className="flex gap-2 flex-wrap pb-4">
              {tourContent.sources.map((src) => (
<span
                    key={src}
                    className="text-[10px] font-mono px-2 py-1 rounded"
                    style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.25)' }}
                  >
                  {src}
                </span>
              ))}
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}
