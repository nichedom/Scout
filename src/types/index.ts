export interface LocationData {
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeId?: string;
  types?: string[];
}

export type PipelineStatus = 'idle' | 'running' | 'done' | 'error';

export interface PipelineStep {
  id: string;
  icon: string;
  label: string;
  status: PipelineStatus;
  detail?: string;
  durationMs?: number;
}

export interface PointOfInterest {
  name: string;
  description: string;
  type: string;
}

export interface TourContent {
  welcome: string;
  history: string;
  curiosities: string[];
  mustSee: PointOfInterest[];
  localTips: string;
  closing: string;
  sources: string[];
}

export interface TripStop {
  poi: PointOfInterest;
  selected: boolean;
}

export interface TripLeg {
  from: string;
  to: string;
  distanceKm: number;
  durationMin: number;
  mode: 'walking' | 'driving' | 'transit';
}

export interface TripCostBreakdown {
  stopName: string;
  entryCost: string;
  mealBudget: string;
  notes: string;
}

export interface TripPlan {
  legs: TripLeg[];
  costs: TripCostBreakdown[];
  totalBudgetMin: string;
  totalBudgetMax: string;
  totalDurationMin: number;
  tips: string;
}

export type AppPhase = 'landing' | 'exploring';
