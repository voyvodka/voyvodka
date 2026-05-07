package httpx

import (
	"crypto/sha256"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"net/http"

	"portfolio/backend/internal/domain"
	"portfolio/backend/internal/service"
)

type Handler struct {
	portfolioService   *service.PortfolioService
	internalAPIKey     string
	internalAPIKeyHash [32]byte
}

func NewHandler(portfolioService *service.PortfolioService, internalAPIKey string) *Handler {
	return &Handler{
		portfolioService:   portfolioService,
		internalAPIKey:     internalAPIKey,
		// ⚡ Bolt optimization: Pre-calculate the SHA256 hash of the expected internalAPIKey
		// here in the constructor. This avoids expensive re-hashing of the static secret
		// on every incoming request, while still allowing for secure constant-time comparisons.
		internalAPIKeyHash: sha256.Sum256([]byte(internalAPIKey)),
	}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /health", h.health)
	mux.HandleFunc("GET /api/portfolio-data", h.getPortfolioData)
	mux.HandleFunc("GET /api/project/{owner}/{repo}", h.getProject)
	mux.HandleFunc("POST /api/internal/refresh", h.forceRefresh)
}

func (h *Handler) health(w http.ResponseWriter, _ *http.Request) {
	ws := h.portfolioService.WarmupStatus()
	writeJSON(w, http.StatusOK, map[string]any{
		"status":             "ok",
		"warmup_in_progress": ws.InProgress,
		"last_warmup_at":     ws.LastWarmupAt,
	})
}

func (h *Handler) getPortfolioData(w http.ResponseWriter, r *http.Request) {
	data, err := h.portfolioService.GetPortfolioData(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to load portfolio data"})
		return
	}

	if data.IsStale {
		w.Header().Set("Cache-Control", "public, max-age=0, must-revalidate")
	} else {
		w.Header().Set("Cache-Control", "public, max-age=60, stale-while-revalidate=1800")
	}

	writeJSON(w, http.StatusOK, data)
}

func isValidGitHubName(name string) bool {
	if name == "" || name == "." || name == ".." {
		return false
	}
	for _, c := range name {
		if !((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '-' || c == '_' || c == '.') {
			return false
		}
	}
	return true
}

func (h *Handler) getProject(w http.ResponseWriter, r *http.Request) {
	owner := r.PathValue("owner")
	repo := r.PathValue("repo")
	if owner == "" || repo == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "owner and repo are required"})
		return
	}

	if !isValidGitHubName(owner) || !isValidGitHubName(repo) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid owner or repo name"})
		return
	}

	detail, err := h.portfolioService.GetProjectDetail(r.Context(), owner, repo)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "project not found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to load project details"})
		return
	}

	w.Header().Set("Cache-Control", "public, max-age=300, stale-while-revalidate=3600")

	writeJSON(w, http.StatusOK, detail)
}

func (h *Handler) forceRefresh(w http.ResponseWriter, r *http.Request) {
	providedKey := r.Header.Get("X-API-Key")

	// Hash the provided key to prevent leaking its length via timing attack.
	// The expected internalAPIKeyHash is pre-calculated in the constructor for performance.
	providedHash := sha256.Sum256([]byte(providedKey))

	if h.internalAPIKey == "" || subtle.ConstantTimeCompare(providedHash[:], h.internalAPIKeyHash[:]) != 1 {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	data, err := h.portfolioService.ForceRefresh(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "refresh failed"})
		return
	}

	writeJSON(w, http.StatusOK, data)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
