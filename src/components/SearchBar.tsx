import { useRef, useState } from 'react';
import { StandaloneSearchBox, useLoadScript } from '@react-google-maps/api';
import type { LocationData } from '../types';

const LIBRARIES: ('places')[] = ['places'];

interface Props {
  onSelect: (loc: LocationData) => void;
  compact?: boolean;
}

export default function SearchBar({ onSelect, compact = false }: Props) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  });

  const searchBoxRef = useRef<google.maps.places.SearchBox | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  const handlePlacesChanged = () => {
    const places = searchBoxRef.current?.getPlaces();
    if (!places || places.length === 0) return;
    const place = places[0];
    if (!place.geometry?.location) return;

    onSelect({
      name: place.name || '',
      address: place.formatted_address || '',
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
      placeId: place.place_id,
      types: place.types,
    });

    if (inputRef.current) inputRef.current.blur();
  };

  if (!isLoaded) {
    return (
      <div className={compact ? 'h-10' : 'h-14'}>
        <div
          className="w-full h-full glass rounded-xl animate-pulse"
          style={{ borderColor: 'var(--border)' }}
        />
      </div>
    );
  }

  return (
    <StandaloneSearchBox
      onLoad={(ref) => (searchBoxRef.current = ref)}
      onPlacesChanged={handlePlacesChanged}
    >
      <div className={`relative transition-all duration-300 ${focused ? 'scale-[1.01]' : ''}`}>
        {/* Search icon */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke={focused ? 'var(--amber)' : 'rgba(107,143,168,0.7)'}
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </div>

        <input
          ref={inputRef}
          type="text"
          placeholder={compact ? 'Search places…' : 'Search any city, landmark, or neighborhood…'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`
            w-full glass rounded-xl outline-none transition-all duration-300
            font-body text-white placeholder-white/25
            ${compact
              ? 'pl-10 pr-4 py-2.5 text-sm'
              : 'pl-12 pr-6 py-4 text-base'
            }
          `}
          style={{
            borderColor: focused ? 'var(--amber)' : 'var(--border)',
            boxShadow: focused ? 'var(--glow-amber)' : 'none',
          }}
        />

        {!compact && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <kbd className="text-[10px] text-white/20 font-mono border border-white/10 rounded px-1.5 py-0.5">
              Enter
            </kbd>
          </div>
        )}
      </div>
    </StandaloneSearchBox>
  );
}
