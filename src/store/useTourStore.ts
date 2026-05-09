import { create } from 'zustand';
import type { LocationData, TourContent, PipelineStep, AppPhase } from '../types';

const INITIAL_STEPS: PipelineStep[] = [
  { id: 'geocode', icon: '📍', label: 'Locating coordinates', status: 'idle' },
  { id: 'wikipedia', icon: '📖', label: 'Fetching Wikipedia data', status: 'idle' },
  { id: 'reddit', icon: '💬', label: 'Scanning community posts', status: 'idle' },
  { id: 'gemini', icon: '🧠', label: 'Generating AI narrative', status: 'idle' },
];

interface TourStore {
  phase: AppPhase;
  location: LocationData | null;
  tourContent: TourContent | null;
  pipeline: PipelineStep[];
  isLoading: boolean;
  activeTab: 'tour' | 'map' | 'pipeline';

  setPhase: (phase: AppPhase) => void;
  setLocation: (loc: LocationData) => void;
  setTourContent: (content: TourContent | null) => void;
  updateStep: (id: string, status: PipelineStep['status'], detail?: string) => void;
  resetPipeline: () => void;
  setIsLoading: (v: boolean) => void;
  setActiveTab: (tab: 'tour' | 'map' | 'pipeline') => void;
  reset: () => void;
}

export const useTourStore = create<TourStore>((set) => ({
  phase: 'landing',
  location: null,
  tourContent: null,
  pipeline: INITIAL_STEPS,
  isLoading: false,
  activeTab: 'tour',

  setPhase: (phase) => set({ phase }),
  setLocation: (location) => set({ location }),
  setTourContent: (tourContent) => set({ tourContent }),
  updateStep: (id, status, detail) =>
    set((s) => ({
      pipeline: s.pipeline.map((step) =>
        step.id === id ? { ...step, status, detail } : step
      ),
    })),
  resetPipeline: () => set({ pipeline: INITIAL_STEPS.map((s) => ({ ...s, status: 'idle' as const })) }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setActiveTab: (activeTab) => set({ activeTab }),
  reset: () =>
    set({
      phase: 'landing',
      location: null,
      tourContent: null,
      pipeline: INITIAL_STEPS,
      isLoading: false,
      activeTab: 'tour',
    }),
}));
