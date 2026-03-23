package domain

type PortfolioData struct {
	UpdatedAt     string         `json:"updatedAt"`
	Profile       ProfileSummary `json:"profile"`
	KPI           KPI            `json:"kpi"`
	Projects      []Project      `json:"projects"`
	Contributions []Contribution `json:"contributions"`
	Events        []Event        `json:"events"`
	IsStale       bool           `json:"isStale"`
}

type ProfileSummary struct {
	Username  string `json:"username"`
	Name      string `json:"name"`
	Bio       string `json:"bio"`
	Followers int    `json:"followers"`
}

type KPI struct {
	OwnedRepositories int `json:"ownedRepositories"`
	MergedPRs         int `json:"mergedPRs"`
	TotalStars        int `json:"totalStars"`
}

type Project struct {
	Owner       string `json:"owner"`
	Repository  string `json:"repository"`
	Description string `json:"description"`
	Language    string `json:"language"`
	Stars       int    `json:"stars"`
	UpdatedAt   string `json:"updatedAt"`
	RepoURL     string `json:"repoUrl"`
	LiveURL     string `json:"liveUrl"`
	IsFork      bool   `json:"isFork"`
	Category    string `json:"category"`
}

type Contribution struct {
	Owner      string `json:"owner"`
	Repository string `json:"repository"`
	RepoURL    string `json:"repoUrl"`
	Title      string `json:"title"`
	MergedAt   string `json:"mergedAt"`
	PRURL      string `json:"prUrl"`
}

type Event struct {
	Repository string `json:"repository"`
	Type       string `json:"type"`
	CreatedAt  string `json:"createdAt"`
}

type ProjectDetail struct {
	Owner         string    `json:"owner"`
	Repository    string    `json:"repository"`
	Description   string    `json:"description"`
	Language      string    `json:"language"`
	Topics        []string  `json:"topics"`
	Stars         int       `json:"stars"`
	Forks         int       `json:"forks"`
	Watchers      int       `json:"watchers"`
	OpenIssues    int       `json:"openIssues"`
	DefaultBranch string    `json:"defaultBranch"`
	PushedAt      string    `json:"pushedAt"`
	UpdatedAt     string    `json:"updatedAt"`
	License       string    `json:"license"`
	RepoURL       string    `json:"repoUrl"`
	LiveURL       string    `json:"liveUrl"`
	IsFork        bool      `json:"isFork"`
	Category      string    `json:"category"`
	Readme        string    `json:"readme"`
	Changelog     string    `json:"changelog"`
	Releases      []Release `json:"releases"`
}

type Release struct {
	TagName     string `json:"tagName"`
	Name        string `json:"name"`
	PublishedAt string `json:"publishedAt"`
	Body        string `json:"body"`
	URL         string `json:"url"`
}
