# AI Video Generator

This app now runs as a full-stack workspace:

- `React + Vite` frontend on `http://localhost:3000`
- `Node + Express + SQLite` backend on `http://localhost:4000`
- Authenticated API routes for projects, credits, scripts, voices, settings, and video jobs
- Background script-to-video job queue with persisted project/job state
- Scene-based renderer that creates visuals, subtitles, audio, and a final MP4 in `backend/storage`

## Run Locally

1. Install dependencies:

```bash
npm install
cd backend && npm install
```

2. Configure environment files:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

3. Start frontend and backend together:

```bash
npm run dev
```

## Environment

Frontend `.env`:

```env
VITE_API_URL=
```

Backend `backend/.env`:

```env
PORT=4000
CLIENT_ORIGIN=http://localhost:3000
PUBLIC_BASE_URL=http://localhost:4000
JWT_SECRET=change-me
USE_MOCK_AI=false
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
OPENAI_IMAGE_MODEL=gpt-image-1
IMAGE_PROVIDER=auto
ELEVENLABS_API_KEY=
```

## Notes

- Provider keys are backend-only. Do not put OpenAI or ElevenLabs keys in Vite `VITE_*` variables.
- The renderer no longer requires a presenter image or any D-ID configuration.
- With `USE_MOCK_AI=false`, the app now automatically uses real providers when the relevant keys exist.
- `IMAGE_PROVIDER=auto` uses OpenAI image generation when possible and falls back to local scene artwork otherwise. Set `placeholder` only if you want to force fallback visuals.
- If `ELEVENLABS_API_KEY` is missing, the backend still renders the MP4 with scene motion and subtitles, using a silent fallback audio track.
