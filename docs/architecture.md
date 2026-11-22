# Architecture Overview

## Components

- Frontend (React + Vite): renders portfolio UI.
- Backend (Go API): fetches and caches GitHub data.
- SQLite: persistent store for projects and releases.

## Data Flow

1. Frontend requests `/api/portfolio-data`.
2. Backend returns cached data if fresh.
3. If stale, first requester triggers refresh with lock.
4. Other requests receive stale data until refresh completes.

The SSR server proxies only `GET`/`HEAD` on `/api/portfolio-data` and `/api/project/{owner}/{repo}`
to the backend; every other `/api/*` request gets a local 404 and never reaches the API.

## Classification Rules

- Every repository the GitHub sync returns is a project; forks stay in the same list flagged `isFork` and are not
  counted in `kpi.ownedRepositories`.

## Deployment

- Self-hosted on Coolify (Hetzner), behind Cloudflare. Two services, each built from its own Dockerfile:
  `backend/` (Go API, port 8081) and `frontend/` (SSR server, port 3000).
- The backend keeps SQLite on a persistent volume (`SQLITE_PATH`, `/app/data/portfolio.db` in production).
- Runtime settings are environment variables set in Coolify; `backend/.env.example` and
  `frontend/.env.example` list the names. `GITHUB_TOKEN` and `INTERNAL_REFRESH_API_KEY` exist only there.
- A repository webhook (push events) calls Coolify, which rebuilds and redeploys. Its secret lives in
  Coolify and cannot be read back from GitHub: if the webhook is recreated, generate a new secret and
  enter it on both sides.
- `main` requires the CI checks "Frontend — typecheck + build" and "Backend — build + test".
