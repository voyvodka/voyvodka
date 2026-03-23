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

## Classification Rules

- Owned repositories: treated as primary projects.
- Forked repositories: treated as contribution entries.

## Deployment

- Self-hosted: separate frontend/backend services.
- Backend uses persistent volume for SQLite.
