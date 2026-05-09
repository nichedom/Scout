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
