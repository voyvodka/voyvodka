import { useMemo } from "react";
import { Link } from "react-router-dom";

import { usePortfolioData } from "@/hooks/usePortfolioData";
import { toProjectPath } from "@/lib/projectRoutes";

const exactDateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
});

function badgeLabel(projectCategory: string, isFork: boolean) {
  if (isFork || projectCategory === "contrib") return "CONTRIB";
  if (projectCategory === "explore") return "EXPLORE";
  return "CORE";
}

function badgeClass(projectCategory: string, isFork: boolean) {
  if (isFork || projectCategory === "contrib") return "status contrib";
  if (projectCategory === "explore") return "status active";
  return "status online";
}

const thisYearFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const otherYearFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

function githubDate(time: number, nowMs: number, currentYearStart: number, currentYearEnd: number) {
  const ms = nowMs - time;
  const min = 60 * 1000;
  const hour = 60 * min;
  const day = 24 * hour;

  if (ms < min) return "just now";
  if (ms < hour) return `${Math.floor(ms / min)} minutes ago`;
  if (ms < day) return `${Math.floor(ms / hour)} hours ago`;
  if (ms < 30 * day) return `${Math.floor(ms / day)} days ago`;

  if (time >= currentYearStart && time <= currentYearEnd) {
    return `on ${thisYearFormatter.format(time)}`;
  }
  return `on ${otherYearFormatter.format(time)}`;
}

export function ProjectsPage() {
  const { data, loading, error } = usePortfolioData();

  const renderedProjects = useMemo(() => {
    if (!data?.projects) return null;
    const nowMs = Date.now();

    const currentYear = new Date().getFullYear();
    const currentYearStart = new Date(currentYear, 0, 1).getTime();
    const currentYearEnd = new Date(currentYear + 1, 0, 1).getTime() - 1;

    return data.projects.map((project, idx) => {
      const time = Date.parse(project.updatedAt);
      return (
        <li className="row row--full" key={`${project.owner}/${project.repository}`}>
          <span className="mono">{String(idx + 1).padStart(2, "0")}</span>
          <div>
            <b>
              <Link className="repo-link" to={toProjectPath(project.repository)}>
                {project.repository}
              </Link>
              {project.latestRelease ? (
                <span className="repo-version mono">{project.latestRelease}</span>
              ) : null}
            </b>
            {project.isFork && (
              <div className="mono">{project.owner}</div>
            )}
          </div>
          <div className="mono">{project.description || "—"}</div>
          <div className="mono">{project.language || "—"}</div>
          <div className="mono updated-col"><time dateTime={project.updatedAt} title={exactDateFormatter.format(time)}>{githubDate(time, nowMs, currentYearStart, currentYearEnd)}</time></div>
          <span className={badgeClass(project.category, project.isFork)}>
            <Link to={toProjectPath(project.repository)} aria-label={`${badgeLabel(project.category, project.isFork)}: View details for ${project.repository}`}>{badgeLabel(project.category, project.isFork)}</Link>
          </span>
        </li>
      );
    });
  }, [data?.projects]);

  if (loading) return <main id="main-content" className="console" tabIndex={-1}><p className="mono" role="status" aria-live="polite">Loading repositories...</p></main>;
  if (error) return (
    <main id="main-content" className="console projects-page" tabIndex={-1}>
      <section className="panel">
        <p className="mono" role="alert">Failed to load repositories: {error}</p>
        <div className="hero-actions" style={{ marginTop: 16 }}>
          <Link to="/" className="btn"><span aria-hidden="true">&larr;</span> Return Home</Link>
        </div>
      </section>
    </main>
  );
  if (!data) return (
    <main id="main-content" className="console projects-page" tabIndex={-1}>
      <section className="panel">
        <p className="mono" role="alert">No repositories found.</p>
        <div className="hero-actions" style={{ marginTop: 16 }}>
          <Link to="/" className="btn"><span aria-hidden="true">&larr;</span> Return Home</Link>
        </div>
      </section>
    </main>
  );

  return (
    <main id="main-content" className="console projects-page" tabIndex={-1}>
      <section className="panel">
        <div className="section-head">
          <h1>All Repositories</h1>
          <span className="mono">{data.projects.length} repositories</span>
        </div>
        <div className="hero-actions">
          <Link className="btn" to="/"><span aria-hidden="true">&larr;</span> Back Home</Link>
          <a className="btn" href={`https://github.com/${data.profile.username}?tab=repositories`} target="_blank" rel="noreferrer" aria-label="Open on GitHub: repositories list">
            Open on GitHub <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>

      <section className="projects" id="all-projects">
        <div className="projects-header projects-header--full">
          <div>#</div>
          <div>Repository</div>
          <div>Description</div>
          <div>Stack</div>
          <div>Updated</div>
          <div>Status</div>
        </div>
        <ol className="projects-list">
          {renderedProjects}
        </ol>
      </section>
    </main>
  );
}
