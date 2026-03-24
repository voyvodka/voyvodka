import { Link, useParams } from "react-router-dom";

import { useProjectDetail } from "@/hooks/useProjectDetail";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import { findProjectBySlug } from "@/lib/projectRoutes";

function fmtDate(iso: string) {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function statusLabel(category: string, isFork: boolean) {
  if (isFork || category === "contrib") return "CONTRIB";
  if (category === "explore") return "EXPLORE";
  return "CORE";
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

  if (portfolioLoading) return <main className="console"><p className="mono">Loading project details...</p></main>;
  if (portfolioError) return <main className="console"><p className="mono">Failed to load project list: {portfolioError}</p></main>;
  if (!matchedProject) return <main className="console"><p className="mono">Project not found.</p></main>;
  if (loading) return null;
  if (error) return <main className="console"><p className="mono">Failed to load project: {error}</p></main>;
  if (!data) return <main className="console"><p className="mono">Project not found.</p></main>;

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
  const hasDistinctLiveURL = Boolean(data.liveUrl) && data.liveUrl !== data.repoUrl;

  const parentRepoUrl = data.parentRepoUrl || "";
  const parentRepo = data.parentRepo || "";

  return (
    <main className="console project-page">
      <div className="panel">
        <div className="hero-actions">
          <Link to="/" className="back-link">
            &larr; Home
          </Link>
          <Link to="/projects" className="back-link">
            All Repositories
          </Link>
        </div>
        <div className="project-title-row">
          <h2>
            {data.owner}/{data.repository}
          </h2>
          {data.isFork ? (
            <span className="fork-badge">FORK</span>
          ) : null}
        </div>
        {data.isFork && parentRepo ? (
          <p className="fork-origin mono">
            forked from{" "}
            {parentRepoUrl ? (
              <a href={parentRepoUrl} target="_blank" rel="noreferrer">
                {parentRepo} ↗
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
          <a href={data.repoUrl} target="_blank" rel="noreferrer">
            Repository
          </a>
          {hasDistinctLiveURL ? (
            <a href={data.liveUrl} target="_blank" rel="noreferrer">
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
          <p className="mono">No README content found for this repository.</p>
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
          <p className="mono">No CHANGELOG file or release notes found for this repository.</p>
        )}
      </section>

      <section className="panel">
        <div className="panel-title">
          <h3>Releases</h3>
        </div>
        {data.releases.length === 0 ? (
          <p className="info">No releases found for this repository.</p>
        ) : (
          <ul className="release-list">
            {data.releases.map((release) => (
              <li key={`${release.tagName}-${release.publishedAt}`}>
                <strong>{release.name || release.tagName}</strong>
                <small>{new Date(release.publishedAt).toLocaleString()}</small>
                <p>{release.body || "No release notes"}</p>
                <a href={release.url} target="_blank" rel="noreferrer">
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
