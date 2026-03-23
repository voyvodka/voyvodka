package github

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

const baseURL = "https://api.github.com"

type Client struct {
	httpClient *http.Client
	token      string
}

func New(token string) *Client {
	return &Client{
		httpClient: &http.Client{Timeout: 8 * time.Second},
		token:      token,
	}
}

type User struct {
	Login     string `json:"login"`
	Name      string `json:"name"`
	Bio       string `json:"bio"`
	Followers int    `json:"followers"`
}

type Repository struct {
	Name            string `json:"name"`
	Owner           Owner  `json:"owner"`
	Description     string `json:"description"`
	Language        string `json:"language"`
	Topics          []string `json:"topics"`
	StargazersCount int    `json:"stargazers_count"`
	ForksCount      int    `json:"forks_count"`
	WatchersCount   int    `json:"watchers_count"`
	OpenIssuesCount int    `json:"open_issues_count"`
	UpdatedAt       string `json:"updated_at"`
	PushedAt        string `json:"pushed_at"`
	DefaultBranch   string `json:"default_branch"`
	HTMLURL         string `json:"html_url"`
	Homepage        string `json:"homepage"`
	Fork            bool   `json:"fork"`
	License         License `json:"license"`
}

type Owner struct {
	Login string `json:"login"`
}

type License struct {
	Name string `json:"name"`
}

type Event struct {
	Type      string  `json:"type"`
	Repo      RepoRef `json:"repo"`
	CreatedAt string  `json:"created_at"`
}

type RepoRef struct {
	Name string `json:"name"`
}

type Release struct {
	TagName     string `json:"tag_name"`
	Name        string `json:"name"`
	PublishedAt string `json:"published_at"`
	Body        string `json:"body"`
	HTMLURL     string `json:"html_url"`
}

type Tag struct {
	Name   string `json:"name"`
	ZipURL string `json:"zipball_url"`
}

type PRSearchResult struct {
	TotalCount int               `json:"total_count"`
	Items      []PullRequestItem `json:"items"`
}

type PullRequestItem struct {
	Title       string      `json:"title"`
	HTMLURL     string      `json:"html_url"`
	CreatedAt   string      `json:"created_at"`
	PullRequest PRMergeInfo `json:"pull_request"`
}

type PRMergeInfo struct {
	MergedAt string `json:"merged_at"`
}

func (c *Client) GetUser(ctx context.Context, username string) (User, error) {
	var data User
	err := c.getJSON(ctx, fmt.Sprintf("/users/%s", username), &data)
	return data, err
}

func (c *Client) GetRepositories(ctx context.Context, username string) ([]Repository, error) {
	var data []Repository
	err := c.getJSON(ctx, fmt.Sprintf("/users/%s/repos?sort=updated&per_page=100", username), &data)
	return data, err
}

func (c *Client) GetEvents(ctx context.Context, username string) ([]Event, error) {
	var data []Event
	err := c.getJSON(ctx, fmt.Sprintf("/users/%s/events/public?per_page=20", username), &data)
	return data, err
}

func (c *Client) GetReleases(ctx context.Context, owner, repo string) ([]Release, error) {
	var data []Release
	err := c.getJSON(ctx, fmt.Sprintf("/repos/%s/%s/releases?per_page=20", owner, repo), &data)
	return data, err
}

func (c *Client) GetTags(ctx context.Context, owner, repo string) ([]Tag, error) {
	var data []Tag
	err := c.getJSON(ctx, fmt.Sprintf("/repos/%s/%s/tags?per_page=20", owner, repo), &data)
	return data, err
}

func (c *Client) GetRepository(ctx context.Context, owner, repo string) (Repository, error) {
	var data Repository
	err := c.getJSON(ctx, fmt.Sprintf("/repos/%s/%s", owner, repo), &data)
	return data, err
}

func (c *Client) GetReadme(ctx context.Context, owner, repo string) (string, error) {
	path := fmt.Sprintf("/repos/%s/%s/readme", owner, repo)
	return c.getRaw(ctx, path)
}

func (c *Client) GetFileContent(ctx context.Context, owner, repo, filePath string) (string, error) {
	path := fmt.Sprintf("/repos/%s/%s/contents/%s", owner, repo, filePath)
	return c.getRaw(ctx, path)
}

func (c *Client) SearchMergedPRs(ctx context.Context, username string) ([]PullRequestItem, error) {
	q := url.QueryEscape("author:" + username + " type:pr is:merged -user:" + username)
	var result PRSearchResult
	err := c.getJSON(ctx, "/search/issues?q="+q+"&per_page=30&sort=updated", &result)
	if err != nil {
		return nil, err
	}
	return result.Items, nil
}

func (c *Client) getRaw(ctx context.Context, path string) (string, error) {
	u, err := url.Parse(baseURL + path)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Accept", "application/vnd.github.raw+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	if c.token != "" {
		req.Header.Set("Authorization", "Bearer "+c.token)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return "", nil
	}

	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return "", fmt.Errorf("github api responded with status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	return string(body), nil
}

func (c *Client) getJSON(ctx context.Context, path string, out any) error {
	u, err := url.Parse(baseURL + path)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	if c.token != "" {
		req.Header.Set("Authorization", "Bearer "+c.token)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return fmt.Errorf("github api responded with status %d", resp.StatusCode)
	}

	if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
		return err
	}

	return nil
}
