import { Link } from "react-router-dom";

import { usePortfolioData } from "@/hooks/usePortfolioData";
import { toProjectPath } from "@/lib/projectRoutes";

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

function githubDate(isoDate: string) {
  const ms = Date.now() - new Date(isoDate).getTime();
  const min = 60 * 1000;
  const hour = 60 * min;
  const day = 24 * hour;

  if (ms < min) return "just now";
  if (ms < hour) return `${Math.floor(ms / min)} minutes ago`;
  if (ms < day) return `${Math.floor(ms / hour)} hours ago`;
  if (ms < 30 * day) return `${Math.floor(ms / day)} days ago`;

  const d = new Date(isoDate);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (d.getFullYear() === new Date().getFullYear()) {
    return `on ${months[d.getMonth()]} ${d.getDate()}`;
  }
  return `on ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function ProjectsPage() {
  const { data, loading, error } = usePortfolioData();

  if (loading) return null;
  if (error) return <main className="console"><p className="mono">Failed to load repositories: {error}</p></main>;
  if (!data) return <main className="console"><p className="mono">No repositories found.</p></main>;

  return (
    <main className="console projects-page">
      <section className="panel">
        <div className="section-head">
          <h2>All Repositories</h2>
          <span className="mono">{data.projects.length} repositories</span>
        </div>
        <div className="hero-actions">
          <Link className="btn" to="/">Back Home</Link>
          <a className="btn" href={`https://github.com/${data.profile.username}?tab=repositories`} target="_blank" rel="noreferrer">
            Open on GitHub
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
        {data.projects.map((project, idx) => (
          <div className="row row--full" key={`${project.owner}/${project.repository}`}>
            <span className="mono">{String(idx + 1).padStart(2, "0")}</span>
            <div>
              <b>
                <Link className="repo-link" to={toProjectPath(project.repository)}>
                  {project.repository}
                </Link>
              </b>
              {project.isFork && (
                <div className="mono">{project.owner}</div>
              )}
            </div>
            <div className="mono">{project.description || "—"}</div>
            <div className="mono">{project.language || "—"}</div>
            <div className="mono updated-col">{githubDate(project.updatedAt)}</div>
            <span className={badgeClass(project.category, project.isFork)}>
              <Link to={toProjectPath(project.repository)}>{badgeLabel(project.category, project.isFork)}</Link>
            </span>
          </div>
        ))}
      </section>
    </main>
  );
}
