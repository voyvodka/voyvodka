import { Link, useParams } from "react-router-dom";

import { useProjectDetail } from "@/hooks/useProjectDetail";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import { findProjectBySlug } from "@/lib/projectRoutes";
import type { ProjectDetail } from "@/types/api";

// Cache the formatter outside the component to avoid expensive
// re-instantiations of Intl.DateTimeFormat (or toLocaleString) on every format.
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric'
});

function fmtDate(iso: string) {
  if (!iso) return "-";
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "-";
  return dateFormatter.format(time);
}

function statusLabel(category: string, isFork: boolean) {
  if (isFork || category === "contrib") return "CONTRIB";
  if (category === "explore") return "EXPLORE";
  return "CORE";
}

function ReadmeFallback({ data, topics, license }: { data: ProjectDetail; topics: string[]; license: string }) {
  const lang = data.language || "open-source";
  const topicLine = topics.length > 0
    ? ` It's tagged ${topics.slice(0, 5).join(", ")}.`
    : "";
  const licenseLine = license ? ` Licensed under ${license}.` : "";
  return (
    <div className="readme-block">
      <p>
        <strong>{data.repository}</strong> is a {lang} project by {data.owner}, hosted on
        GitHub.{topicLine}{licenseLine}
      </p>
      <p>
        This repository doesn't ship a README in its default branch. The source
        tree, issues, and commit history on GitHub are the canonical reference
        for what the project does and how to run it.
      </p>
      <p>
        <a href={data.repoUrl} target="_blank" rel="noreferrer">Browse the repository on GitHub <span aria-hidden="true">→</span></a>
      </p>
    </div>
  );
}

function ChangelogFallback({ repoUrl, defaultBranch }: { repoUrl: string; defaultBranch: string }) {
  const branch = defaultBranch || "main";
  const commitsUrl = `${repoUrl.replace(/\/$/, "")}/commits/${branch}`;
  return (
    <div className="readme-block">
      <p>
        This repository doesn't maintain a dedicated CHANGELOG file. Released
        notes — when they exist — are listed in the Releases section below.
      </p>
      <p>
        For an unfiltered view of every change, the commit history on the
        <code> {branch} </code> branch is the source of truth.
      </p>
      <p>
        <a href={commitsUrl} target="_blank" rel="noreferrer">View commit history on GitHub <span aria-hidden="true">→</span></a>
      </p>
    </div>
  );
}

function ReleasesFallback({ repoUrl, defaultBranch, pushedAt }: { repoUrl: string; defaultBranch: string; pushedAt: string }) {
  const branch = defaultBranch || "main";
  const branchUrl = `${repoUrl.replace(/\/$/, "")}/tree/${branch}`;
  const pushed = pushedAt ? fmtDate(pushedAt) : null;
  return (
    <div className="readme-block">
      <p>
        No tagged releases yet. The current state of the project lives on the
        <code> {branch} </code> branch{pushed ? `, last pushed ${pushed}` : ""}.
      </p>
      <p>
        <a href={branchUrl} target="_blank" rel="noreferrer">Open the {branch} branch on GitHub <span aria-hidden="true">→</span></a>
      </p>
    </div>
  );
}

function buildReleaseChangelog(releases: { name: string; tagName: string; publishedAt: string; body: string }[]) {
  if (releases.length === 0) return "";

  return releases
    .map((release) => {
      const title = release.name || release.tagName;
      const date = fmtDate(release.publishedAt);
      const notes = (release.body || "No release notes").trim();
      return `## ${title}\n${date}\n\n${notes}`;
    })
    .join("\n\n---\n\n");
}

export function ProjectPage() {
  const { slug = "" } = useParams();
  const { data: portfolio, loading: portfolioLoading, error: portfolioError } = usePortfolioData();
  const normalizedSlug = slug.trim().toLowerCase();
  const matchedProject = portfolio ? findProjectBySlug(portfolio.projects, normalizedSlug) : null;
  const owner = matchedProject?.owner ?? "";
  const repo = matchedProject?.repository ?? "";

  const { data, loading, error } = useProjectDetail(owner, repo);

  if (portfolioLoading) return <main id="main-content" className="console" tabIndex={-1}><p className="mono" role="status" aria-live="polite">Loading project details...</p></main>;
  if (portfolioError) return (
    <main id="main-content" className="console project-page" tabIndex={-1}>
      <div className="panel">
        <p className="mono" role="alert">Failed to load project list: {portfolioError}</p>
        <div className="hero-actions" style={{ marginTop: 16 }}>
          <Link to="/" className="btn">Return Home</Link>
        </div>
      </div>
    </main>
  );
  if (!matchedProject) return (
    <main id="main-content" className="console project-page" tabIndex={-1}>
      <div className="panel">
        <p className="mono" role="alert">Project not found.</p>
        <div className="hero-actions" style={{ marginTop: 16 }}>
          <Link to="/" className="btn">Return Home</Link>
          <Link to="/projects" className="btn">All Repositories</Link>
        </div>
      </div>
    </main>
  );
  if (loading) return <main id="main-content" className="console" tabIndex={-1}><p className="mono" role="status" aria-live="polite">Loading project...</p></main>;
  if (error) return (
    <main id="main-content" className="console project-page" tabIndex={-1}>
      <div className="panel">
        <p className="mono" role="alert">Failed to load project: {error}</p>
        <div className="hero-actions" style={{ marginTop: 16 }}>
          <Link to="/" className="btn">Return Home</Link>
          <Link to="/projects" className="btn">All Repositories</Link>
        </div>
      </div>
    </main>
  );
  if (!data) return (
    <main id="main-content" className="console project-page" tabIndex={-1}>
      <div className="panel">
        <p className="mono" role="alert">Project not found.</p>
        <div className="hero-actions" style={{ marginTop: 16 }}>
          <Link to="/" className="btn">Return Home</Link>
          <Link to="/projects" className="btn">All Repositories</Link>
        </div>
      </div>
    </main>
  );

  const topics = data.topics ?? [];
  const stars = data.stars ?? 0;
  const forks = data.forks ?? 0;
  const watchers = data.watchers ?? 0;
  const openIssues = data.openIssues ?? 0;
  const defaultBranch = data.defaultBranch ?? "";
  const license = data.license ?? "";
  const pushedAt = data.pushedAt ?? "";
  const updatedAt = data.updatedAt ?? "";
  const readme = data.readme ?? "";
  const changelog = data.changelog ?? "";
  const releaseChangelog = buildReleaseChangelog(data.releases);
  const latestRelease = data.releases.find((r) => r.tagName);
  const hasDistinctLiveURL = Boolean(data.liveUrl) && data.liveUrl !== data.repoUrl;

  const parentRepoUrl = data.parentRepoUrl || "";
  const parentRepo = data.parentRepo || "";

  return (
    <main id="main-content" className="console project-page" tabIndex={-1}>
      <div className="panel">
        <div className="hero-actions">
          <Link to="/" className="back-link" aria-label="Return Home">
            <span aria-hidden="true">&larr;</span> Home
          </Link>
          <Link to="/projects" className="back-link" aria-label="View all repositories">
            All Repositories
          </Link>
        </div>
        <div className="project-title-row">
          <h1>{data.repository}</h1>
          {data.isFork ? (
            <span className="fork-badge">FORK</span>
          ) : null}
          {latestRelease ? (
            <span className="release-badge">
              <span className="release-badge__label">release</span>
              <span className="release-badge__value">{latestRelease.tagName}</span>
            </span>
          ) : null}
        </div>
        {data.isFork && parentRepo ? (
          <p className="fork-origin mono">
            forked from{" "}
            {parentRepoUrl ? (
              <a href={parentRepoUrl} target="_blank" rel="noreferrer">
                {parentRepo} <span aria-hidden="true">↗</span>
              </a>
            ) : (
              parentRepo
            )}
          </p>
        ) : null}
        <p className="project-description">{data.description || "No description"}</p>
        <div className="project-kpis">
          <div className="kpi"><b>{stars}</b><span className="mono">stars</span></div>
          <div className="kpi"><b>{forks}</b><span className="mono">forks</span></div>
          <div className="kpi"><b>{watchers}</b><span className="mono">watchers</span></div>
          <div className="kpi"><b>{openIssues}</b><span className="mono">open issues</span></div>
        </div>
        <div className="project-meta">
          <span className="mono">owner: {data.owner}</span>
          <span className="mono">status: {statusLabel(data.category, data.isFork)}</span>
          <span className="mono">language: {data.language || "Unknown"}</span>
          <span className="mono">branch: {defaultBranch || "-"}</span>
          <span className="mono">license: {license || "No license"}</span>
          <span className="mono">updated: {fmtDate(updatedAt)}</span>
          <span className="mono">last push: {fmtDate(pushedAt)}</span>
        </div>
        {topics.length > 0 ? (
          <div className="chips">
            {topics.map((topic) => (
              <span className="chip" key={topic}>{topic}</span>
            ))}
          </div>
        ) : null}
        <div className="actions">
          <a href={data.repoUrl} target="_blank" rel="noreferrer" aria-label="Open repository on GitHub">
            Repository
          </a>
          {hasDistinctLiveURL ? (
            <a href={data.liveUrl} target="_blank" rel="noreferrer" aria-label="Open live project">
              Live
            </a>
          ) : null}
        </div>
      </div>

      <section className="panel">
        <div className="panel-title">
          <h3>README Snapshot</h3>
        </div>
        {data.readmeHtml ? (
          <div className="readme-block markdown-body" dangerouslySetInnerHTML={{ __html: data.readmeHtml }} />
        ) : readme ? (
          <div className="readme-block markdown-body"><pre>{readme}</pre></div>
        ) : (
          <ReadmeFallback data={data} topics={topics} license={license} />
        )}
      </section>

      <section className="panel">
        <div className="panel-title">
          <h3>Changelog</h3>
        </div>
        {data.changelogHtml ? (
          <div className="readme-block markdown-body" dangerouslySetInnerHTML={{ __html: data.changelogHtml }} />
        ) : changelog ? (
          <div className="readme-block markdown-body"><pre>{changelog}</pre></div>
        ) : releaseChangelog ? (
          <div className="readme-block markdown-body"><pre>{releaseChangelog}</pre></div>
        ) : (
          <ChangelogFallback repoUrl={data.repoUrl} defaultBranch={defaultBranch} />
        )}
      </section>

      <section className="panel">
        <div className="panel-title">
          <h3>Releases</h3>
        </div>
        {data.releases.length === 0 ? (
          <ReleasesFallback repoUrl={data.repoUrl} defaultBranch={defaultBranch} pushedAt={pushedAt} />
        ) : (
          <ul className="release-list">
            {data.releases.map((release) => (
              <li key={`${release.tagName}-${release.publishedAt}`}>
                <strong>{release.name || release.tagName}</strong>
                {release.publishedAt ? (
                  <small>
                    <time dateTime={release.publishedAt}>{fmtDate(release.publishedAt)}</time>
                  </small>
                ) : null}
                {release.bodyHtml ? (
                  <div className="release-body markdown-body" dangerouslySetInnerHTML={{ __html: release.bodyHtml }} />
                ) : (
                  <p>{release.body || "No release notes"}</p>
                )}
                <a href={release.url} target="_blank" rel="noreferrer" aria-label={`Open release ${release.tagName} on GitHub`}>
                  Open on GitHub
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
