import type { TripLeg } from '../types';

function getTravelMode(mode: 'walking' | 'driving' | 'transit'): google.maps.TravelMode {
  switch (mode) {
    case 'walking': return google.maps.TravelMode.WALKING;
    case 'driving': return google.maps.TravelMode.DRIVING;
    case 'transit': return google.maps.TravelMode.TRANSIT;
    default: return google.maps.TravelMode.WALKING;
  }
}

export async function getDirectionsLegs(
  origin: { lat: number; lng: number },
  waypoints: string[],
  travelMode: 'walking' | 'driving' | 'transit'
): Promise<TripLeg[]> {
  const directionsService = new google.maps.DirectionsService();

  if (waypoints.length < 2) {
    throw new Error('Need at least 2 stops to plan a route');
  }

  const originStr = `${origin.lat},${origin.lng}`;
  const destination = waypoints[waypoints.length - 1];
  const middleWaypoints = waypoints.slice(0, -1).slice(1).map((wp) => ({
    location: wp,
    stopover: true,
  }));

  const request: google.maps.DirectionsRequest = {
    origin: originStr,
    destination,
    waypoints: middleWaypoints.length > 0 ? middleWaypoints : undefined,
    travelMode: getTravelMode(travelMode),
    optimizeWaypoints: true,
  };

  const result = await directionsService.route(request);

  const legs: TripLeg[] = [];
  const routeLegs = result.routes[0]?.legs ?? [];

  const allStopNames = [waypoints[0], ...waypoints.slice(1)];

  for (let i = 0; i < routeLegs.length; i++) {
    const leg = routeLegs[i];
    legs.push({
      from: allStopNames[i] ?? leg.start_address,
      to: allStopNames[i + 1] ?? leg.end_address,
      distanceKm: Math.round(((leg.distance?.value ?? 0) / 1000) * 10) / 10,
      durationMin: Math.round((leg.duration?.value ?? 0) / 60),
      mode: travelMode,
    });
  }

  return legs;
}