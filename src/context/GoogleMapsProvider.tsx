import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { normalizeGoogleMapsApiKey } from '../utils/googleMapsEnv';

export type GoogleMapsContextValue = {
  isLoaded: boolean;
  loadError: Error | undefined;
  apiKeyMissing: boolean;
};

const GoogleMapsContext = createContext<GoogleMapsContextValue | null>(null);

export function GoogleMapsProvider({ children }: { children: ReactNode }) {
  const apiKey = normalizeGoogleMapsApiKey(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
  const apiKeyMissing = !apiKey;

  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<Error | undefined>();

  useEffect(() => {
    if (import.meta.env.DEV && apiKeyMissing) {
      console.warn(
        '[Scout Maps] No browser key - add VITE_GOOGLE_MAPS_API_KEY or GOOGLE_MAPS_API_KEY to repo-root .env and restart Vite (not backend/.env).'
      );
    }
  }, [apiKeyMissing]);

  useEffect(() => {
    if (apiKeyMissing) {
      setIsLoaded(false);
      setLoadError(undefined);
      return;
    }

    if (typeof window !== 'undefined' && window.google?.maps) {
      setIsLoaded(true);
      setLoadError(undefined);
      return;
    }

    let cancelled = false;
    setIsLoaded(false);
    setLoadError(undefined);

    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places', 'geometry'],
    });

    loader
      .load()
      .then(() => {
        if (!cancelled) {
          setIsLoaded(true);
          setLoadError(undefined);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setLoadError(err);
          setIsLoaded(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey, apiKeyMissing]);

  const value: GoogleMapsContextValue = {
    isLoaded: apiKeyMissing ? false : isLoaded,
    loadError: apiKeyMissing ? undefined : loadError,
    apiKeyMissing,
  };

  return (
    <GoogleMapsContext.Provider value={value}>
      {children}
    </GoogleMapsContext.Provider>
  );
}

export function useGoogleMaps(): GoogleMapsContextValue {
  const ctx = useContext(GoogleMapsContext);
  if (!ctx) {
    throw new Error('useGoogleMaps must be used within GoogleMapsProvider');
  }
  return ctx;
}
