package service

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/url"
	"sort"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"portfolio/backend/internal/domain"
	"portfolio/backend/internal/github"
	"portfolio/backend/internal/storage"
)

const cacheKey = "portfolio_data"
const projectDetailCachePrefix = "project_detail:"
const maxContentLength = 12000

const warmupDetailConcurrency = 3
const warmupDetailTimeout = 60 * time.Second

type PortfolioService struct {
	store          storage.Store
	githubClient   *github.Client
	username       string
	appEnv         string
	cacheTTL       time.Duration
	refreshLockTTL time.Duration

	refreshing   atomic.Bool
	warmingUp    atomic.Bool
	lastWarmupAt atomic.Int64
	mu           sync.Mutex
	detailLocks  sync.Map
}

func NewPortfolioService(store storage.Store, gh *github.Client, username, appEnv string, cacheTTLSeconds, lockSeconds int) *PortfolioService {
	return &PortfolioService{
		store:          store,
		githubClient:   gh,
		username:       username,
		appEnv:         appEnv,
		cacheTTL:       time.Duration(cacheTTLSeconds) * time.Second,
		refreshLockTTL: time.Duration(lockSeconds) * time.Second,
	}
}

func (s *PortfolioService) GetPortfolioData(ctx context.Context) (domain.PortfolioData, error) {
	entry, err := s.store.GetCache(ctx, cacheKey)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return domain.PortfolioData{}, err
	}

	hasCached := err == nil
	if hasCached && time.Since(entry.UpdatedAt) <= s.cacheTTL {
		var cached domain.PortfolioData
		if uErr := json.Unmarshal(entry.Payload, &cached); uErr == nil {
			cached.IsStale = false
			s.maybeWarmupDetails(cached.Projects)
			return cached, nil
		}
	}

	if s.refreshing.CompareAndSwap(false, true) {
		defer s.refreshing.Store(false)
		fresh, syncErr := s.refresh(ctx)
		if syncErr == nil {
			s.maybeWarmupDetails(fresh.Projects)
			return fresh, nil
		}
	}

	if hasCached {
		var stale domain.PortfolioData
		if uErr := json.Unmarshal(entry.Payload, &stale); uErr == nil {
			stale.IsStale = true
			s.maybeWarmupDetails(stale.Projects)
			return stale, nil
		}
	}

	final, refreshErr := s.refresh(ctx)
	if refreshErr == nil {
		s.maybeWarmupDetails(final.Projects)
	}
	return final, refreshErr
}

func (s *PortfolioService) ForceRefresh(ctx context.Context) (domain.PortfolioData, error) {
	data, err := s.refresh(ctx)
	if err == nil {
		s.maybeWarmupDetails(data.Projects)
	}
	return data, err
}

type WarmupStatus struct {
	InProgress   bool  `json:"in_progress"`
	LastWarmupAt int64 `json:"last_warmup_at,omitempty"`
}

func (s *PortfolioService) WarmupStatus() WarmupStatus {
	return WarmupStatus{
		InProgress:   s.warmingUp.Load(),
		LastWarmupAt: s.lastWarmupAt.Load(),
	}
}

func (s *PortfolioService) GetProjectDetail(ctx context.Context, owner, repo string) (domain.ProjectDetail, error) {
	key := detailCacheKey(owner, repo)

	entry, cacheErr := s.store.GetCache(ctx, key)
	hasCached := cacheErr == nil
	if cacheErr != nil && !errors.Is(cacheErr, sql.ErrNoRows) {
		return domain.ProjectDetail{}, cacheErr
	}

	if hasCached && time.Since(entry.UpdatedAt) <= s.cacheTTL {
		var cached domain.ProjectDetail
		if uErr := json.Unmarshal(entry.Payload, &cached); uErr == nil {
			return cached, nil
		}
	}

	lock := s.detailLock(key)
	lock.Lock()
	defer lock.Unlock()

	entry, cacheErr = s.store.GetCache(ctx, key)
	hasCached = cacheErr == nil
	if cacheErr != nil && !errors.Is(cacheErr, sql.ErrNoRows) {
		return domain.ProjectDetail{}, cacheErr
	}

	if hasCached && time.Since(entry.UpdatedAt) <= s.cacheTTL {
		var cached domain.ProjectDetail
		if uErr := json.Unmarshal(entry.Payload, &cached); uErr == nil {
			return cached, nil
		}
	}

	detail, err := s.fetchProjectDetail(ctx, owner, repo)
	if err != nil {
		// A 404 means the repo is gone (deleted / renamed / made private).
		// Don't mask that with stale cache — propagate so the handler can
		// return a proper 404.
		if errors.Is(err, domain.ErrNotFound) {
			return domain.ProjectDetail{}, err
		}
		if hasCached {
			var stale domain.ProjectDetail
			if uErr := json.Unmarshal(entry.Payload, &stale); uErr == nil {
				return stale, nil
			}
		}
		return domain.ProjectDetail{}, err
	}

	raw, mErr := json.Marshal(detail)
	if mErr == nil {
		_ = s.store.UpsertCache(ctx, key, raw, time.Now().UTC())
	}

	return detail, nil
}

func (s *PortfolioService) fetchProjectDetail(ctx context.Context, owner, repo string) (domain.ProjectDetail, error) {
	var (
		repository github.Repository
		readme     string
		changelog  string
		releases   []github.Release
		repoErr    error
	)

	fetchCtx, cancel := context.WithCancel(ctx)
	defer cancel()

	var wg sync.WaitGroup
	wg.Add(4)

	go func() {
		defer wg.Done()
		repository, repoErr = s.githubClient.GetRepository(fetchCtx, owner, repo)
		if repoErr != nil {
			cancel()
		}
	}()
	go func() {
		defer wg.Done()
		var err error
		readme, err = s.githubClient.GetReadme(fetchCtx, owner, repo)
		if err != nil && !errors.Is(err, context.Canceled) {
			readme = ""
		}
	}()
	go func() {
		defer wg.Done()
		changelog = s.getChangelog(fetchCtx, owner, repo)
	}()
	go func() {
		defer wg.Done()
		var err error
		releases, err = s.githubClient.GetReleases(fetchCtx, owner, repo, 20)
		if err != nil && !errors.Is(err, context.Canceled) {
			releases = []github.Release{}
		}
	}()

	wg.Wait()

	if repoErr != nil {
		return domain.ProjectDetail{}, repoErr
	}

	if len(releases) == 0 {
		tags, tagErr := s.githubClient.GetTags(ctx, owner, repo)
		if tagErr == nil {
			for _, tag := range tags {
				releases = append(releases, github.Release{
					TagName: tag.Name,
					Name:    tag.Name,
					Body:    "Tag snapshot (no GitHub release notes).",
					// Point at the canonical release-page URL on github.com
					// instead of the zipball API URL. The zipball is a raw
					// archive download — users (and LLM crawlers reading
					// JSON-LD ItemList) expect an HTML page.
					HTMLURL: fmt.Sprintf("https://github.com/%s/%s/releases/tag/%s", owner, repo, tag.Name),
				})
			}
		}
	}

	detail := domain.ProjectDetail{
		Owner:         owner,
		Repository:    repository.Name,
		Description:   strings.TrimSpace(repository.Description),
		Language:      repository.Language,
		Topics:        repository.Topics,
		Stars:         repository.StargazersCount,
		Forks:         repository.ForksCount,
		Watchers:      repository.WatchersCount,
		OpenIssues:    repository.OpenIssuesCount,
		DefaultBranch: repository.DefaultBranch,
		PushedAt:      repository.PushedAt,
		UpdatedAt:     repository.UpdatedAt,
		License:       strings.TrimSpace(repository.License.Name),
		RepoURL:       repository.HTMLURL,
		LiveURL:       s.resolveLiveURLDetailed(ctx, repository),
		IsFork:        repository.Fork,
		ParentRepo:    repository.Parent.FullName,
		ParentRepoURL: repository.Parent.HTMLURL,
		Category:      categoryForRepository(repository),
		Readme:        normalizeReadme(readme),
		Changelog:     normalizeReadme(changelog),
		Releases:      make([]domain.Release, 0, len(releases)),
	}

	for _, rel := range releases {
		detail.Releases = append(detail.Releases, domain.Release{
			TagName:     rel.TagName,
			Name:        rel.Name,
			PublishedAt: rel.PublishedAt,
			Body:        rel.Body,
			URL:         rel.HTMLURL,
		})
	}

	return detail, nil
}

func normalizeReadme(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return ""
	}

	if len(trimmed) > maxContentLength {
		return trimmed[:maxContentLength]
	}

	return trimmed
}

func (s *PortfolioService) maybeWarmupDetails(projects []domain.Project) {
	if s.appEnv != "production" {
		return
	}
	if len(projects) == 0 {
		return
	}
	if !s.warmingUp.CompareAndSwap(false, true) {
		return
	}

	last := s.lastWarmupAt.Load()
	if last > 0 && time.Since(time.Unix(last, 0)) < s.cacheTTL/2 {
		s.warmingUp.Store(false)
		return
	}

	snapshot := make([]domain.Project, len(projects))
	copy(snapshot, projects)

	go func() {
		defer s.warmingUp.Store(false)
		start := time.Now()
		log.Printf("warmup: starting for %d projects", len(snapshot))
		s.warmAllDetails(snapshot)
		log.Printf("warmup: completed in %s", time.Since(start))
		s.lastWarmupAt.Store(time.Now().Unix())
	}()
}

func (s *PortfolioService) warmAllDetails(projects []domain.Project) {
	sem := make(chan struct{}, warmupDetailConcurrency)
	var wg sync.WaitGroup

	for _, p := range projects {
		owner := strings.TrimSpace(p.Owner)
		repo := strings.TrimSpace(p.Repository)
		if owner == "" || repo == "" {
			continue
		}

		key := detailCacheKey(owner, repo)
		if entry, err := s.store.GetCache(context.Background(), key); err == nil {
			if time.Since(entry.UpdatedAt) <= s.cacheTTL {
				continue
			}
		}

		wg.Add(1)
		sem <- struct{}{}
		go func(owner, repo string) {
			defer wg.Done()
			defer func() { <-sem }()

			ctx, cancel := context.WithTimeout(context.Background(), warmupDetailTimeout)
			defer cancel()

			if _, err := s.GetProjectDetail(ctx, owner, repo); err != nil {
				log.Printf("warmup: %s/%s failed: %v", owner, repo, err)
			}
		}(owner, repo)
	}

	wg.Wait()
}

func (s *PortfolioService) detailLock(key string) *sync.Mutex {
	if lock, ok := s.detailLocks.Load(key); ok {
		return lock.(*sync.Mutex)
	}

	newLock := &sync.Mutex{}
	actual, _ := s.detailLocks.LoadOrStore(key, newLock)
	return actual.(*sync.Mutex)
}

func detailCacheKey(owner, repo string) string {
	return projectDetailCachePrefix + strings.ToLower(strings.TrimSpace(owner)) + "/" + strings.ToLower(strings.TrimSpace(repo))
}

func (s *PortfolioService) getChangelog(ctx context.Context, owner, repo string) string {
	candidates := []string{
		"CHANGELOG.md",
		"Changelog.md",
		"changelog.md",
		"docs/CHANGELOG.md",
		"docs/changelog.md",
	}

	type hit struct {
		content string
		idx     int
	}

	ctxCancel, cancel := context.WithCancel(ctx)
	defer cancel()

	hits := make(chan hit, len(candidates))

	var wg sync.WaitGroup
	for i, filePath := range candidates {
		wg.Add(1)
		go func(idx int, path string) {
			defer wg.Done()
			content, err := s.githubClient.GetFileContent(ctxCancel, owner, repo, path)
			if err == nil && strings.TrimSpace(content) != "" {
				hits <- hit{content: content, idx: idx}
			}
		}(i, filePath)
	}

	go func() {
		wg.Wait()
		close(hits)
	}()

	best := hit{idx: len(candidates)}
	for h := range hits {
		if h.idx < best.idx {
			best = h
			if best.idx == 0 {
				cancel()
			}
		}
	}

	if best.idx < len(candidates) {
		return best.content
	}
	return ""
}

func (s *PortfolioService) refresh(ctx context.Context) (domain.PortfolioData, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	ctx, timeoutCancel := context.WithTimeout(ctx, s.refreshLockTTL)
	defer timeoutCancel()

	refreshCtx, cancel := context.WithCancel(ctx)
	defer cancel()

	var (
		user                 github.User
		repos                []github.Repository
		events               []github.Event
		mergedPRsCount       int
		contributionCalendar []domain.ContributionDay
		userErr, reposErr    error
	)

	var wg sync.WaitGroup
	wg.Add(5)

	go func() {
		defer wg.Done()
		user, userErr = s.githubClient.GetUser(refreshCtx, s.username)
		if userErr != nil {
			cancel()
		}
	}()
	go func() {
		defer wg.Done()
		repos, reposErr = s.githubClient.GetRepositories(refreshCtx, s.username)
		if reposErr != nil {
			cancel()
		}
	}()
	go func() {
		defer wg.Done()
		var err error
		// ⚡ Bolt: Fetch only the 8 events needed for the portfolio UI to minimize payload size and memory overhead
		events, err = s.githubClient.GetEvents(refreshCtx, s.username, 8)
		if err != nil && !errors.Is(err, context.Canceled) {
			events = []github.Event{}
		}
	}()
	go func() {
		defer wg.Done()
		var err error
		mergedPRsCount, err = s.githubClient.SearchMergedPRs(refreshCtx, s.username)
		if err != nil && !errors.Is(err, context.Canceled) {
			mergedPRsCount = 0
		}
	}()
	go func() {
		defer wg.Done()
		var err error
		contributionCalendar, err = s.githubClient.GetContributionCalendar(refreshCtx, s.username)
		if err != nil && !errors.Is(err, context.Canceled) {
			log.Printf("GetContributionCalendar failed for user=%q: %v", s.username, err)
			contributionCalendar = []domain.ContributionDay{}
		}
	}()

	wg.Wait()

	if userErr != nil && !errors.Is(userErr, context.Canceled) {
		return domain.PortfolioData{}, userErr
	}
	if reposErr != nil && !errors.Is(reposErr, context.Canceled) {
		return domain.PortfolioData{}, reposErr
	}
	if userErr != nil {
		return domain.PortfolioData{}, userErr
	}
	if reposErr != nil {
		return domain.PortfolioData{}, reposErr
	}

	latestReleases := s.fetchLatestReleases(refreshCtx, repos)

	projects := make([]domain.Project, 0, len(repos))
	ownedCount := 0
	totalStars := 0

	for _, repo := range repos {
		if !repo.Fork {
			ownedCount++
		}
		totalStars += repo.StargazersCount

		projects = append(projects, domain.Project{
			Owner:         repo.Owner.Login,
			Repository:    repo.Name,
			Description:   strings.TrimSpace(repo.Description),
			Language:      repo.Language,
			Stars:         repo.StargazersCount,
			UpdatedAt:     repo.UpdatedAt,
			RepoURL:       repo.HTMLURL,
			LiveURL:       s.resolveLiveURLFast(repo),
			IsFork:        repo.Fork,
			Category:      categoryForRepository(repo),
			LatestRelease: latestReleases[repo.Owner.Login+"/"+repo.Name],
		})
	}

	sort.Slice(projects, func(i, j int) bool {
		return projects[i].UpdatedAt > projects[j].UpdatedAt
	})

	mappedEvents := make([]domain.Event, 0, min(8, len(events)))
	for idx, event := range events {
		if idx >= 8 {
			break
		}
		mappedEvents = append(mappedEvents, domain.Event{
			Repository: strings.TrimPrefix(event.Repo.Name, s.username+"/"),
			Type:       event.Type,
			CreatedAt:  event.CreatedAt,
		})
	}

	payload := domain.PortfolioData{
		UpdatedAt: time.Now().UTC().Format(time.RFC3339),
		Profile: domain.ProfileSummary{
			Username:  user.Login,
			Name:      user.Name,
			Bio:       user.Bio,
			Followers: user.Followers,
		},
		KPI: domain.KPI{
			OwnedRepositories: ownedCount,
			MergedPRs:         mergedPRsCount,
			TotalStars:        totalStars,
		},
		Projects:             projects,
		Contributions:        []domain.Contribution{},
		Events:               mappedEvents,
		ContributionCalendar: contributionCalendar,
		IsStale:              false,
	}

	raw, err := json.Marshal(payload)
	if err != nil {
		return domain.PortfolioData{}, err
	}

	if err := s.store.UpsertCache(ctx, cacheKey, raw, time.Now().UTC()); err != nil {
		return domain.PortfolioData{}, err
	}

	// Purge detail cache entries for repos that no longer belong to the
	// current portfolio (deleted, renamed, or made private upstream). Best
	// effort — a failure here doesn't invalidate the refresh itself.
	keep := make([]string, 0, len(projects))
	for _, p := range projects {
		keep = append(keep, detailCacheKey(p.Owner, p.Repository))
	}
	if removed, purgeErr := s.store.DeleteCacheNotIn(ctx, projectDetailCachePrefix, keep); purgeErr != nil {
		log.Printf("orphan detail cache purge failed: %v", purgeErr)
	} else if removed > 0 {
		log.Printf("orphan detail cache purge: removed %d entries", removed)
	}

	return payload, nil
}

// fetchLatestReleases fan-outs /releases?per_page=1 calls for non-fork repos
// in parallel. Best-effort: any per-repo failure just leaves that entry blank.
// Concurrency is bounded so we don't burst the GitHub rate limit on refresh.
func (s *PortfolioService) fetchLatestReleases(ctx context.Context, repos []github.Repository) map[string]string {
	const releaseFetchConcurrency = 5
	out := make(map[string]string, len(repos))
	if len(repos) == 0 {
		return out
	}

	var mu sync.Mutex
	var wg sync.WaitGroup
	sem := make(chan struct{}, releaseFetchConcurrency)

	for _, repo := range repos {
		if repo.Fork {
			continue
		}
		owner := strings.TrimSpace(repo.Owner.Login)
		name := strings.TrimSpace(repo.Name)
		if owner == "" || name == "" {
			continue
		}

		wg.Add(1)
		sem <- struct{}{}
		go func(owner, name string) {
			defer wg.Done()
			defer func() { <-sem }()

			rels, err := s.githubClient.GetReleases(ctx, owner, name, 1)
			if err != nil || len(rels) == 0 {
				return
			}
			tag := strings.TrimSpace(rels[0].TagName)
			if tag == "" {
				return
			}
			mu.Lock()
			out[owner+"/"+name] = tag
			mu.Unlock()
		}(owner, name)
	}

	wg.Wait()
	return out
}

func (s *PortfolioService) resolveLiveURLFast(repo github.Repository) string {
	if repo.Fork {
		return repo.HTMLURL
	}

	// Early return optimization: Check configured homepage first to short-circuit
	// the expensive concurrent CNAME API fetch, saving up to 4 unnecessary network calls.
	homepage := strings.TrimSpace(repo.Homepage)
	if candidate := normalizeURLCandidate(homepage); candidate != "" {
		return candidate
	}

	return ""
}

func (s *PortfolioService) resolveLiveURLDetailed(ctx context.Context, repo github.Repository) string {
	if repo.Fork {
		return repo.HTMLURL
	}

	homepage := strings.TrimSpace(repo.Homepage)
	if candidate := normalizeURLCandidate(homepage); candidate != "" {
		return candidate
	}

	owner := strings.TrimSpace(repo.Owner.Login)
	repository := strings.TrimSpace(repo.Name)

	if owner != "" && repository != "" {
		cnameCandidates := []string{"CNAME", "docs/CNAME", "frontend/public/CNAME", "frontend/CNAME"}

		ctxCancel, cancel := context.WithCancel(ctx)
		defer cancel()

		type hit struct {
			content string
			idx     int
		}
		hits := make(chan hit, len(cnameCandidates))

		var wg sync.WaitGroup
		for i, path := range cnameCandidates {
			wg.Add(1)
			go func(idx int, path string) {
				defer wg.Done()
				content, err := s.githubClient.GetFileContent(ctxCancel, owner, repository, path)
				if err != nil {
					return
				}
				if candidate := normalizeURLCandidate(content); candidate != "" {
					hits <- hit{content: candidate, idx: idx}
				}
			}(i, path)
		}

		go func() {
			wg.Wait()
			close(hits)
		}()

		best := hit{idx: len(cnameCandidates)}
		for h := range hits {
			if h.idx < best.idx {
				best = h
				if best.idx == 0 {
					cancel()
				}
			}
		}

		if best.idx < len(cnameCandidates) {
			return best.content
		}
	}

	return ""
}

func normalizeURLCandidate(raw string) string {
	trimmed := strings.TrimSpace(raw)
	trimmed = strings.Trim(trimmed, "\"'`\n\r\t ")
	if trimmed == "" {
		return ""
	}

	lower := strings.ToLower(trimmed)
	if strings.HasPrefix(lower, "localhost") || strings.HasPrefix(lower, "127.0.0.1") {
		return ""
	}

	if !strings.HasPrefix(lower, "http://") && !strings.HasPrefix(lower, "https://") {
		trimmed = "https://" + trimmed
	}

	parsed, err := url.Parse(trimmed)
	if err != nil || parsed.Host == "" {
		return ""
	}

	host := strings.ToLower(parsed.Host)
	if host == "localhost" || strings.HasPrefix(host, "127.0.0.1") {
		return ""
	}

	parsed.Fragment = ""
	return parsed.String()
}

func parsePROwnerRepo(htmlURL string) (owner, repo string) {
	parts := strings.Split(htmlURL, "/")
	if len(parts) >= 5 {
		return parts[3], parts[4]
	}
	return "", ""
}

func categoryForRepository(repo github.Repository) string {
	if repo.Fork {
		return "contrib"
	}

	name := strings.ToLower(repo.Name)
	if strings.Contains(name, "experiment") || strings.Contains(name, "demo") {
		return "explore"
	}

	return "core"
}
