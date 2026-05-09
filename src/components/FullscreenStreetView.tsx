import { useEffect, useRef, useState } from 'react';
import { useGoogleMaps } from '../context/GoogleMapsProvider';
import { useTourStore } from '../store/useTourStore';
import type { LocationData } from '../types';

interface Props {
  location: LocationData;
  /** True once the 3D globe is removed - panorama must resize or tiles often stay black. */
  globeHidden: boolean;
  onPanoramaOk: () => void;
  onPanoramaUnavailable: () => void;
  onMapsInitError?: () => void;
}

function triggerResize(pano: google.maps.StreetViewPanorama) {
  google.maps.event.trigger(pano, 'resize');
  pano.setVisible(true);
}

function burstResize(pano: google.maps.StreetViewPanorama) {
  [0, 50, 150, 300, 650, 1100, 1800, 2800].forEach((ms) => {
    window.setTimeout(() => triggerResize(pano), ms);
  });
}

function computeHeading(from: google.maps.LatLngLiteral, to: google.maps.LatLngLiteral) {
  const fromLat = from.lat * Math.PI / 180;
  const toLat = to.lat * Math.PI / 180;
  const deltaLng = (to.lng - from.lng) * Math.PI / 180;
  const y = Math.sin(deltaLng) * Math.cos(toLat);
  const x =
    Math.cos(fromLat) * Math.sin(toLat) -
    Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLng);

  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function latLngLiteral(value: google.maps.LatLng | google.maps.LatLngLiteral): google.maps.LatLngLiteral {
  const maybeLat = value.lat as number | (() => number);
  if (typeof maybeLat === 'function') {
    const latLng = value as google.maps.LatLng;
    return { lat: latLng.lat(), lng: latLng.lng() };
  }

  const literal = value as google.maps.LatLngLiteral;
  return { lat: literal.lat, lng: literal.lng };
}

function requestPanorama(
  svc: google.maps.StreetViewService,
  center: google.maps.LatLngLiteral,
  radius: number,
  source: google.maps.StreetViewSource,
) {
  return new Promise<google.maps.StreetViewPanoramaData | null>((resolve) => {
    svc.getPanorama(
      {
        location: center,
        radius,
        source,
        preference: google.maps.StreetViewPreference.NEAREST,
      },
      (data, status) => {
        resolve(status === google.maps.StreetViewStatus.OK && data?.location?.pano ? data : null);
      },
    );
  });
}

async function getNearestPanorama(
  svc: google.maps.StreetViewService,
  center: google.maps.LatLngLiteral,
) {
  return (
    (await requestPanorama(svc, center, 700, google.maps.StreetViewSource.OUTDOOR)) ??
    (await requestPanorama(svc, center, 1000, google.maps.StreetViewSource.DEFAULT))
  );
}

export default function FullscreenStreetView({
  location,
  globeHidden,
  onPanoramaOk,
  onPanoramaUnavailable,
  onMapsInitError,
}: Props) {
  const { isLoaded, loadError, apiKeyMissing } = useGoogleMaps();
  const streetViewFocus = useTourStore((s) => s.streetViewFocus);
  const centerLat = streetViewFocus?.lat ?? location.lat;
  const centerLng = streetViewFocus?.lng ?? location.lng;
  const lookAtLat = streetViewFocus?.lookAt?.lat ?? centerLat;
  const lookAtLng = streetViewFocus?.lookAt?.lng ?? centerLng;
  const lookAt = { lat: lookAtLat, lng: lookAtLng };
  const settledRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panoRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const [isFindingPanorama, setIsFindingPanorama] = useState(false);

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
        setIsFindingPanorama(false);
        onPanoramaUnavailable();
      }
    }, 14_000);
    return () => window.clearTimeout(t);
  }, [centerLat, centerLng, onPanoramaUnavailable]);

  useEffect(() => {
    if (!globeHidden) return;

    const resizeCurrent = () => {
      const p = panoRef.current;
      if (p) triggerResize(p);
    };

    resizeCurrent();
    const ids = [16, 80, 200, 450, 900, 1600, 2600].map((ms) => window.setTimeout(resizeCurrent, ms));
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
    setIsFindingPanorama(true);
    clearPano();

    const center = { lat: centerLat, lng: centerLng };
    const svc = new google.maps.StreetViewService();

    getNearestPanorama(svc, center)
      .then((data) => {
        if (cancelled) return;

        if (!data?.location?.pano) {
          setIsFindingPanorama(false);
          if (!settledRef.current) {
            settledRef.current = true;
            onPanoramaUnavailable();
          }
          return;
        }

        const loc = data.location;
        const latLng = loc.latLng ?? center;
        const panoPosition = latLngLiteral(latLng);
        const heading = computeHeading(panoPosition, lookAt);
        const pano = new google.maps.StreetViewPanorama(el, {
          pano: loc.pano,
          position: latLng,
          pov: {
            heading,
            pitch: 0,
          },
          zoom: 1,
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
            setIsFindingPanorama(false);
            pano.setPov({ heading: computeHeading(latLngLiteral(pano.getPosition() ?? latLng), lookAt), pitch: 0 });
            requestAnimationFrame(() => {
              triggerResize(pano);
              requestAnimationFrame(() => triggerResize(pano));
            });
            burstResize(pano);
            onPanoramaOk();
          } else if (st === google.maps.StreetViewStatus.ZERO_RESULTS) {
            settledRef.current = true;
            setIsFindingPanorama(false);
            onPanoramaUnavailable();
          }
        };

        pano.addListener('status_changed', onStatus);
        pano.addListener('pano_changed', () => {
          pano.setPov({ heading: computeHeading(latLngLiteral(pano.getPosition() ?? latLng), lookAt), pitch: 0 });
          burstResize(pano);
        });
        pano.addListener('position_changed', () => {
          pano.setPov({ heading: computeHeading(latLngLiteral(pano.getPosition() ?? latLng), lookAt), pitch: 0 });
          burstResize(pano);
        });
        window.setTimeout(onStatus, 150);
        window.setTimeout(onStatus, 650);
        window.setTimeout(() => burstResize(pano), 1200);
        onStatus();
      })
      .catch(() => {
        if (!cancelled && !settledRef.current) {
          settledRef.current = true;
          setIsFindingPanorama(false);
          onPanoramaUnavailable();
        }
      });

    return () => {
      cancelled = true;
      setIsFindingPanorama(false);
      clearPano();
    };
  }, [
    isLoaded,
    apiKeyMissing,
    loadError,
    centerLat,
    centerLng,
    lookAtLat,
    lookAtLng,
    onPanoramaOk,
    onPanoramaUnavailable,
  ]);

  if (apiKeyMissing || loadError) {
    const msg = apiKeyMissing
      ? 'Missing Maps browser key in repo-root .env - see /maps-demo.html.'
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
        <div className="text-white/30 text-sm font-mono">Loading Street View...</div>
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full min-h-0"
        style={{
          isolation: 'isolate',
          background: '#000',
          transform: 'translateZ(0)',
        }}
      />
      {isFindingPanorama && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a] pointer-events-none">
          <div className="text-white/30 text-sm font-mono">Finding nearby Street View...</div>
        </div>
      )}
    </>
  );
}
