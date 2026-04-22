package domain

import "errors"

// ErrNotFound is returned when the upstream GitHub API responds with 404 —
// e.g. the repository has been deleted, renamed, or made private. Handlers
// use errors.Is(err, domain.ErrNotFound) to surface a proper 404 instead of
// masking deletion with stale cache or a generic 500.
var ErrNotFound = errors.New("not found")
