package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port                  string
	AppEnv                string
	GitHubToken           string
	GitHubUsername        string
	CacheTTLSeconds       int
	RefreshLockSeconds    int
	InternalRefreshAPIKey string
	AllowedOrigin         string
	SQLitePath            string
}

func Load() Config {
	return Config{
		Port:                  getenv("PORT", "8081"),
		AppEnv:                getenv("APP_ENV", "development"),
		GitHubToken:           getenv("GITHUB_TOKEN", ""),
		GitHubUsername:        getenv("GITHUB_USERNAME", "voyvodka"),
		CacheTTLSeconds:       getenvInt("CACHE_TTL_SECONDS", 86400),
		RefreshLockSeconds:    getenvInt("REFRESH_LOCK_SECONDS", 30),
		InternalRefreshAPIKey: getenv("INTERNAL_REFRESH_API_KEY", ""),
		AllowedOrigin:         getenv("ALLOWED_ORIGIN", "http://localhost:5173"),
		SQLitePath:            getenv("SQLITE_PATH", "./data/portfolio.db"),
	}
}

func getenv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func getenvInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}
