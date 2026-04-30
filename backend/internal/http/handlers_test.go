package httpx

import (
	"testing"
)

func TestIsValidGitHubName(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected bool
	}{
		{"valid repo", "my-repo_1.0", true},
		{"valid owner", "voyvodka", true},
		{"path traversal", "../user", false},
		{"url encoded", "..%2fuser", false},
		{"empty", "", false},
		{"too long", "a" + string(make([]byte, 100)), false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := isValidGitHubName(tt.input); got != tt.expected {
				t.Errorf("isValidGitHubName(%q) = %v; want %v", tt.input, got, tt.expected)
			}
		})
	}
}
