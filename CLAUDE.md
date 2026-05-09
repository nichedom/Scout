# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies (run in both root and backend/)
npm install
cd backend && npm install

# Run both frontend and backend together
npm start

# Run individually
npm run dev        # Vite dev server on :5173
npm run backend    # Express backend on :3001 (hot-reload via ts-node-dev)

# Build & lint
npm run build      # tsc -b && vite build
npm run lint       # ESLint
```

There are no tests in this project.

## Environment Variables

**Root `.env`:**
```
VITE_GOOGLE_MAPS_API_KEY=...
```

**`backend/.env`:**
```
GEMINI_API_KEY=...
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

## Architecture

Scout is an AI-powered virtual city tour guide. The user searches a location on an interactive 3D globe, and the app generates a narrative tour using Gemini (with Wikipedia context).

### Frontend (`src/`)

**Phase-based UI:** The app has two phases managed by Zustand (`src/store/useTourStore.ts`):
- `landing` — centered globe + search bar
- `exploring` — globe shifts right, content panel slides in from the right

**Data flow:**
1. `SearchBar.tsx` uses Google Places autocomplete and writes `LocationData` to store, switching phase to `exploring`
2. `App.tsx` detects phase change and calls `src/services/api.ts` to `POST /api/tour`
3. Response populates `tourContent` and `pipeline` steps in the Zustand store
4. `ContentPanel.tsx` shows three tabs: **Tour** (narrative), **Street View** (map), **Pipeline** (real-time step tracker)

**Globe:** `Globe3D.tsx` uses React Three Fiber + Three.js with Earth/cloud textures from `public/textures/`. It renders location pins and animates the camera to the selected location.

**Styling:** Dark glass-morphism theme. Custom Tailwind colors (`space-*` for backgrounds, `amber-*`/`cyan-*` for accents) defined in `tailwind.config.ts`. Custom fonts: `display` (Playfair Display), `body` (DM Sans), `mono` (DM Mono).

### Backend (`backend/src/`)

Express server on port 3001. Single route: `POST /api/tour`.

**`routes/tour.ts`** orchestrates:
1. Fetches Wikipedia article for location context (`services/wikipedia.ts`)
2. Calls Gemini 2.0 Flash (`services/gemini.ts`) with location + Wikipedia context
3. Returns structured `TourContent`: `welcome`, `history`, `curiosities`, `mustSee` (POIs), `tips`, `closing`, `sources`

Security: Helmet headers, CORS restricted to `:5173`, rate limit 30 req/hour/IP.

### API Proxy

Vite proxies `/api/*` → `http://localhost:3001`, so the frontend always calls `/api/tour` without worrying about ports.

### Key Types (`src/types/index.ts`)

```ts
LocationData     // name, address, lat, lng, placeId
TourContent      // welcome, history, curiosities, mustSee, tips, closing, sources
PipelineStep     // id, label, status ('pending'|'running'|'done'|'error'), duration
```

Zustand store shape: `phase`, `location`, `tourContent`, `pipeline`, `isLoading`, `activeTab`.
