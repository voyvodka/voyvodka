# API Contract (Draft)

## Public Endpoints

### GET `/api/portfolio-data`

Returns:

- profile metadata
- kpi metrics
- project list (owned/fork labels)
- latest releases summary
- `updatedAt`

### GET `/api/project/:owner/:repo`

Returns:

- repository details
- live URL resolution
- release timeline
- changelog/release notes

## Internal Endpoints

### POST `/api/internal/refresh`

- Protected by `X-API-Key`.
- Triggers forced sync from GitHub.
