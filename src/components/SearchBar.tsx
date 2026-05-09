import { useEffect, useRef, useState } from 'react';
import { useGoogleMaps } from '../context/GoogleMapsProvider';
import type { LocationData } from '../types';

const FETCH_PLACE_FIELDS = [
  'id',
  'location',
  'viewport',
  'displayName',
  'formattedAddress',
  'types',
] as const;

/** gmp-select often puts payloads on `event.detail`; older handlers used top-level props. */
function placeFromAutocompleteEvent(event: Event): google.maps.places.Place | null {
  const e = event as CustomEvent<{
    placePrediction?: google.maps.places.PlacePrediction;
    place?: google.maps.places.Place;
  }>;
  const d = e.detail && typeof e.detail === 'object' ? e.detail : undefined;
  const top = e as unknown as { place?: google.maps.places.Place; placePrediction?: google.maps.places.PlacePrediction };
  const place = top.place ?? d?.place;
  const pred = top.placePrediction ?? d?.placePrediction;
  if (place) return place;
  if (pred) return pred.toPlace();
  return null;
}

function extractCoords(
  loc: google.maps.LatLng | google.maps.LatLngLiteral | null | undefined
): { lat: number; lng: number } | null {
  if (loc == null) return null;
  if (typeof (loc as google.maps.LatLng).lat === 'function') {
    const ll = loc as google.maps.LatLng;
    return { lat: ll.lat(), lng: ll.lng() };
  }
  const lit = loc as google.maps.LatLngLiteral & { lat?: unknown; lng?: unknown };
  const lat = typeof lit.lat === 'number' ? lit.lat : Number(lit.lat);
  const lng = typeof lit.lng === 'number' ? lit.lng : Number(lit.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }
  return null;
}

function coordsFromPlace(place: google.maps.places.Place): { lat: number; lng: number } | null {
  const fromLoc = extractCoords(place.location ?? undefined);
  if (fromLoc && Math.abs(fromLoc.lat) <= 90 && Math.abs(fromLoc.lng) <= 180) {
    return fromLoc;
  }
  const vp = place.viewport;
  if (vp) {
    return extractCoords(vp.getCenter());
  }
  return null;
}

interface Props {
  onSelect: (loc: LocationData) => void;
  compact?: boolean;
}

export default function SearchBar({ onSelect, compact = false }: Props) {
  const { isLoaded, loadError, apiKeyMissing } = useGoogleMaps();
  const containerRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  const [focused, setFocused] = useState(false);
  const [widgetError, setWidgetError] = useState<string | null>(null);
  const [widgetReady, setWidgetReady] = useState(false);

  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!isLoaded || apiKeyMissing) return;

    const root = containerRef.current;
    if (!root) return;

    let cancelled = false;
    let pac: google.maps.places.PlaceAutocompleteElement | null = null;

    setWidgetReady(false);
    setWidgetError(null);
    root.replaceChildren();

    (async () => {
      try {
        const placesLib = (await google.maps.importLibrary('places')) as google.maps.PlacesLibrary & {
          PlaceAutocompleteElement?: typeof google.maps.places.PlaceAutocompleteElement;
        };

        const Ctor = placesLib.PlaceAutocompleteElement;
        if (!Ctor) {
          throw new Error(
            'PlaceAutocompleteElement missing from Maps loader — enable Places API (New) for your project.'
          );
        }

        pac = new Ctor({});
        pac.setAttribute(
          'placeholder',
          compact ? 'Search places…' : 'Search any city, landmark, or neighborhood…'
        );

        if (compact) {
          pac.classList.add('compact');
        }

        pac.style.width = '100%';
        pac.style.boxSizing = 'border-box';
        pac.style.borderRadius = '12px';
        pac.style.position = 'relative';
        pac.style.zIndex = '50';
        // Host is transparent so our outer `.glass` frame is the only chrome (avoids nested boxes + double icon with our SVG).
        pac.style.backgroundColor = 'transparent';
        pac.style.border = 'none';
        pac.style.boxShadow = 'none';

        const onSelectPlace = async (event: Event) => {
          const place = placeFromAutocompleteEvent(event);
          if (!place) {
            if (import.meta.env.DEV) {
              console.warn('[SearchBar] gmp-select: no place or placePrediction on event', event);
            }
            return;
          }

          try {
            await place.fetchFields({ fields: [...FETCH_PLACE_FIELDS] });
          } catch (e) {
            console.error('[SearchBar] fetchFields:', e);
            return;
          }

          const coords = coordsFromPlace(place);
          if (!coords) {
            if (import.meta.env.DEV) {
              console.warn('[SearchBar] No coordinates after fetchFields', {
                hasLocation: place.location != null,
                hasViewport: place.viewport != null,
              });
            }
            return;
          }

          onSelectRef.current({
            name: place.displayName ?? '',
            address: place.formattedAddress ?? '',
            lat: coords.lat,
            lng: coords.lng,
            placeId: place.id,
            types: place.types,
          });
        };

        pac.addEventListener('gmp-select', onSelectPlace);
        pac.addEventListener('focusin', () => setFocused(true));
        pac.addEventListener('focusout', () => setFocused(false));

        if (cancelled) return;

        root.appendChild(pac);
        setWidgetReady(true);
      } catch (e) {
        if (!cancelled) {
          setWidgetError((e as Error).message);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (pac?.parentNode) {
        pac.remove();
      }
      root.replaceChildren();
      setWidgetReady(false);
    };
  }, [isLoaded, apiKeyMissing, compact]);

  if (apiKeyMissing || loadError) {
    const msg = apiKeyMissing
      ? 'Missing Maps browser key in repo-root .env (VITE_GOOGLE_MAPS_API_KEY or GOOGLE_MAPS_API_KEY). See /maps-demo.html.'
      : (loadError?.message ?? 'Google Maps failed to load.');
    return (
      <div
        className={`w-full glass rounded-xl px-4 py-3 text-xs font-mono text-amber-400/90 ${compact ? '' : 'py-4'}`}
        style={{ borderColor: 'rgba(245,166,35,0.35)' }}
        role="alert"
      >
        {msg}
      </div>
    );
  }

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

  if (widgetError) {
    return (
      <div
        className="w-full glass rounded-xl px-4 py-3 text-xs font-mono text-amber-400/90"
        style={{ borderColor: 'rgba(245,166,35,0.35)' }}
        role="alert"
      >
        {widgetError}
      </div>
    );
  }

  return (
    <div className="relative transition-[border-color] duration-300" style={{ zIndex: 1 }}>
      <div className="relative w-full">
        <div
          ref={containerRef}
          className={`
            w-full glass rounded-xl overflow-visible
            ${compact ? 'min-h-[40px]' : 'min-h-[56px]'}
          `}
          style={{
            borderColor: focused ? 'var(--amber)' : 'var(--border)',
            boxShadow: 'none',
            outline: 'none',
          }}
        />
        {!widgetReady && (
          <div
            className="absolute inset-0 rounded-xl animate-pulse pointer-events-none bg-white/[0.03]"
            aria-hidden
          />
        )}
      </div>

      {!compact && widgetReady && (
        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center pr-px">
          <kbd className="inline-flex items-center rounded-md px-2.5 py-1 text-[10px] font-mono text-white/30 tabular-nums ring-1 ring-inset ring-white/12 bg-white/[0.04]">
            Enter
          </kbd>
        </div>
      )}
    </div>
  );
}
