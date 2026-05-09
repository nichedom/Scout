import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Same trimming as `src/utils/googleMapsEnv.ts` (keep in sync). */
function stripQuotes(s: string): string {
  return s.trim().replace(/^["']|["']$/g, '');
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const mapsFromVite = stripQuotes(env.VITE_GOOGLE_MAPS_API_KEY ?? '');
  const mapsFromGoogle = stripQuotes(env.GOOGLE_MAPS_API_KEY ?? '');
  /** VITE_ wins if set; otherwise accept GOOGLE_MAPS_API_KEY (common mistake: no VITE_ prefix). */
  const resolvedMapsKey = mapsFromVite || mapsFromGoogle;

  return {
    plugins: [react()],
    ...(resolvedMapsKey
      ? {
          define: {
            'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(resolvedMapsKey),
          },
        }
      : {}),
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          mapsDemo: path.resolve(__dirname, 'maps-demo.html'),
        },
      },
    },
  };
});
