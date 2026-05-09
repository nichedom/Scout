import { useEffect, useRef } from 'react';
import { useGoogleMaps } from '../context/GoogleMapsProvider';
import type { LocationData } from '../types';

interface Props {
  location: LocationData;
  /** True once the 3D globe is removed — panorama must resize or tiles often stay black. */
  globeHidden: boolean;
  onPanoramaOk: () => void;
  onPanoramaUnavailable: () => void;
  onMapsInitError?: () => void;
}

function triggerResize(pano: google.maps.StreetViewPanorama) {
  google.maps.event.trigger(pano, 'resize');
}

export default function FullscreenStreetView({
  location,
  globeHidden,
  onPanoramaOk,
  onPanoramaUnavailable,
  onMapsInitError,
}: Props) {
  const { isLoaded, loadError, apiKeyMissing } = useGoogleMaps();
  const settledRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panoRef = useRef<google.maps.StreetViewPanorama | null>(null);

  useEffect(() => {
    if (apiKeyMissing || loadError) {
      onMapsInitError?.();
    }
  }, [apiKeyMissing, loadError, onMapsInitError]);

  useEffect(() => {
    settledRef.current = false;
    const t = window.setTimeout(() => {
      if (!settledRef.current) {
        settledRef.current = true;
        onPanoramaUnavailable();
      }
    }, 14_000);
    return () => window.clearTimeout(t);
  }, [location.lat, location.lng, onPanoramaUnavailable]);

  useEffect(() => {
    if (!globeHidden) return;
    const burstResize = () => {
      const p = panoRef.current;
      if (p) triggerResize(p);
    };
    burstResize();
    const ids = [16, 80, 200, 450].map((ms) => window.setTimeout(burstResize, ms));
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [globeHidden]);

  useEffect(() => {
    if (!isLoaded || apiKeyMissing || loadError || !containerRef.current) {
      return;
    }

    const el = containerRef.current;
    let cancelled = false;

    const clearPano = () => {
      const p = panoRef.current;
      panoRef.current = null;
      if (p) {
        google.maps.event.clearInstanceListeners(p);
      }
      while (el.firstChild) {
        el.removeChild(el.firstChild);
      }
    };

    settledRef.current = false;
    const center = { lat: location.lat, lng: location.lng };

    const svc = new google.maps.StreetViewService();
    svc.getPanorama(
      {
        location: center,
        radius: 150,
        source: google.maps.StreetViewSource.DEFAULT,
        preference: google.maps.StreetViewPreference.NEAREST,
      },
      (data, status) => {
        if (cancelled) return;

        if (status !== google.maps.StreetViewStatus.OK || !data?.location?.pano) {
          if (!settledRef.current) {
            settledRef.current = true;
            onPanoramaUnavailable();
          }
          return;
        }

        clearPano();

        const loc = data.location;
        const latLng = loc.latLng ?? center;

        const pano = new google.maps.StreetViewPanorama(el, {
          pano: loc.pano,
          position: latLng,
          visible: true,
          clickToGo: true,
          addressControl: false,
          fullscreenControl: false,
          motionTracking: false,
          motionTrackingControl: false,
          panControl: true,
          zoomControl: true,
          linksControl: true,
        });
        panoRef.current = pano;

        const onStatus = () => {
          if (cancelled || settledRef.current) return;
          const st = pano.getStatus();
          if (st === google.maps.StreetViewStatus.OK) {
            settledRef.current = true;
            requestAnimationFrame(() => {
              triggerResize(pano);
              requestAnimationFrame(() => triggerResize(pano));
            });
            onPanoramaOk();
          } else if (st === google.maps.StreetViewStatus.ZERO_RESULTS) {
            settledRef.current = true;
            onPanoramaUnavailable();
          }
        };

        pano.addListener('status_changed', onStatus);
        onStatus();
      }
    );

    return () => {
      cancelled = true;
      clearPano();
    };
  }, [
    isLoaded,
    apiKeyMissing,
    loadError,
    location.lat,
    location.lng,
    onPanoramaOk,
    onPanoramaUnavailable,
  ]);

  if (apiKeyMissing || loadError) {
    const msg = apiKeyMissing
      ? 'Missing Maps browser key in repo-root .env — see /maps-demo.html.'
      : (loadError?.message ?? 'Could not load Google Maps.');
    return (
      <div className="absolute inset-0 flex items-center justify-center px-6 bg-[#0a0a0a]">
        <p className="text-sm font-mono text-amber-400/90 text-center" role="alert">
          {msg}
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-white/30 text-sm font-mono">Loading Street View…</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full min-h-0"
      style={{
        isolation: 'isolate',
        background: '#000',
        transform: 'translateZ(0)',
      }}
    />
  );
}
