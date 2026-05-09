import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleMap, DirectionsRenderer } from '@react-google-maps/api';
import { useTourStore } from '../store/useTourStore';
import { useGoogleMaps } from '../context/GoogleMapsProvider';
import { generateTrip } from '../services/tripApi';
import { getDirectionsLegs } from '../services/directions';
import type { TripPlan, TripLeg } from '../types';

type TravelMode = 'walking' | 'driving' | 'transit';

const TRAVEL_MODES: { id: TravelMode; label: string; icon: string }[] = [
  { id: 'walking', label: 'Walking', icon: '🚶' },
  { id: 'driving', label: 'Driving', icon: '🚗' },
  { id: 'transit', label: 'Transit', icon: '🚇' },
];

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

function PoiSelector({ onGenerate }: { onGenerate: (mode: TravelMode) => void }) {
  const { tourContent, selectedPois, togglePoiSelection } = useTourStore();
  const [travelMode, setTravelMode] = useState<TravelMode>('walking');

  if (!tourContent) return null;

  const pois = tourContent.mustSee;
  const canGenerate = selectedPois.length >= 2;

  return (
    <div className="h-full overflow-y-auto panel-scroll px-5 py-4">
      <p className="text-xs uppercase tracking-widest text-white/30 font-mono mb-4">Plan your visit</p>

      <div className="flex gap-2 mb-5">
        {TRAVEL_MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setTravelMode(m.id)}
            className={`
              px-3 py-1.5 rounded-lg text-xs font-mono transition-all
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

      <div className="space-y-2 mb-5">
        {pois.map((poi) => {
          const isSelected = selectedPois.includes(poi.name);
          return (
            <button
              key={poi.name}
              onClick={() => togglePoiSelection(poi.name)}
              className={`
                w-full text-left p-3 rounded-lg transition-all
                ${isSelected
                  ? 'border-l-2 border-amber-400/60'
                  : ''
                }
              `}
              style={{
                background: isSelected ? 'rgba(232,168,73,0.06)' : 'rgba(255,255,255,0.03)',
                border: isSelected ? undefined : '1px solid var(--border)',
                borderLeft: isSelected ? '2px solid rgba(232,168,73,0.6)' : undefined,
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/80">{poi.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded text-white/25" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    {poi.type}
                  </span>
                  {isSelected && (
                    <span className="text-amber-400 text-xs">&#10003;</span>
                  )}
                </div>
              </div>
              <p className="text-xs text-white/40 mt-1 line-clamp-1">{poi.description}</p>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onGenerate(travelMode)}
        disabled={!canGenerate}
        className={`
          w-full py-3 rounded-xl font-mono text-sm transition-all
          ${canGenerate
            ? 'bg-amber-400/10 border border-amber-400/20 text-amber-400 hover:bg-amber-400/20'
            : 'bg-white/5 border border-white/10 text-white/20 cursor-not-allowed'
          }
        `}
      >
        {canGenerate ? 'Generate Trip Plan →' : `Select at least 2 stops (${selectedPois.length}/2)`}
      </button>
    </div>
  );
}

function TripMapView({ legs, location }: { legs: TripLeg[]; location: { lat: number; lng: number } }) {
  const { isLoaded, loadError, apiKeyMissing } = useGoogleMaps();
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);

  useEffect(() => {
    if (!isLoaded || legs.length === 0) return;

    const directionsService = new google.maps.DirectionsService();
    const lastLeg = legs[legs.length - 1];
    const middleWaypoints = legs.slice(1, -1).map((l) => ({
      location: l.from,
      stopover: true,
    }));

    directionsService.route(
      {
        origin: `${location.lat},${location.lng}`,
        destination: lastLeg.to,
        waypoints: middleWaypoints.length > 0 ? middleWaypoints : undefined,
        travelMode: google.maps.TravelMode.WALKING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
        }
      }
    );
  }, [isLoaded, legs, location.lat, location.lng]);

  if (apiKeyMissing || loadError) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>Map unavailable</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm font-mono text-white/30">Loading map…</p>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height: '100%' }}
      center={{ lat: location.lat, lng: location.lng }}
      zoom={13}
      options={{
        disableDefaultUI: true,
        zoomControl: false,
        styles: DARK_MAP_STYLES,
        backgroundColor: '#0a0a0a',
      }}
    >
      {directions && (
        <DirectionsRenderer
          directions={directions}
          options={{
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: '#e8a849',
              strokeWeight: 3,
            },
          }}
        />
      )}
    </GoogleMap>
  );
}

function TripPlanView({ plan, location }: { plan: TripPlan; location: { lat: number; lng: number } }) {
  const { setTripPlan } = useTourStore();

  const totalHours = Math.floor(plan.totalDurationMin / 60);
  const totalMins = plan.totalDurationMin % 60;
  const durationStr = totalHours > 0 ? `${totalHours}h ${totalMins}m` : `${totalMins}m`;

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto panel-scroll px-5 py-4">
        <button
          onClick={() => setTripPlan(null)}
          className="text-xs font-mono text-white/30 hover:text-white/60 transition-colors mb-4"
        >
          ← Change selection
        </button>

        <div className="rounded-xl overflow-hidden mb-5" style={{ height: '200px', border: '1px solid var(--border)' }}>
          <TripMapView legs={plan.legs} location={location} />
        </div>

        <p className="text-xs uppercase tracking-widest text-white/30 font-mono mb-3">Itinerary</p>

        <div className="space-y-0">
          {plan.costs.map((cost, i) => {
            const legToHere = i < plan.legs.length ? plan.legs[i] : null;
            return (
              <div key={cost.stopName}>
                {legToHere && (
                  <div className="flex items-center gap-2 py-2 pl-4">
                    <div className="w-px h-4 bg-white/10" />
                    <span className="text-[10px] font-mono text-white/25">
                      {legToHere.distanceKm} km · {legToHere.durationMin} min · {legToHere.mode === 'walking' ? '🚶' : legToHere.mode === 'driving' ? '🚗' : '🚇'}
                    </span>
                  </div>
                )}
                <div className="glass rounded-xl p-3" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-mono" style={{ background: 'rgba(232,168,73,0.15)', color: '#e8a849' }}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/80 font-medium">{cost.stopName}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                        <span className="text-xs font-mono text-white/50">Entry: {cost.entryCost}</span>
                        <span className="text-xs font-mono text-white/50">Meal: {cost.mealBudget}</span>
                      </div>
                      {cost.notes && (
                        <p className="text-xs text-white/30 mt-1">{cost.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 glass rounded-xl p-4" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-[10px] uppercase tracking-widest text-white/30 font-mono mb-2">Estimated budget</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono" style={{ color: '#e8a849' }}>{plan.totalBudgetMin}</span>
            <span className="text-white/30 text-sm">–</span>
            <span className="text-2xl font-mono" style={{ color: '#e8a849' }}>{plan.totalBudgetMax}</span>
          </div>
          <p className="text-xs font-mono text-white/30 mt-1">{durationStr} total trip time</p>
          {plan.tips && (
            <p className="text-xs text-white/40 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>{plan.tips}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TripPanel() {
  const { location, tourContent, tripPlan, tripLoading, selectedPois, setTripPlan, setTripLoading } = useTourStore();
  const [error, setError] = useState<string | null>(null);

  if (!location || !tourContent) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-white/20 text-sm font-mono">Load a tour first</p>
      </div>
    );
  }

  const handleGenerate = async (travelMode: TravelMode) => {
    setError(null);
    setTripLoading(true);

    try {
      const pois = tourContent.mustSee.filter((p) => selectedPois.includes(p.name));
      const waypointNames = pois.map((p) => p.name);

      let legs: TripLeg[] = [];
      try {
        legs = await getDirectionsLegs(
          { lat: location.lat, lng: location.lng },
          waypointNames,
          travelMode
        );
      } catch {
        legs = waypointNames.slice(0, -1).map((name, i) => ({
          from: name,
          to: waypointNames[i + 1],
          distanceKm: 0,
          durationMin: 0,
          mode: travelMode,
        }));
      }

      const plan = await generateTrip({
        location: { name: location.name, address: location.address, lat: location.lat, lng: location.lng },
        selectedPois,
        mustSee: tourContent.mustSee,
        travelMode,
        legs,
      });

      setTripPlan(plan);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setTripLoading(false);
    }
  };

  if (tripLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3">
        <div className="w-5 h-5 border-2 border-white/20 border-t-amber-400 rounded-full animate-spin" />
        <p className="text-white/40 font-mono text-sm">Planning your route…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-sm font-mono text-center" style={{ color: '#e8a849' }}>
          {error}
        </p>
        <button
          onClick={() => { setError(null); setTripPlan(null); }}
          className="px-4 py-2 rounded-lg text-xs font-mono text-white/60 hover:text-white/80 transition-colors"
          style={{ border: '1px solid var(--border)' }}
        >
          Try again
        </button>
      </div>
    );
  }

  if (tripPlan) {
    return <TripPlanView plan={tripPlan} location={location} />;
  }

  return <PoiSelector onGenerate={handleGenerate} />;
}