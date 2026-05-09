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
