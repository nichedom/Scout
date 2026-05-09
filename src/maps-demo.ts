import { Loader } from '@googlemaps/js-api-loader';
import { DEMO_LOCATION_TOKYO_SHIBUYA } from './constants/demoLocation';
import { normalizeGoogleMapsApiKey } from './utils/googleMapsEnv';

const key = normalizeGoogleMapsApiKey(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
const out = document.getElementById('out');
const mapWrap = document.getElementById('map-wrap');
const mapTitle = document.getElementById('map-title');
const mapEl = document.getElementById('map');

function render(html: string) {
  if (out) out.innerHTML = html;
}

if (!out) {
  throw new Error('#out missing');
}

if (!key) {
  render(
    '<p class="err">No API key in the bundle.</p>' +
      '<p>Add <code>VITE_GOOGLE_MAPS_API_KEY</code> or <code>GOOGLE_MAPS_API_KEY</code> to repo-root <code>.env</code>, restart Vite, reload.</p>'
  );
} else {
  const loader = new Loader({
    apiKey: key,
    version: 'weekly',
  });

  loader
    .load()
    .then(() => {
      const g = window.google?.maps;
      render('<p class="ok">Maps loaded — Tokyo marker below.</p>');

      if (!g?.Map || !mapEl || !mapWrap) {
        const p = document.createElement('p');
        p.className = 'err';
        p.textContent = 'Could not create map — Maps API or DOM missing.';
        out.appendChild(p);
        return;
      }

      const { lat, lng, name, address } = DEMO_LOCATION_TOKYO_SHIBUYA;
      const center = { lat, lng };

      if (mapTitle) {
        mapTitle.textContent = name;
      }

      const map = new g.Map(mapEl, {
        center,
        zoom: 15,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
      });

      new g.Marker({
        position: center,
        map,
        title: address,
      });

      mapWrap.hidden = false;
    })
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      render('<p class="err">Failed to load Maps.</p>');
      const pre = document.createElement('pre');
      pre.textContent = msg;
      out.appendChild(pre);
      const hint = document.createElement('p');
      hint.textContent = 'Check key, billing, Maps JavaScript API, and HTTP referrer restrictions.';
      out.appendChild(hint);
    });
}
