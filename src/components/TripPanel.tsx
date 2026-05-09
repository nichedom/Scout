import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleMap, DirectionsRenderer } from '@react-google-maps/api';
import { useTourStore } from '../store/useTourStore';
import { useGoogleMaps } from '../context/GoogleMapsProvider';
import { generateTrip } from '../services/tripApi';
import { getDirectionsLegs } from '../services/directions';
import type { TripPlan, TripLeg, TripDestination } from '../types';

type TravelMode = 'walking' | 'driving' | 'transit';

const TRAVEL_MODES: { id: TravelMode; label: string; icon: string }[] = [
  { id: 'walking', label: 'Walk', icon: '🚶' },
  { id: 'driving', label: 'Drive', icon: '🚗' },
  { id: 'transit', label: 'Transit', icon: '🚇' },
];

interface TripStep {
  id: string;
  label: string;
  status: 'idle' | 'running' | 'done' | 'error';
  detail?: string;
}

const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a9a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a3a' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#3a3a4a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e0e1e' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
];

const FETCH_FIELDS = ['id', 'location', 'displayName', 'formattedAddress', 'types'] as const;

function latLngToCoords(loc: google.maps.LatLng | google.maps.LatLngLiteral): { lat: number; lng: number } {
  const asLit = loc as google.maps.LatLngLiteral;
  if (typeof asLit.lat === 'number' && typeof asLit.lng === 'number') {
    return { lat: asLit.lat, lng: asLit.lng };
  }
  const ll = loc as google.maps.LatLng;
  return { lat: ll.lat(), lng: ll.lng() };
}

function DestinationSearch({ onSelect }: { onSelect: (dest: TripDestination) => void }) {
  const { isLoaded, apiKeyMissing, loadError } = useGoogleMaps();
  const containerRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  const [widgetError, setWidgetError] = useState<string | null>(null);

  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!isLoaded || apiKeyMissing) return;

    const root = containerRef.current;
    if (!root) return;

    let cancelled = false;
    let pac: google.maps.places.PlaceAutocompleteElement | null = null;

    setWidgetError(null);
    root.replaceChildren();

    (async () => {
      try {
        const placesLib = (await google.maps.importLibrary('places')) as google.maps.PlacesLibrary & {
          PlaceAutocompleteElement?: typeof google.maps.places.PlaceAutocompleteElement;
        };

        const Ctor = placesLib.PlaceAutocompleteElement;
        if (!Ctor) {
          throw new Error('PlaceAutocompleteElement not available.');
        }

        pac = new Ctor({});
        pac.setAttribute('placeholder', 'Where do you want to go?');
        pac.classList.add('compact');
        pac.style.width = '100%';
        pac.style.boxSizing = 'border-box';
        pac.style.position = 'relative';
        pac.style.zIndex = '50';

        const onSelectPlace = async (event: Event) => {
          const ev = event as unknown as {
            place?: google.maps.places.Place;
            placePrediction?: google.maps.places.PlacePrediction;
          };

          let place: google.maps.places.Place | undefined;
          if (ev.place) {
            place = ev.place;
          } else if (ev.placePrediction) {
            place = ev.placePrediction.toPlace();
          }
          if (!place) return;

          try {
            await place.fetchFields({ fields: [...FETCH_FIELDS] });
          } catch {
            return;
          }

          const loc = place.location;
          if (!loc) return;

          const { lat, lng } = latLngToCoords(loc);
          onSelectRef.current({
            name: place.displayName ?? '',
            address: place.formattedAddress ?? '',
            lat,
            lng,
          });
        };

        pac.addEventListener('gmp-select', onSelectPlace);

        if (cancelled) return;
        root.appendChild(pac);
      } catch (e) {
        if (!cancelled) setWidgetError((e as Error).message);
      }
    })();

    return () => {
      cancelled = true;
      if (pac?.parentNode) pac.remove();
      root.replaceChildren();
    };
  }, [isLoaded, apiKeyMissing]);

  if (apiKeyMissing || loadError) {
    return (
      <div className="px-4 py-3 text-xs font-mono" style={{ color: '#e8a849' }}>
        Maps key missing
      </div>
    );
  }

  if (!isLoaded) {
    return <div className="px-4 py-3 text-xs font-mono text-white/30">Loading…</div>;
  }

  if (widgetError) {
    return <div className="px-4 py-3 text-xs font-mono" style={{ color: '#e8a849' }}>{widgetError}</div>;
  }

  return <div ref={containerRef} className="search-bar-container" />;
}

function TripMapView({ location, destination, travelMode }: { location: { lat: number; lng: number }; destination: { lat: number; lng: number }; travelMode: TravelMode }) {
  const { isLoaded, loadError, apiKeyMissing } = useGoogleMaps();
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    const directionsService = new google.maps.DirectionsService();
    const gTravelMode = travelMode === 'walking'
      ? google.maps.TravelMode.WALKING
      : travelMode === 'driving'
        ? google.maps.TravelMode.DRIVING
        : google.maps.TravelMode.TRANSIT;

    directionsService.route(
      {
        origin: { lat: location.lat, lng: location.lng },
        destination: { lat: destination.lat, lng: destination.lng },
        travelMode: gTravelMode,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
        }
      }
    );
  }, [isLoaded, location.lat, location.lng, destination.lat, destination.lng, travelMode]);

  if (apiKeyMissing || loadError) {
    return <div className="h-full flex items-center justify-center" style={{ background: 'var(--bg-card)' }}><p className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>Map unavailable</p></div>;
  }
  if (!isLoaded) {
    return <div className="h-full flex items-center justify-center" style={{ background: 'var(--bg-card)' }}><p className="text-sm font-mono text-white/30">Loading map…</p></div>;
  }

  const center = {
    lat: (location.lat + destination.lat) / 2,
    lng: (location.lng + destination.lng) / 2,
  };

  return (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height: '100%' }}
      center={center}
      zoom={12}
      options={{ disableDefaultUI: true, zoomControl: false, styles: DARK_MAP_STYLES, backgroundColor: '#0a0a0a' }}
    >
      {directions && (
        <DirectionsRenderer
          directions={directions}
          options={{ suppressMarkers: false, polylineOptions: { strokeColor: '#e8a849', strokeWeight: 3 } }}
        />
      )}
    </GoogleMap>
  );
}

function TripPipeline({ steps }: { steps: TripStep[] }) {
  return (
    <div className="space-y-0">
      {steps.map((step, i) => {
        const color = step.status === 'done' ? '#4ade80' : step.status === 'running' ? '#e8a849' : step.status === 'error' ? '#f87171' : 'rgba(255,255,255,0.12)';
        const bg = step.status === 'done' ? 'rgba(74,222,128,0.06)' : step.status === 'running' ? 'rgba(232,168,73,0.06)' : step.status === 'error' ? 'rgba(248,113,113,0.06)' : 'rgba(255,255,255,0.02)';
        return (
          <div key={step.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs" style={{ background: bg, border: `1px solid ${color}30` }}>
                {step.status === 'done' ? '✓' : step.status === 'running' ? '⟳' : step.status === 'error' ? '✕' : '○'}
              </div>
              {i < steps.length - 1 && <div className="w-px flex-1 my-1" style={{ background: step.status === 'done' ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.05)' }} />}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: step.status === 'idle' ? 'rgba(255,255,255,0.25)' : 'rgba(240,240,240,0.85)' }}>{step.label}</span>
                {step.status === 'running' && <span className="text-[10px] font-mono" style={{ color: '#e8a849' }}>running</span>}
                {step.status === 'done' && <span className="text-[10px] font-mono text-green-400">done</span>}
              </div>
              {step.detail && <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-secondary)' }}>{step.detail}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TripPlanView({ plan, location, destination, travelMode }: { plan: TripPlan; location: { lat: number; lng: number }; destination: TripDestination; travelMode: TravelMode }) {
  const { setTripPlan } = useTourStore();

  const totalHours = Math.floor(plan.totalDurationMin / 60);
  const totalMins = plan.totalDurationMin % 60;
  const durationStr = totalHours > 0 ? `${totalHours}h ${totalMins}m` : `${totalMins}m`;
  const totalDist = plan.legs.reduce((sum, l) => sum + l.distanceKm, 0);
  const distStr = totalDist >= 1 ? `${totalDist.toFixed(1)} km` : `${Math.round(totalDist * 1000)} m`;

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto panel-scroll px-5 py-4">
        <button onClick={() => setTripPlan(null)} className="text-xs font-mono text-white/30 hover:text-white/60 transition-colors mb-4">
          ← Change destination
        </button>

        <div className="rounded-xl overflow-hidden mb-5" style={{ height: '180px', border: '1px solid var(--border)' }}>
          <TripMapView location={location} destination={destination} travelMode={travelMode} />
        </div>

        <div className="flex items-start gap-3 mb-5 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/30 font-mono mb-0.5">From</p>
            <p className="text-sm text-white/80 truncate">{destination.name}</p>
          </div>
          <div className="text-white/30 flex items-center pt-2">→</div>
          <div className="flex-1 min-w-0 text-right">
            <p className="text-xs text-white/30 font-mono mb-0.5">To</p>
            <p className="text-sm text-white/80 truncate">{plan.legs.length > 0 ? plan.legs[plan.legs.length - 1].to : destination.name}</p>
          </div>
        </div>

        {plan.legs.length > 0 && (
          <div className="flex gap-4 mb-5">
            <div className="flex-1 text-center p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
              <p className="text-lg font-mono" style={{ color: '#e8a849' }}>{durationStr}</p>
              <p className="text-[10px] text-white/30 font-mono">Duration</p>
            </div>
            <div className="flex-1 text-center p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
              <p className="text-lg font-mono" style={{ color: '#e8a849' }}>{distStr}</p>
              <p className="text-[10px] text-white/30 font-mono">Distance</p>
            </div>
          </div>
        )}

        <p className="text-xs uppercase tracking-widest text-white/30 font-mono mb-3">Cost Breakdown</p>
        <div className="space-y-2">
          {plan.costs.map((cost, i) => (
            <div key={i} className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-mono" style={{ background: 'rgba(232,168,73,0.15)', color: '#e8a849' }}>{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80 font-medium">{cost.stopName}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                    <span className="text-xs font-mono text-white/50">Entry: {cost.entryCost}</span>
                    <span className="text-xs font-mono text-white/50">Meal: {cost.mealBudget}</span>
                  </div>
                  {cost.notes && <p className="text-xs text-white/30 mt-1">{cost.notes}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 p-4 rounded-lg" style={{ background: 'rgba(232,168,73,0.04)', border: '1px solid rgba(232,168,73,0.15)' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono text-white/30">Powered by</span>
            <span className="text-xs font-mono font-medium" style={{ color: '#e8a849' }}>Gemini 2.5 Flash</span>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-white/30 font-mono mb-2">Estimated budget</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono" style={{ color: '#e8a849' }}>{plan.totalBudgetMin}</span>
            <span className="text-white/30">–</span>
            <span className="text-2xl font-mono" style={{ color: '#e8a849' }}>{plan.totalBudgetMax}</span>
          </div>
          {plan.tips && <p className="text-xs text-white/40 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>{plan.tips}</p>}
        </div>
      </div>
    </div>
  );
}

export default function TripPanel() {
  const { location, tourContent, tripPlan, tripLoading, tripDestination, setTripPlan, setTripLoading, setTripDestination } = useTourStore();
  const [travelMode, setTravelMode] = useState<TravelMode>('walking');
  const [error, setError] = useState<string | null>(null);
  const [tripSteps, setTripSteps] = useState<TripStep[]>([]);

  if (!location || !tourContent) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-white/20 text-sm font-mono">Load a tour first</p>
      </div>
    );
  }

  const handleGenerate = async (dest: TripDestination) => {
    setError(null);
    setTripDestination(dest);
    setTripLoading(true);
    setTripSteps([
      { id: 'directions', label: 'Calculating route with Google Maps', status: 'running' },
      { id: 'gemini', label: 'Estimating costs with Gemini 2.5 Flash', status: 'idle' },
    ]);

    let legs: TripLeg[] = [];
    try {
      setTripSteps(prev => prev.map((s, i) => i === 0 ? { ...s, status: 'running' as const } : s));
      legs = await getDirectionsLegs(
        { lat: location.lat, lng: location.lng },
        { lat: dest.lat, lng: dest.lng },
        travelMode
      );
      setTripSteps(prev => prev.map((s, i) => i === 0 ? { ...s, status: 'done' as const, detail: `${legs.reduce((sum, l) => sum + l.distanceKm, 0).toFixed(1)} km route found` } : s));
    } catch {
      legs = [{ from: location.name, to: dest.name, distanceKm: 0, durationMin: 0, mode: travelMode }];
      setTripSteps(prev => prev.map((s, i) => i === 0 ? { ...s, status: 'done' as const, detail: 'Route estimated' } : s));
    }

    try {
      setTripSteps(prev => prev.map((s, i) => i === 1 ? { ...s, status: 'running' as const } : s));
      const plan = await generateTrip({
        location: { name: location.name, address: location.address, lat: location.lat, lng: location.lng },
        destination: { name: dest.name, address: dest.address, lat: dest.lat, lng: dest.lng },
        mustSee: tourContent.mustSee,
        travelMode,
        legs,
      });
      setTripSteps(prev => prev.map((s, i) => i === 1 ? { ...s, status: 'done' as const, detail: `${plan.costs.length} stops planned` } : s));
      setTripPlan(plan);
    } catch (err) {
      setError((err as Error).message);
      setTripSteps(prev => prev.map((s, i) => i === 1 ? { ...s, status: 'error' as const, detail: (err as Error).message } : s));
    } finally {
      setTripLoading(false);
    }
  };

  if (tripLoading) {
    return (
      <div className="h-full overflow-y-auto panel-scroll px-5 py-4">
        <p className="text-xs uppercase tracking-widest text-white/30 font-mono mb-4">Planning your trip</p>
        <TripPipeline steps={tripSteps} />
        <div className="mt-6 flex justify-center">
          <div className="w-5 h-5 border-2 border-white/20 border-t-amber-400 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-sm font-mono text-center" style={{ color: '#e8a849' }}>{error}</p>
        <button
          onClick={() => { setError(null); setTripPlan(null); setTripDestination(null); setTripSteps([]); }}
          className="px-4 py-2 rounded-lg text-xs font-mono text-white/60 hover:text-white/80 transition-colors"
          style={{ border: '1px solid var(--border)' }}
        >
          Try again
        </button>
      </div>
    );
  }

  if (tripPlan && tripDestination) {
    return <TripPlanView plan={tripPlan} location={location} destination={tripDestination} travelMode={travelMode} />;
  }

  return (
    <div className="h-full overflow-y-auto panel-scroll px-5 py-4">
      <p className="text-xs uppercase tracking-widest text-white/30 font-mono mb-4">Plan your visit</p>

      <div className="mb-4">
        <label className="text-[10px] uppercase tracking-widest text-white/20 font-mono block mb-2">Destination</label>
        <div className="glass rounded-xl overflow-visible" style={{ borderColor: 'var(--border)' }}>
          <DestinationSearch onSelect={handleGenerate} />
        </div>
      </div>

      <div className="mb-5">
        <label className="text-[10px] uppercase tracking-widest text-white/20 font-mono block mb-2">Travel mode</label>
        <div className="flex gap-2">
          {TRAVEL_MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setTravelMode(m.id)}
              className={`
                flex-1 px-3 py-2 rounded-lg text-xs font-mono transition-all text-center
                ${travelMode === m.id
                  ? 'bg-amber-400/10 border border-amber-400/30 text-amber-400'
                  : 'text-white/30 hover:text-white/60 border border-transparent hover:border-white/10'
                }
              `}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-white/25">Powered by</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs">🗺️</span>
            <span className="text-xs font-mono text-white/40">Google Maps Directions API</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs">✨</span>
            <span className="text-xs font-mono text-white/40">Gemini 2.5 Flash — cost estimation</span>
          </div>
        </div>
        <p className="text-xs text-white/20 mt-3 leading-relaxed">
          Search a destination and select your travel mode. We'll calculate the route and estimate costs for activities, meals, and transport.
        </p>
      </div>
    </div>
  );
}