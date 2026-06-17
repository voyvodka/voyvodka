package httpx

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestIsValidGitHubName(t *testing.T) {
	cases := []struct {
		name     string
		input    string
		expected bool
	}{
		{"valid owner", "owner", true},
		{"valid repo", "repo-name", true},
		{"valid repo with dot", "repo_name.go", true},
		{"invalid empty", "", false},
		{"invalid dot", ".", false},
		{"invalid dot dot", "..", false},
		{"invalid path traversal", "../owner", false},
		{"invalid encoded slash", "foo%2fbar", false}, // % is invalid
		{"invalid slash", "foo/bar", false},
		{"invalid length", "a" + string(make([]byte, 100)) + "a", false},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := isValidGitHubName(c.input); got != c.expected {
				t.Errorf("isValidGitHubName(%q) == %v, want %v", c.input, got, c.expected)
			}
		})
	}
}

func TestGetProject_InvalidPath(t *testing.T) {
	// Since we mock the portfolioService, we can just pass nil and see if validation panics or not.
	// Actually, passing nil portfolioService would crash if it reaches `h.portfolioService.GetProjectDetail`.
	// But it shouldn't reach there.
	h := &Handler{}

	req := httptest.NewRequest("GET", "/api/project/owner/..%2f..%2f..%2fuser", nil)
	// We need to set path values on the request manually to simulate Go 1.22 ServeMux
	req.SetPathValue("owner", "owner")
	req.SetPathValue("repo", "../../../user")

	w := httptest.NewRecorder()
	h.getProject(w, req)

	res := w.Result()
	if res.StatusCode != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, res.StatusCode)
	}
}
