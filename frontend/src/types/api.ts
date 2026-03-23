export type PortfolioData = {
  updatedAt: string;
  profile: {
    username: string;
    name: string;
    bio: string;
    followers: number;
  };
  kpi: {
    ownedRepositories: number;
    mergedPRs: number;
    totalStars: number;
  };
  projects: ProjectSummary[];
  contributions: Contribution[];
  events: EventSummary[];
  isStale: boolean;
};

export type ProjectSummary = {
  owner: string;
  repository: string;
  description: string;
  language: string;
  stars: number;
  updatedAt: string;
  repoUrl: string;
  liveUrl: string;
  isFork: boolean;
  category: "core" | "contrib" | "explore";
};

export type Contribution = {
  owner: string;
  repository: string;
  repoUrl: string;
  title: string;
  mergedAt: string;
  prUrl: string;
};

export type EventSummary = {
  repository: string;
  type: string;
  createdAt: string;
};

export type ProjectDetail = {
  owner: string;
  repository: string;
  description: string;
  language: string;
  topics: string[];
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  defaultBranch: string;
  pushedAt: string;
  updatedAt: string;
  license: string;
  repoUrl: string;
  liveUrl: string;
  isFork: boolean;
  category: "core" | "contrib" | "explore";
  readme: string;
  changelog: string;
  releases: Release[];
};

export type Release = {
  tagName: string;
  name: string;
  publishedAt: string;
  body: string;
  url: string;
};
