import { useState } from 'react';
import { GoogleMap, StreetViewPanorama, useLoadScript } from '@react-google-maps/api';
import { useTourStore } from '../store/useTourStore';

const LIBRARIES: ('places')[] = ['places'];

const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  mapTypeId: 'satellite',
  tilt: 45,
  styles: [
    { elementType: 'labels', stylers: [{ visibility: 'simplified' }] },
    { featureType: 'administrative', stylers: [{ visibility: 'off' }] },
  ],
};

export default function MapView() {
  const { location } = useTourStore();
  const [mode, setMode] = useState<'map' | 'street'>('street');

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  });

  if (!location) return null;

  if (!isLoaded) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-white/30 text-sm font-mono">Loading maps…</div>
      </div>
    );
  }

  const center = { lat: location.lat, lng: location.lng };

  return (
    <div className="h-full flex flex-col">
      {/* Mode toggle */}
      <div className="flex-shrink-0 px-5 py-3 flex gap-2">
        {(['street', 'map'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`
              px-3 py-1.5 rounded-lg text-xs font-mono transition-all
              ${mode === m
                ? 'bg-amber-400/10 border border-amber-400/30 text-amber-400'
                : 'text-white/30 hover:text-white/60 border border-transparent'
              }
            `}
          >
            {m === 'street' ? '🚶 Street View' : '🛰️ Satellite'}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-white/20 font-mono self-center">
          {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
        </span>
      </div>

      {/* Map area */}
      <div className="flex-1 relative">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={center}
          zoom={15}
          options={{
            ...MAP_OPTIONS,
            mapTypeId: mode === 'map' ? 'satellite' : 'roadmap',
          }}
        >
          {mode === 'street' && (
            <StreetViewPanorama
              options={{
                position: center,
                visible: true,
                addressControl: false,
                fullscreenControl: false,
                motionTracking: false,
                motionTrackingControl: false,
                panControl: true,
                zoomControl: true,
              }}
            />
          )}
        </GoogleMap>
      </div>
    </div>
  );
}
