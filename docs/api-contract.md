# API Contract

The Go backend's HTTP surface (`backend/internal/http/handlers.go`). Response shapes are the structs
in `backend/internal/domain/models.go`; the frontend mirrors them in `frontend/src/types/api.ts`, by
hand — a field added on one side and not the other compiles fine and renders nothing.

## Public Endpoints

### GET `/health`

`status`, plus `warmup_in_progress` and `last_warmup_at` for the startup cache warm-up.

### GET `/api/portfolio-data`

`PortfolioData`: `updatedAt`, `profile`, `kpi`, `projects` (every repository the GitHub sync returns; forks carry `isFork: true`), `contributions` (always
empty since #118 — kept so the shape does not break the frontend), `events`, `contributionCalendar`, and `isStale` — true when the response
is served from a stale cache while a refresh runs.

### GET `/api/project/{owner}/{repo}`

Repository details, live URL resolution, release timeline and changelog for one project.

## Internal Endpoints

### POST `/api/internal/refresh`

- Protected by `X-API-Key` (`INTERNAL_REFRESH_API_KEY`).
- Triggers a forced sync from GitHub.
