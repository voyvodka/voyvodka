package app

import (
	"fmt"
	"net/http"

	"portfolio/backend/internal/config"
	httpx "portfolio/backend/internal/http"
	"portfolio/backend/internal/github"
	"portfolio/backend/internal/service"
	"portfolio/backend/internal/storage"
)

type App struct {
	Config config.Config
	Router http.Handler
	store  *storage.SQLite
}

func New() (*App, error) {
	cfg := config.Load()

	store, err := storage.New(cfg.SQLitePath)
	if err != nil {
		return nil, fmt.Errorf("initialize sqlite: %w", err)
	}

	ghClient := github.New(cfg.GitHubToken)
	portfolioService := service.NewPortfolioService(
		store,
		ghClient,
		cfg.GitHubUsername,
		cfg.CacheTTLSeconds,
		cfg.RefreshLockSeconds,
	)

	handler := httpx.NewHandler(portfolioService, cfg.InternalRefreshAPIKey)
	mux := http.NewServeMux()
	handler.Register(mux)

	return &App{
		Config: cfg,
		Router: httpx.CORS(cfg.AllowedOrigin, mux),
		store:  store,
	}, nil
}

func (a *App) Close() {
	if a.store != nil {
		_ = a.store.Close()
	}
}
