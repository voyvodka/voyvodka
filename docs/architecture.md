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

- Self-hosted: separate frontend/backend services.
- Backend uses persistent volume for SQLite.
