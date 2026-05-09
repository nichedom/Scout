# AGENTS.md

## Commands

```bash
npm install && cd backend && npm install   # both roots must be installed
npm start                                   # frontend (:5173) + backend (:3001) via concurrently
npm run dev                                 # Vite dev server only
npm run backend                             # Express only (ts-node-dev, hot-reload)
npm run build                               # tsc -b && vite build
npm run lint                                 # ESLint (no --fix)
```

No tests exist in this project.

## Setup

Two separate `node_modules` (root + `backend/`). Both `.env` files must be populated before running:

- **Root `.env`**: `VITE_GOOGLE_MAPS_API_KEY` (required for Places autocomplete + map)
- **`backend/.env`**: `GEMINI_API_KEY` (required), `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `PORT=3001`, `CORS_ORIGIN=http://localhost:5173`

Copy from `.env.example` files in each root.

## Architecture

**Scout** — AI-powered virtual city tour guide. User searches a location on a 3D globe, app generates a narrative tour via Gemini (with Wikipedia context).

### Two-package layout

- **Root** (`/`): Vite + React 18 frontend. Entry: `src/main.tsx` → `App.tsx`
- **`backend/`**: Express API. Entry: `backend/src/index.ts`

Frontend calls `/api/tour` which Vite proxies to `http://localhost:3001` (config in `vite.config.ts`). Never hardcode the backend port in frontend fetches.

### Frontend data flow

1. `SearchBar.tsx` → writes `LocationData` to Zustand store (`src/store/useTourStore.ts`), switches phase to `exploring`
2. `App.tsx` detects phase change → calls `src/services/api.ts` → `POST /api/tour`
3. Response populates `tourContent` and `pipeline` steps in store
4. `ContentPanel.tsx` renders three tabs: Tour, Street View, Pipeline

**Phases** (Zustand): `landing` → globe centered + search bar. `exploring` → globe shifts right, content panel slides in.

### Backend pipeline

`POST /api/tour` in `backend/src/routes/tour.ts`:
1. Fetches Wikipedia extract (`backend/src/services/wikipedia.ts`, 5s timeout, 2000 char cap)
2. Calls Gemini 2.0 Flash (`backend/src/services/gemini.ts`, `responseMimeType: application/json`, `temperature: 0.85`)
3. Returns structured `TourContent`

### Key types (`src/types/index.ts`)

- `LocationData`: name, address, lat, lng, placeId?, types?
- `TourContent`: welcome, history, curiosities[], mustSee (PointOfInterest[]), localTips, closing, sources[]
- `PipelineStep`: id, icon, label, status (idle|running|done|error), detail?, durationMs?

### Styling conventions

Dark minimalist theme. Custom Tailwind colors (`space-*`, `amber-*`, `cyan-*`) and fonts (`display`/`body`→Roboto, `mono`→Roboto Mono) defined in `tailwind.config.ts`. Animations via `framer-motion`. CSS variables in `src/index.css`.

## Planned features (post-MVP, not yet implemented)

These exist in the pipeline UI but have no backend logic yet:
- **ElevenLabs narration** (env var present, no service code)
- **Microphone voice input** for AI interaction
- **Reddit data source** (pipeline step exists as `reddit`, marked "Skipped", `redditPosts: 0`)
- **Extended AI research** after initial response

## Gotchas

- `backend/` has its own `tsconfig.json` (CommonJS output to `dist/`). Frontend uses project references (`tsconfig.app.json` + `tsconfig.node.json`).
- Gemini prompt expects strict JSON output. `gemini.ts` has an `extractJson()` fallback for markdown-wrapped responses.
- Wikipedia service silently returns `null` on failure — tour generation proceeds without it.
- Rate limit: 30 requests/hour/IP on `/api/tour`.
- `public/textures/` holds Earth/cloud textures for the Three.js globe — don't delete or rename.