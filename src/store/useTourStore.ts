import { create } from 'zustand';
import type { LocationData, TourContent, PipelineStep, AppPhase, TripPlan, TripDestination, PlacePhotoData } from '../types';

const INITIAL_STEPS: PipelineStep[] = [
  { id: 'geocode', icon: '📍', label: 'Locating coordinates', status: 'idle' },
  { id: 'wikipedia', icon: '📖', label: 'Fetching Wikipedia data', status: 'idle' },
  { id: 'reddit', icon: '💬', label: 'Scanning community posts', status: 'idle' },
  { id: 'gemini', icon: '✨', label: 'Gemini 2.5 Flash — generating narrative', status: 'idle' },
];

export type StreetViewFocus = {
  lat: number;
  lng: number;
  lookAt?: { lat: number; lng: number };
  label?: string;
  placeId?: string;
  photos?: PlacePhotoData[];
};

interface TourStore {
  phase: AppPhase;
  location: LocationData | null;
  tourContent: TourContent | null;
  pipeline: PipelineStep[];
  isLoading: boolean;
  activeTab: 'tour' | 'pipeline' | 'trip';
  /** When set, Street View centers here instead of the main selected location. */
  streetViewFocus: StreetViewFocus | null;

  tripPlan: TripPlan | null;
  tripLoading: boolean;
  tripDestination: TripDestination | null;

  setPhase: (phase: AppPhase) => void;
  setLocation: (loc: LocationData) => void;
  setTourContent: (content: TourContent | null) => void;
  updateStep: (id: string, status: PipelineStep['status'], detail?: string) => void;
  resetPipeline: () => void;
  setIsLoading: (v: boolean) => void;
  setActiveTab: (tab: 'tour' | 'pipeline' | 'trip') => void;
  setStreetViewFocus: (focus: StreetViewFocus | null) => void;
  setTripPlan: (plan: TripPlan | null) => void;
  setTripLoading: (v: boolean) => void;
  setTripDestination: (dest: TripDestination | null) => void;
  reset: () => void;
}

export const useTourStore = create<TourStore>((set) => ({
  phase: 'landing',
  location: null,
  tourContent: null,
  pipeline: INITIAL_STEPS,
  isLoading: false,
  activeTab: 'tour',
  streetViewFocus: null,

  tripPlan: null,
  tripLoading: false,
  tripDestination: null,

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
  setStreetViewFocus: (streetViewFocus) => set({ streetViewFocus }),
  setTripPlan: (tripPlan) => set({ tripPlan }),
  setTripLoading: (tripLoading) => set({ tripLoading }),
  setTripDestination: (tripDestination) => set({ tripDestination }),
  reset: () =>
    set({
      phase: 'landing',
      location: null,
      tourContent: null,
      pipeline: INITIAL_STEPS,
      isLoading: false,
      activeTab: 'tour',
      streetViewFocus: null,
      tripPlan: null,
      tripLoading: false,
      tripDestination: null,
    }),
}));
