import { Link } from "react-router-dom";

import { Logo } from "@/components/Logo";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import { extractRepositoryName, toProjectPath } from "@/lib/projectRoutes";
import type { ProjectSummary } from "@/types/api";

function ago(isoDate: string) {
  const ms = Date.now() - new Date(isoDate).getTime();
  const day = 1000 * 60 * 60 * 24;
  const hour = 1000 * 60 * 60;
  if (ms < day) return `${Math.max(1, Math.floor(ms / hour))}h ago`;
  return `${Math.max(1, Math.floor(ms / day))}d ago`;
}

function toQuarter(isoDate: string) {
  const d = new Date(isoDate);
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `${d.getFullYear()} Q${q}`;
}

function statusClass(category: string, isFork: boolean) {
  if (isFork || category === "contrib") return "status contrib";
  if (category === "explore") return "status active";
  return "status online";
}

function statusLabel(category: string, isFork: boolean) {
  if (isFork || category === "contrib") return "CONTRIB";
  if (category === "explore") return "EXPLORE";
  return "CORE";
}

function eventLabel(type: string) {
  return type.replace("Event", " event");
}

function caseApproach(p: ProjectSummary) {
  if (p.language === "C#") return "ASP.NET Core + layered service architecture with clean separation of concerns.";
  if (p.language === "Rust") return "Rust processing pipeline with systems-level control and low overhead.";
  if (p.language === "Go") return "Go API with SQLite cache, minimal dependencies and low resource footprint.";
  if (p.language === "Swift") return "Native Swift with platform APIs for responsive desktop/mobile experience.";
  if (p.language === "TypeScript" || p.language === "JavaScript") return "TypeScript frontend with component isolation and typed API contracts.";
  return `${p.language ?? "Multi-language"} stack with focus on maintainability and clear data flow.`;
}

export function HomePage() {
  const { data, loading, error } = usePortfolioData();

  if (loading) return null;
  if (error) return <main className="console"><p className="mono">Failed to load data: {error}</p></main>;
  if (!data) return <main className="console"><p className="mono">No data available.</p></main>;

  const latest = data.projects[0]?.updatedAt;
  const latestRepos = data.projects.slice(0, 5);
  const topProjects = data.projects.slice(0, 8);

  const caseProjects = data.projects
    .filter((p) => !p.isFork && p.category === "core")
    .slice(0, 3);

  const timelineProjects = data.projects.filter((p) => !p.isFork).slice(0, 4);

  const languageCounts = data.projects.reduce<Record<string, number>>((acc, project) => {
    if (!project.language) return acc;
    acc[project.language] = (acc[project.language] || 0) + 1;
    return acc;
  }, {});
  const topLanguages = Object.entries(languageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxLangCount = topLanguages[0]?.[1] || 1;

  const displayName = data.profile.name || data.profile.username;

  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const activeThisQuarter = data.projects.filter(
    (p) => new Date(p.updatedAt).getTime() > ninetyDaysAgo
  ).length;
  const totalProjects = data.projects.length;
  const ownedCount = data.projects.filter((p) => !p.isFork).length;
  const forkCount = totalProjects - ownedCount;
  const languageCount = new Set(data.projects.map((p) => p.language).filter(Boolean)).size;
  const coreCount = data.projects.filter((p) => p.category === "core").length;
  const activePct = totalProjects > 0 ? Math.round((activeThisQuarter / totalProjects) * 100) : 0;
  const ownedPct = totalProjects > 0 ? Math.round((ownedCount / totalProjects) * 100) : 0;

  return (
    <main className="console">
      <header className="header">
        <div className="header-brand">
          <Logo />
          <span>{displayName} / Portfolio</span>
        </div>
        <nav>
          <a href="#projects">Projects</a>
          <a href="#cases">Case Files</a>
          <a href="#timeline">Timeline</a>
          <a href="#contact">Contact</a>
        </nav>
      </header>

      <section className="layout">
        <article className="panel">
          <div className="mono">MODE: DATA-PHYSICAL</div>
          <h1>Build systems like a control room.</h1>
          <p className="hero-text">
            Backend engineer focused on .NET Core, clean service architecture, and reliable shipping cadence.
            This console reflects active projects, contributions, and build history.
          </p>
          <div className="hero-actions">
            <a className="btn" href="#projects">Open Project Logs</a>
            <a className="btn" href={`https://github.com/${data.profile.username}`} target="_blank" rel="noreferrer">GitHub</a>
            <a className="btn" href="https://linkedin.com/in/samet-ozkan" target="_blank" rel="noreferrer">LinkedIn</a>
          </div>
          <div className="kpis">
            <div className="kpi"><b>{data.kpi.ownedRepositories}</b><span className="mono">owned repositories</span></div>
            <div className="kpi"><b>{data.kpi.mergedPRs}</b><span className="mono">merged prs</span></div>
            <div className="kpi"><b>{data.profile.followers}</b><span className="mono">github followers</span></div>
            <div className="kpi"><b>{latest ? ago(latest) : "--"}</b><span className="mono">last push age</span></div>
          </div>
        </article>

        <aside className="panel">
          <div className="section-head">
            <h2>Activity Signals</h2>
            <span className="mono">Computed from GitHub data</span>
          </div>
          <div className="gauges">
            <div className="gauge">
              <div className="gauge-label">Active this quarter</div>
              <div className="gauge-val">{activeThisQuarter}<span>/{totalProjects}</span></div>
              <div className="bar"><div className="fill" style={{ width: `${activePct}%` }} /></div>
            </div>
            <div className="gauge">
              <div className="gauge-label">Owned vs fork</div>
              <div className="gauge-val">{ownedCount}<span>/{totalProjects}</span></div>
              <div className="bar">
                <div className="fill fill-owned" style={{ width: `${ownedPct}%` }} />
              </div>
            </div>
            <div className="gauge gauge-stat">
              <div className="gauge-label">Languages used</div>
              <div className="gauge-val">{languageCount}</div>
            </div>
            <div className="gauge gauge-stat">
              <div className="gauge-label">Core projects</div>
              <div className="gauge-val">{coreCount}</div>
            </div>
            <div className="gauge gauge-stat">
              <div className="gauge-label">Merged PRs</div>
              <div className="gauge-val">{data.kpi.mergedPRs}</div>
            </div>
            <div className="gauge gauge-stat">
              <div className="gauge-label">Fork contrib</div>
              <div className="gauge-val">{forkCount}</div>
            </div>
          </div>
        </aside>
      </section>

      <section className="panel" id="github-live">
        <div className="section-head">
          <h2>GitHub Live Feed</h2>
          <span className="mono">Public API synchronized</span>
        </div>
        <div className="live-grid">
          <article className="live-box">
            <div className="section-head">
              <span className="mono">Latest repositories</span>
              <Link className="mono" to="/projects">view all</Link>
            </div>
            <ul className="live-list">
              {latestRepos.map((repo) => (
                <li className="live-item" key={`${repo.owner}/${repo.repository}`}>
                  <strong>
                    <Link className="repo-link" to={toProjectPath(repo.repository)}>
                      {repo.repository}
                    </Link>
                  </strong>
                  <span className="mono">{repo.description || "No description provided."}</span>
                  <span className="mono">
                    {repo.isFork ? "FORK / CONTRIBUTION" : "OWNED PROJECT"} | {repo.language || "Unknown"} | {repo.stars} stars | {ago(repo.updatedAt)}
                  </span>
                </li>
              ))}
            </ul>
            <ul className="lang-bars">
              {topLanguages.map(([lang, count]) => {
                const pct = Math.round((count / maxLangCount) * 100);
                return (
                  <li key={lang}>
                    <span>{lang}</span>
                    <div className="lang-track"><div className="lang-fill" style={{ width: `${pct}%` }} /></div>
                    <span>{count} repo</span>
                  </li>
                );
              })}
            </ul>
          </article>

          <article className="live-box">
            <div className="section-head">
              <span className="mono">Recent activity events</span>
              <a className="mono" href={`https://github.com/${data.profile.username}`} target="_blank" rel="noreferrer">profile</a>
            </div>
            <ul className="live-list">
              {data.events.slice(0, 6).map((event, idx) => (
                <li className="live-item" key={`${event.repository}-${event.createdAt}-${idx}`}>
                  <strong>
                    <Link className="repo-link" to={toProjectPath(extractRepositoryName(event.repository))}>
                      {event.repository}
                    </Link>
                  </strong>
                  <span className="mono">{eventLabel(event.type)}</span>
                  <span className="mono">{ago(event.createdAt)}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="projects" id="projects">
        <div className="projects-header">
          <div>#</div>
          <div>Project</div>
          <div>Purpose</div>
          <div>Stack</div>
          <div>Status</div>
        </div>
        {topProjects.map((project, idx) => (
          <div className="row" key={`${project.owner}/${project.repository}`}>
            <span className="mono">{String(idx + 1).padStart(2, "0")}</span>
            <div>
              <b>
                <Link className="repo-link" to={toProjectPath(project.repository)}>
                  {project.repository}
                </Link>
              </b>
              <div className="mono">{project.description || "No description"}</div>
            </div>
            <div className="mono">
              {project.isFork ? "Contribution and PR workflow" : "Design and maintain reliable product workflows"}
            </div>
            <div className="mono">{project.language || "Unknown"}</div>
            <span className={statusClass(project.category, project.isFork)}>
              <Link to={toProjectPath(project.repository)}>{statusLabel(project.category, project.isFork)}</Link>
            </span>
          </div>
        ))}
        <div className="projects-footer">
          <Link className="mono" to="/projects">View all {data.projects.length} repositories →</Link>
        </div>
      </section>

      <section className="panel" id="cases">
        <div className="section-head">
          <h2>Case Files</h2>
          <span className="mono">Stack / Context / Outcome</span>
        </div>
        <div className="grid-3">
          {caseProjects.length > 0 ? caseProjects.map((p) => (
            <article className="case" key={p.repository}>
              <h3>
                <Link to={toProjectPath(p.repository)} style={{ color: "inherit", textDecoration: "none" }}>
                  {p.repository}
                </Link>
              </h3>
              <ul>
                <li><span>Stack</span>{p.language || "Multi-language"}</li>
                <li><span>Context</span>{p.description || "Delivering a reliable and maintainable software solution."}</li>
                <li><span>Approach</span>{caseApproach(p)}</li>
              </ul>
            </article>
          )) : (
            <article className="case">
              <h3>No core projects yet</h3>
              <ul><li><span>Status</span>Push your first owned repository to populate this section.</li></ul>
            </article>
          )}
        </div>
      </section>

      <section className="grid-2" id="timeline">
        <article className="timeline">
          <div className="section-head">
            <h2>Build Timeline</h2>
            <span className="mono">Recent milestones</span>
          </div>
          {timelineProjects.map((p) => (
            <div className="time-item" key={p.repository}>
              <span className="mono">{toQuarter(p.updatedAt)}</span>
              <div>
                <strong>
                  <Link className="repo-link" to={toProjectPath(p.repository)}>{p.repository}</Link>
                </strong>
                <div className="mono">{p.description || "Active development."}</div>
              </div>
            </div>
          ))}
        </article>

        <article className="stack-matrix">
          <div className="section-head">
            <h2>Stack Matrix</h2>
            <span className="mono">Grouped by role</span>
          </div>
          <div className="stack-row"><span className="mono">Primary</span><div className="chips"><span className="chip">.NET Core</span><span className="chip">ASP.NET MVC</span><span className="chip">C#</span><span className="chip">REST APIs</span><span className="chip">EF Core</span></div></div>
          <div className="stack-row"><span className="mono">Backend Ops</span><div className="chips"><span className="chip">SQL Server</span><span className="chip">SQLite</span><span className="chip">Redis</span><span className="chip">Caching</span><span className="chip">Service Layers</span></div></div>
          <div className="stack-row"><span className="mono">Systems</span><div className="chips"><span className="chip">Go</span><span className="chip">Rust</span><span className="chip">Tauri</span></div></div>
          <div className="stack-row"><span className="mono">Full-stack</span><div className="chips"><span className="chip">Razor</span><span className="chip">MVC Views</span><span className="chip">JavaScript</span><span className="chip">jQuery</span></div></div>
          <div className="stack-row"><span className="mono">Frontend</span><div className="chips"><span className="chip">React</span><span className="chip">TypeScript</span><span className="chip">Vite</span></div></div>
          <div className="stack-row"><span className="mono">Deploy & Ops</span><div className="chips"><span className="chip">Docker</span><span className="chip">Linux</span><span className="chip">Coolify</span><span className="chip">Git</span><span className="chip">Self-hosted</span></div></div>
        </article>
      </section>

      <section className="notes">
        <div className="section-head">
          <h2>Operator Notes</h2>
          <span className="mono">How I work</span>
        </div>
        <article className="note">
          <b>01 / C# is my production language</b>
          <span className="mono">I build reliable backends with .NET Core — layered service architecture, clean API contracts, EF Core data flows, and predictable release cycles. This is where I operate without guardrails.</span>
        </article>
        <article className="note">
          <b>02 / AI multiplies output, not replaces judgment</b>
          <span className="mono">For React, Go, Rust, and desktop work I ship with AI acceleration. The decisions and trade-offs are mine — the speed is not. I mark the distinction clearly in every project.</span>
        </article>
        <article className="note">
          <b>03 / Code, deploy, own it</b>
          <span className="mono">Every project here goes from commit to production on self-hosted infrastructure I manage myself. Docker, Coolify, Linux — no magic between me and what runs in production.</span>
        </article>
      </section>

      <section className="contact" id="contact">
        <div>
          <strong>Ready for next mission.</strong>
          <div className="mono">Open to .NET backend and MVC full-stack roles. Interested in product teams that value practical engineering and AI-accelerated delivery.</div>
        </div>
        <div className="hero-actions">
          <a className="btn" href={`https://github.com/${data.profile.username}`} target="_blank" rel="noreferrer">GitHub</a>
          <a className="btn" href="https://linkedin.com/in/samet-ozkan" target="_blank" rel="noreferrer">LinkedIn</a>
        </div>
      </section>
    </main>
  );
}
