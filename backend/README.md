# Backend

Minimal Go API service for portfolio data.

## Stack

- Go
- SQLite

Go version target: `1.25`

## Responsibilities

- Fetch project/release data from GitHub API.
- Distinguish owned repositories from forks.
- Provide public endpoints for frontend consumption.
- Cache with TTL + refresh lock.

## Endpoints

- `GET /health`
- `GET /api/portfolio-data`
- `GET /api/project/{owner}/{repo}`
- `POST /api/internal/refresh` (requires `X-API-Key`)

## Run

```bash
go mod tidy
go run ./cmd/api
```

Default container port: `8081` (mapped to host `5555` in Makefile).

If Go is not installed locally, use Docker-based commands with Makefile:

```bash
cp .env.example .env
make tidy
make build
make run
```

`make run` uses a persistent Docker volume (`portfolio_data`) for SQLite cache.

Then open: `http://localhost:5555/health`

Or run directly in a Go container without local installation:

```bash
make dev
```

## Docker Run

```bash
docker build -t portfolio-backend .
docker run --rm -p 5555:8081 -v portfolio_data:/app/data --env-file .env portfolio-backend
```

## Security

- Keep `GITHUB_TOKEN` server-side only.
- Validate internal refresh endpoint key.
- Restrict CORS to frontend domain.
