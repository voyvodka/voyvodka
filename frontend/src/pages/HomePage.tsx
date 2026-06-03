import { useState, useMemo } from "react";
import { Link } from "react-router-dom";

import { Logo } from "@/components/Logo";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import { extractRepositoryName, toProjectPath } from "@/lib/projectRoutes";
import type { ContributionDay, ProjectSummary } from "@/types/api";

const WEEKS_TO_SHOW = 30;

// Cache the formatter outside the component to avoid expensive
// re-instantiations of Intl.DateTimeFormat on every render and hover.
const heatmapDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric"
});

const exactDateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
});

function ContribHeatmap({ calendar }: { calendar: ContributionDay[] }) {
  const [hovered, setHovered] = useState<string | null>(null);

  // Memoize the mapped contribution array to prevent expensive
  // date formatting calculations on every hover re-render.
  // This reduces re-renders computation complexity from O(n) to O(1) during hover state changes.
  const recent = useMemo(() => {
    const tail = calendar.slice(-(WEEKS_TO_SHOW * 7));
    const firstDow = tail.length > 0 ? (new Date(tail[0].date).getDay() + 6) % 7 : 0;
    const rawRecent = calendar.slice(-(WEEKS_TO_SHOW * 7 + firstDow));

    const level = (n: number) => n === 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : n <= 9 ? 3 : 4;
    const fmt = (date: string, count: number) => {
      const label = heatmapDateFormatter.format(Date.parse(date));
      return count === 0 ? `No contributions · ${label}` : `${count} contribution${count !== 1 ? "s" : ""} · ${label}`;
    };

    return rawRecent.map((day) => ({
      date: day.date,
      count: day.count,
      level: level(day.count),
      label: fmt(day.date, day.count)
    }));
  }, [calendar]);

  return (
    <div className="contrib-section">
      <div className="gauge-label" style={{ marginBottom: 8 }}>Contribution activity</div>
      <div className="contrib-grid">
        {recent.map((day) => (
          <span
            key={day.date}
            className="contrib-cell"
            data-level={day.level}
            role="img"
            aria-label={day.label}
            tabIndex={0}
            onMouseEnter={() => setHovered(day.label)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(day.label)}
            onBlur={() => setHovered(null)}
          />
        ))}
      </div>
      <div className="contrib-info">{hovered ?? "\u00A0"}</div>
    </div>
  );
}

function ago(isoDate: string, nowMs: number) {
  const ms = nowMs - Date.parse(isoDate);
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

  const displayName = data?.profile.name || data?.profile.username || "Portfolio";
  const githubUrl = data?.profile.username ? `https://github.com/${data.profile.username}` : "https://github.com";

  // Memoize expensive derived calculations to prevent redundant
  // array traversals, sorting, and mapping on every render.
  const derivedData = useMemo(() => {
    const projects = data?.projects ?? [];

    const latest = projects[0]?.updatedAt;
    const latestRepos = projects.slice(0, 5);

    const projectRepoSet = new Set(projects.map((p) => p.repository));
    const topProjects = projects.slice(0, 8);

    const caseProjects = projects
      .filter((p) => !p.isFork && p.category === "core")
      .slice(0, 3);

    const timelineProjects = projects.filter((p) => !p.isFork).slice(0, 4);

    const languageCounts = projects.reduce<Record<string, number>>((acc, project) => {
      if (!project.language) return acc;
      acc[project.language] = (acc[project.language] || 0) + 1;
      return acc;
    }, {});
    const topLanguages = Object.entries(languageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const maxLangCount = topLanguages[0]?.[1] || 1;

    const ninetyDaysAgoIso = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const totalProjects = projects.length;
    const activeThisQuarter = projects.filter(
      (p) => p.updatedAt > ninetyDaysAgoIso
    ).length;
    const ownedCount = projects.filter((p) => !p.isFork).length;
    const coreCount = projects.filter((p) => p.category === "core").length;
    const topLangCount = topLanguages[0]?.[1] ?? 0;
    const topLangName = topLanguages[0]?.[0] ?? "";
    const activePct = totalProjects > 0 ? Math.round((activeThisQuarter / totalProjects) * 100) : 0;
    const ownedPct = totalProjects > 0 ? Math.round((ownedCount / totalProjects) * 100) : 0;
    const corePct = ownedCount > 0 ? Math.round((coreCount / ownedCount) * 100) : 0;
    const topLangPct = totalProjects > 0 ? Math.round((topLangCount / totalProjects) * 100) : 0;

    return {
      latest,
      latestRepos,
      projectRepoSet,
      topProjects,
      caseProjects,
      timelineProjects,
      topLanguages,
      maxLangCount,
      totalProjects,
      activeThisQuarter,
      ownedCount,
      coreCount,
      topLangCount,
      topLangName,
      activePct,
      ownedPct,
      corePct,
      topLangPct,
    };
  }, [data?.projects]);

  const {
    latest,
    latestRepos,
    projectRepoSet,
    topProjects,
    caseProjects,
    timelineProjects,
    topLanguages,
    maxLangCount,
    totalProjects,
    activeThisQuarter,
    ownedCount,
    coreCount,
    topLangCount,
    activePct,
    ownedPct,
    corePct,
    topLangPct,
    topLangName,
  } = derivedData;

  const renderedLatestRepos = useMemo(() => {
    const nowMs = Date.now();
    return latestRepos.map((repo) => (
      <li className="live-item" key={`${repo.owner}/${repo.repository}`}>
        <strong>
          <Link className="repo-link" to={toProjectPath(repo.repository)}>
            {repo.repository}
          </Link>
        </strong>
        <span className="mono">{repo.description || "No description provided."}</span>
        <span className="mono">
          {repo.isFork ? "FORK / CONTRIBUTION" : "OWNED PROJECT"} | {repo.language || "Unknown"} | {repo.stars} stars | <time dateTime={repo.updatedAt} title={exactDateFormatter.format(Date.parse(repo.updatedAt))}>{ago(repo.updatedAt, nowMs)}</time>
        </span>
      </li>
    ));
  }, [latestRepos]);

  const renderedEvents = useMemo(() => {
    const nowMs = Date.now();
    return (data?.events ?? []).slice(0, 30).map((event, idx) => {
      const isOwnProject = projectRepoSet.has(event.repository);
      return (
        <li className="live-item" key={`${event.repository}-${event.createdAt}-${idx}`}>
          <strong>
            {isOwnProject ? (
              <Link className="repo-link" to={toProjectPath(extractRepositoryName(event.repository))}>
                {event.repository}
              </Link>
            ) : (
              <a className="repo-link" href={`https://github.com/${event.repository}`} target="_blank" rel="noreferrer" aria-label={`View ${event.repository} on GitHub`}>
                {event.repository}
              </a>
            )}
          </strong>
          <span className="mono">{eventLabel(event.type)}</span>
          <span className="mono"><time dateTime={event.createdAt} title={exactDateFormatter.format(Date.parse(event.createdAt))}>{ago(event.createdAt, nowMs)}</time></span>
        </li>
      );
    });
  }, [data?.events, projectRepoSet]);

  const dataUnavailable = !loading && (error != null || data == null);

  if (loading) {
    return (
      <main id="main-content" className="console" tabIndex={-1}>
        <p className="mono" role="status" aria-live="polite">
          Loading dashboard...
        </p>
      </main>
    );
  }

  return (
    <main id="main-content" className="console" tabIndex={-1}>
      <header className="header">
        <div className="header-brand">
          <Logo />
          <span>{displayName} / Portfolio</span>
        </div>
        <nav aria-label="Main Navigation">
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
            <a className="btn" href="#projects">Open Project Logs <span aria-hidden="true">↓</span></a>
            <a className="btn" href={githubUrl} target="_blank" rel="noreferrer" aria-label="Open GitHub profile">GitHub <span aria-hidden="true">↗</span></a>
            <a className="btn" href="https://www.linkedin.com/in/samet-ozkan" target="_blank" rel="noreferrer" aria-label="Open LinkedIn profile">LinkedIn <span aria-hidden="true">↗</span></a>
          </div>
          <div className="kpis">
            <div className="kpi"><b>{data?.kpi.ownedRepositories ?? "--"}</b><span className="mono">owned repositories</span></div>
            <div className="kpi"><b>{data?.kpi.mergedPRs ?? "--"}</b><span className="mono">merged prs</span></div>
            <div className="kpi"><b>{data?.profile.followers ?? "--"}</b><span className="mono">github followers</span></div>
            <div className="kpi"><b>{latest ? <time dateTime={latest} title={exactDateFormatter.format(Date.parse(latest))}>{ago(latest, Date.now())}</time> : "--"}</b><span className="mono">last push age</span></div>
          </div>
        </article>

        <aside className="panel">
          <div className="section-head">
            <h2>Activity Signals</h2>
            <span className="mono">Computed from GitHub data</span>
          </div>
          {dataUnavailable ? (
            <p className="mono" style={{ opacity: 0.5 }}>Activity data unavailable.</p>
          ) : (
            <>
              <div className="gauges">
                <div className="gauge">
                  <div className="gauge-label">Active this quarter</div>
                  <div className="gauge-val">{activeThisQuarter}<span>/{totalProjects}</span></div>
                  <div className="bar"><div className="fill" style={{ width: `${activePct}%` }} /></div>
                </div>
                <div className="gauge">
                  <div className="gauge-label">Owned ratio</div>
                  <div className="gauge-val">{ownedCount}<span>/{totalProjects}</span></div>
                  <div className="bar"><div className="fill fill-owned" style={{ width: `${ownedPct}%` }} /></div>
                </div>
                <div className="gauge">
                  <div className="gauge-label">Core focus</div>
                  <div className="gauge-val">{coreCount}<span>/{ownedCount}</span></div>
                  <div className="bar"><div className="fill fill-core" style={{ width: `${corePct}%` }} /></div>
                </div>
                <div className="gauge">
                  <div className="gauge-label">Top lang — {topLangName}</div>
                  <div className="gauge-val">{topLangCount}<span>/{totalProjects}</span></div>
                  <div className="bar"><div className="fill fill-lang" style={{ width: `${topLangPct}%` }} /></div>
                </div>
              </div>
              {(data?.contributionCalendar?.length ?? 0) > 0 && (
                <ContribHeatmap calendar={data!.contributionCalendar} />
              )}
            </>
          )}
        </aside>
      </section>

      <section className="panel" id="github-live">
        <div className="section-head">
          <h2>GitHub Live Feed</h2>
          <span className="mono">Public API synchronized</span>
        </div>
        {dataUnavailable ? (
          <p className="mono" style={{ opacity: 0.5 }}>Live feed unavailable — backend unreachable.</p>
        ) : (
          <div className="live-grid">
            <article className="live-box">
              <div className="section-head">
                <span className="mono">Latest repositories</span>
                <Link className="mono" to="/projects" aria-label="View all latest repositories">view all</Link>
              </div>
              <ul className="live-list">
                {renderedLatestRepos}
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
                <a className="mono" href={githubUrl} target="_blank" rel="noreferrer" aria-label="View GitHub profile">profile <span aria-hidden="true">↗</span></a>
              </div>
              <ul className="live-list">
                {renderedEvents}
              </ul>
            </article>
          </div>
        )}
      </section>

      <section className="projects" id="projects">
        <div className="projects-header">
          <div>#</div>
          <div>Project</div>
          <div>Purpose</div>
          <div>Stack</div>
          <div>Status</div>
        </div>
        {dataUnavailable ? (
          <div className="row"><span className="mono" style={{ opacity: 0.5 }}>Project data unavailable — backend unreachable.</span></div>
        ) : (
          <>
            <ol className="projects-list">
              {topProjects.map((project, idx) => (
                <li className="row" key={`${project.owner}/${project.repository}`}>
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
                    <div className="mono">{project.description || "No description"}</div>
                  </div>
                  <div className="mono">
                    {project.isFork ? "Contribution and PR workflow" : "Design and maintain reliable product workflows"}
                  </div>
                  <div className="mono">{project.language || "Unknown"}</div>
                  <span className={statusClass(project.category, project.isFork)}>
                    <Link to={toProjectPath(project.repository)} aria-label={`View details for ${project.repository}`}>{statusLabel(project.category, project.isFork)}</Link>
                  </span>
                </li>
              ))}
            </ol>
            <div className="projects-footer">
              <Link className="mono" to="/projects">
                View all {totalProjects} repositories <span aria-hidden="true">→</span>
              </Link>
            </div>
          </>
        )}
      </section>

      <section className="panel" id="cases">
        <div className="section-head">
          <h2>Case Files</h2>
          <span className="mono">Stack / Context / Outcome</span>
        </div>
        <div className="grid-3">
          {dataUnavailable ? (
            <article className="case">
              <h3>Unavailable</h3>
              <ul><li><span>Status</span>Backend unreachable — case data not loaded.</li></ul>
            </article>
          ) : caseProjects.length > 0 ? caseProjects.map((p) => (
            <article className="case" key={p.repository}>
              <h3>
                <Link to={toProjectPath(p.repository)} style={{ color: "inherit", textDecoration: "none" }}>
                  {p.repository}
                </Link>
                {p.latestRelease ? (
                  <span className="repo-version mono">{p.latestRelease}</span>
                ) : null}
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
          {dataUnavailable ? (
            <p className="mono" style={{ opacity: 0.5 }}>Timeline unavailable.</p>
          ) : timelineProjects.map((p) => (
            <div className="time-item" key={p.repository}>
              <span className="mono">
                <time dateTime={p.updatedAt} title={exactDateFormatter.format(Date.parse(p.updatedAt))}>
                  {toQuarter(p.updatedAt)}
                </time>
              </span>
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
          <a className="btn" href={githubUrl} target="_blank" rel="noreferrer" aria-label="Open GitHub profile">GitHub <span aria-hidden="true">↗</span></a>
          <a className="btn" href="https://www.linkedin.com/in/samet-ozkan" target="_blank" rel="noreferrer" aria-label="Open LinkedIn profile">LinkedIn <span aria-hidden="true">↗</span></a>
        </div>
      </section>
    </main>
  );
}
