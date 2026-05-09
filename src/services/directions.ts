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
  destination: { lat: number; lng: number },
  travelMode: 'walking' | 'driving' | 'transit',
  waypoints?: string[]
): Promise<TripLeg[]> {
  const directionsService = new google.maps.DirectionsService();

  const request: google.maps.DirectionsRequest = {
    origin: { lat: origin.lat, lng: origin.lng },
    destination: { lat: destination.lat, lng: destination.lng },
    travelMode: getTravelMode(travelMode),
    waypoints: waypoints?.map((wp) => ({
      location: wp,
      stopover: true,
    })),
    optimizeWaypoints: !!waypoints && waypoints.length > 1,
  };

  const result = await directionsService.route(request);

  const legs: TripLeg[] = [];
  const routeLegs = result.routes[0]?.legs ?? [];

  for (let i = 0; i < routeLegs.length; i++) {
    const leg = routeLegs[i];
    legs.push({
      from: leg.start_address.split(',')[0],
      to: leg.end_address.split(',')[0],
      distanceKm: Math.round(((leg.distance?.value ?? 0) / 1000) * 10) / 10,
      durationMin: Math.round((leg.duration?.value ?? 0) / 60),
      mode: travelMode,
    });
  }

  return legs;
}