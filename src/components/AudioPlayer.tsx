import { useEffect, useMemo, useRef, useState } from 'react';
import { generateNarration } from '../services/api';
import type { TourContent } from '../types';

interface Props {
  tourContent: TourContent;
  placeName?: string;
}

function buildNarrationScript(tour: TourContent, placeName?: string): string {
  const mustSee = tour.mustSee
    .map((poi) => `Our next stop is ${poi.name}. ${poi.description}`)
    .join('\n\n');

  const curiosities = tour.curiosities
    .map((fact) => `Here is something worth noticing. ${fact}`)
    .join('\n\n');

  return [
    placeName ? `Welcome to ${placeName}.` : '',
    tour.welcome,
    tour.history,
    curiosities,
    mustSee,
    tour.localTips ? `Before you keep exploring, a few local tips. ${tour.localTips}` : '',
    tour.closing,
  ]
    .filter(Boolean)
    .join('\n\n')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatTime(value: number) {
  if (!Number.isFinite(value)) return '0:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function AudioPlayer({ tourContent, placeName }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const script = useMemo(() => buildNarrationScript(tourContent, placeName), [tourContent, placeName]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  useEffect(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setError(null);
  }, [script]);

  const createAudio = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const blob = await generateNarration(script);
      const url = URL.createObjectURL(blob);
      setAudioUrl((previousUrl) => {
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        return url;
      });
      window.setTimeout(() => {
        void audioRef.current?.play();
      }, 0);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audioUrl || !audio) {
      await createAudio();
      return;
    }

    if (audio.paused) {
      await audio.play();
    } else {
      audio.pause();
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const buttonLabel = isGenerating ? 'Generating narration' : isPlaying ? 'Pause narration' : 'Play narration';

  return (
    <div
      className="mb-6 rounded-lg p-3"
      style={{ background: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.18)' }}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlayback}
          disabled={isGenerating}
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-mono transition-all disabled:opacity-50"
          style={{ background: 'rgba(245,166,35,0.14)', color: 'var(--amber)', border: '1px solid rgba(245,166,35,0.28)' }}
          title={buttonLabel}
          aria-label={buttonLabel}
        >
          {isGenerating ? (
            <span className="w-4 h-4 rounded-full border border-amber-400/30 border-t-amber-400 animate-spin" />
          ) : isPlaying ? (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg className="w-4 h-4 ml-0.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="text-[10px] uppercase tracking-widest font-mono text-white/35">
              Guided audio
            </p>
            <p className="text-[10px] font-mono text-white/25">
              {formatTime(currentTime)} / {formatTime(duration)}
            </p>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full rounded-full transition-[width]"
              style={{ width: `${progress}%`, background: 'var(--amber)' }}
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-300/80 font-mono mt-3">
          {error}
        </p>
      )}

      <audio
        ref={audioRef}
        src={audioUrl ?? undefined}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
      />
    </div>
  );
}
