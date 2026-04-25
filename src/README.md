# Frontend Notes

The frontend now talks only to the backend API.

- Auth, projects, credits, voices, scripts, settings, and video jobs are fetched from `/api/*`.
- Provider keys belong in `backend/.env`, not Vite `VITE_*` variables.
- For setup and run instructions, use the repo root `README.md`.
