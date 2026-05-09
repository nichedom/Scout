# Scout

Scout turns any place on Earth into an AI-powered virtual city tour. Search a location on an interactive 3D globe and receive a fully narrated guide covering history, curiosities, must-see spots, and practical tips — powered by Gemini AI and enriched with Wikipedia context.

---

## Overview

Scout is a fullstack web application with a React + TypeScript frontend and an Express backend. The user experience is split into two phases: a landing phase with a centered 3D globe and search bar, and an exploring phase where the globe shifts and a content panel slides in with the generated tour.

---

## Features

- Interactive 3D Earth globe built with React Three Fiber and Three.js
- Google Places autocomplete for location search
- AI-generated tour narratives via Gemini 2.0 Flash
- Wikipedia integration for contextual grounding
- Text-to-speech narration via ElevenLabs
- Street View integration through Google Maps
- Real-time pipeline tracker showing generation steps
- Dark glass-morphism UI with custom typography

---

## Tech Stack

| Layer      | Technology                              |
|------------|------------------------------------------|
| Frontend   | React, TypeScript, Vite, Tailwind CSS    |
| 3D Globe   | React Three Fiber, Three.js              |
| State      | Zustand                                  |
| Backend    | Node.js, Express, TypeScript             |
| AI         | Google Gemini 2.0 Flash                  |
| Voice      | ElevenLabs Text-to-Speech                |
| Maps       | Google Maps JavaScript API + Places API  |
| Knowledge  | Wikipedia REST API                       |

---

## Project Structure
```
Scout/
├── src/
│ ├── App.tsx # Root component, phase orchestration
│ ├── components/ # UI components (Globe3D, SearchBar, ContentPanel, etc.)
│ ├── services/ # API client
│ ├── store/ # Zustand store (useTourStore)
│ ├── types/ # Shared TypeScript types
│ ├── constants/ # App-wide constants
│ ├── context/ # React context providers
│ └── utils/ # Utility functions
├── backend/
│ └── src/
│ ├── routes/tour.ts # POST /api/tour — main orchestration endpoint
│ └── services/ # Gemini, Wikipedia, ElevenLabs integrations
├── public/
│ └── textures/ # Earth and cloud textures for the 3D globe
└── index.html
```

---

## Getting Started

### Prerequisites

- Node.js v18+ (see `.nvmrc`)
- Google Cloud project with Maps JavaScript API and Places API (New) enabled
- Gemini API key
- ElevenLabs API key and Voice ID

### Installation

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

Create a `.env` file inside `backend/`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

> For the Google Maps key, restrict HTTP referrers to `http://localhost:5173/*` in the Cloud Console.

### Running the App

```bash
# Run frontend and backend together
npm run start

# Or run individually
npm run dev       # Vite dev server on http://localhost:5173
npm run backend   # Express backend on http://localhost:3001
```

### Build

```bash
npm run build
npm run lint
```

---

## How It Works

1. The user types a location in the search bar powered by Google Places autocomplete.
2. The selected location is saved to the Zustand store and the UI switches to exploring phase.
3. The frontend posts the location to `POST /api/tour` on the Express backend.
4. The backend fetches a Wikipedia article for contextual grounding.
5. Gemini 2.0 Flash generates a structured tour with sections: welcome, history, curiosities, must-see POIs, tips, closing, and sources.
6. The frontend renders the tour in the content panel across three tabs: Tour, Street View, and Pipeline.
7. ElevenLabs reads the tour narration aloud via text-to-speech.

---

## API

### POST /api/tour

Request body:
```json
{
  "name": "Paris",
  "address": "Paris, France",
  "lat": 48.8566,
  "lng": 2.3522,
  "placeId": "ChIJD7fiBh9u5kcRYJSMaMOCCwQ"
}
```

Response:
```json
{
  "welcome": "...",
  "history": "...",
  "curiosities": ["..."],
  "mustSee": [{ "name": "...", "description": "..." }],
  "tips": ["..."],
  "closing": "...",
  "sources": ["..."]
}
```

Rate limit: 30 requests per hour per IP.

---

## Security

- Helmet.js for secure HTTP headers
- CORS restricted to the Vite dev origin (`http://localhost:5173`)
- Rate limiting via express-rate-limit

---

## Contributors

- [bashlui](https://github.com/bashlui) — Antonio
- [JMikeRivera](https://github.com/JMikeRivera) — Mike
- [rogervdo](https://github.com/rogervdo) — Rogelio Villarreal

---

## License

This project does not currently specify a license.
