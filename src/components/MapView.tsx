import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTourStore } from '../store/useTourStore';

// Fix Leaflet's broken default icon paths under Vite
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 15);
  }, [lat, lng, map]);
  return null;
}

export default function MapView() {
  const { location } = useTourStore();
  const [mode, setMode] = useState<'street' | 'satellite'>('street');

  if (!location) return null;

  const center: [number, number] = [location.lat, location.lng];

  return (
    <div className="h-full flex flex-col">
      {/* Mode toggle */}
      <div className="flex-shrink-0 px-5 py-3 flex gap-2">
        {(['street', 'satellite'] as const).map((m) => (
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
            {m === 'street' ? '🗺️ Map' : '🛰️ Satellite'}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-white/20 font-mono self-center">
          {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
        </span>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={center}
          zoom={15}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
        >
          <RecenterMap lat={location.lat} lng={location.lng} />

          {mode === 'street' ? (
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
          ) : (
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="&copy; Esri, Maxar, Earthstar Geographics"
            />
          )}

          <Marker position={center} />
        </MapContainer>
      </div>
    </div>
  );
}
