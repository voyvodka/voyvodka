import { useState, useMemo } from "react";
import { Link, useLocation } from "react-router";

import { Logo } from "@/components/Logo";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import { homeCopy, localeFromPath } from "@/i18n/home";
import type { Locale } from "@/i18n/home";
import { extractRepositoryName, toProjectPath } from "@/lib/projectRoutes";
import type { ContributionDay, ProjectSummary } from "@/types/api";

const WEEKS_TO_SHOW = 30;

// Cache the formatters outside the component to avoid expensive
// re-instantiations of Intl.DateTimeFormat on every render and hover.
function formattersFor(intlLocale: string) {
  return {
    heatmap: new Intl.DateTimeFormat(intlLocale, { month: "short", day: "numeric", year: "numeric" }),
    exact: new Intl.DateTimeFormat(intlLocale, { year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric" }),
  };
}

const FORMATTERS: Record<Locale, ReturnType<typeof formattersFor>> = {
  en: formattersFor(homeCopy.en.intlLocale),
  tr: formattersFor(homeCopy.tr.intlLocale),
};

function ContribHeatmap({ calendar, locale }: { calendar: ContributionDay[]; locale: Locale }) {
  const t = homeCopy[locale];
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
      const label = FORMATTERS[locale].heatmap.format(Date.parse(date));
      return count === 0 ? t.contrib.none(label) : t.contrib.some(count, label);
    };

    return rawRecent.map((day) => ({
      date: day.date,
      count: day.count,
      level: level(day.count),
      label: fmt(day.date, day.count)
    }));
  }, [calendar, locale, t]);

  return (
    <div className="contrib-section">
      <div className="gauge-label" style={{ marginBottom: 8 }}>{t.contrib.title}</div>
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

function ago(time: number, nowMs: number, locale: Locale) {
  const ms = nowMs - time;
  const day = 1000 * 60 * 60 * 24;
  const hour = 1000 * 60 * 60;
  return homeCopy[locale].ago(Math.floor(ms / hour), Math.floor(ms / day));
}

function toQuarter(time: number) {
  const d = new Date(time);
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

function caseApproach(p: ProjectSummary, locale: Locale) {
  const t = homeCopy[locale];
  if (p.language === "C#") return t.approach.csharp;
  if (p.language === "Rust") return t.approach.rust;
  if (p.language === "Go") return t.approach.go;
  if (p.language === "Swift") return t.approach.swift;
  if (p.language === "TypeScript" || p.language === "JavaScript") return t.approach.typescript;
  return t.approach.other(p.language || t.cases.multiLanguage);
}

export function HomePage() {
  const { data, loading, error } = usePortfolioData();
  const locale = localeFromPath(useLocation().pathname);
  const t = homeCopy[locale];
  const exactDateFormatter = FORMATTERS[locale].exact;

  const displayName = data?.profile.name || data?.profile.username || t.portfolio;
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
    return latestRepos.map((repo) => {
      const time = Date.parse(repo.updatedAt);
      return (
        <li className="live-item" key={`${repo.owner}/${repo.repository}`}>
          <strong>
            <Link className="repo-link" lang="en" to={toProjectPath(repo.repository)}>
              {repo.repository}
            </Link>
          </strong>
          <span className="mono">{repo.description || t.noDescriptionProvided}</span>
          <span className="mono">
            {repo.isFork ? t.forkContribution : t.ownedProject} | {repo.language || t.unknown} | {repo.stars} {t.stars} | <time dateTime={repo.updatedAt} title={exactDateFormatter.format(time)}>{ago(time, nowMs, locale)}</time>
          </span>
        </li>
      );
    });
  }, [latestRepos, locale, t, exactDateFormatter]);

  const renderedEvents = useMemo(() => {
    const nowMs = Date.now();
    return (data?.events ?? []).slice(0, 30).map((event, idx) => {
      const isOwnProject = projectRepoSet.has(event.repository);
      const time = Date.parse(event.createdAt);
      return (
        <li className="live-item" key={`${event.repository}-${event.createdAt}-${idx}`}>
          <strong>
            {isOwnProject ? (
              <Link className="repo-link" lang="en" to={toProjectPath(extractRepositoryName(event.repository))} aria-label={t.feed.viewDetails(event.repository)}>
                {event.repository}
              </Link>
            ) : (
              <a className="repo-link" lang="en" href={`https://github.com/${event.repository}`} target="_blank" rel="noreferrer" aria-label={t.feed.viewOnGithub(event.repository)}>
                {event.repository}
              </a>
            )}
          </strong>
          <span className="mono">{t.event(event.type)}</span>
          <span className="mono"><time dateTime={event.createdAt} title={exactDateFormatter.format(time)}>{ago(time, nowMs, locale)}</time></span>
        </li>
      );
    });
  }, [data?.events, projectRepoSet, locale, t, exactDateFormatter]);

  const latestTime = useMemo(() => latest ? Date.parse(latest) : null, [latest]);

  const dataUnavailable = !loading && (error != null || data == null);

  if (loading) {
    return (
      <main id="main-content" className="console" tabIndex={-1}>
        <p className="mono" role="status" aria-live="polite">
          {t.loading}
        </p>
      </main>
    );
  }

  return (
    <main id="main-content" className="console" tabIndex={-1}>
      <header className="header">
        <div className="header-brand">
          <Logo />
          <span>{displayName} / {t.portfolio}</span>
        </div>
        <nav aria-label={t.nav.navLabel}>
          <a href="#projects">{t.nav.projects}</a>
          <a href="#cases">{t.nav.cases}</a>
          <a href="#timeline">{t.nav.timeline}</a>
          <a href="#contact">{t.nav.contact}</a>
          {/* A full page load, not a router Link, so <html lang> is the server's for the new page. */}
          <a href={t.switchLang.href} hrefLang={t.switchLang.hrefLang} lang={t.switchLang.hrefLang} aria-label={t.switchLang.aria}>{t.switchLang.label}</a>
        </nav>
      </header>

      <section className="layout">
        <article className="panel">
          <div className="mono">MODE: DATA-PHYSICAL</div>
          <h1>
            <span className="hero-name">Samet Özkan</span>{" "}
            {t.heroTagline}
          </h1>
          <p className="hero-text">
            {t.heroText}
          </p>
          <div className="hero-actions">
            <a className="btn" href="#projects">{t.openProjectLogs} <span aria-hidden="true">↓</span></a>
            <a className="btn" href={githubUrl} target="_blank" rel="me noreferrer" lang="en" aria-label={t.openGithub}>GitHub <span aria-hidden="true">↗</span></a>
            <a className="btn" href="https://www.linkedin.com/in/samet-ozkan" target="_blank" rel="me noreferrer" lang="en" aria-label={t.openLinkedin}>LinkedIn <span aria-hidden="true">↗</span></a>
          </div>
          <div className="kpis">
            <div className="kpi"><b>{data?.kpi.ownedRepositories ?? "--"}</b><span className="mono">{t.kpi.owned}</span></div>
            <div className="kpi"><b>{data?.kpi.mergedPRs ?? "--"}</b><span className="mono">{t.kpi.mergedPrs}</span></div>
            <div className="kpi"><b>{data?.profile.followers ?? "--"}</b><span className="mono">{t.kpi.followers}</span></div>
            <div className="kpi"><b>{latest && latestTime ? <time dateTime={latest} title={exactDateFormatter.format(latestTime)}>{ago(latestTime, Date.now(), locale)}</time> : "--"}</b><span className="mono">{t.kpi.lastPush}</span></div>
          </div>
        </article>

        <aside className="panel">
          <div className="section-head">
            <h2>{t.activity.title}</h2>
            <span className="mono">{t.activity.sub}</span>
          </div>
          {dataUnavailable ? (
            <p className="mono" style={{ opacity: 0.5 }}>{t.activity.unavailable}</p>
          ) : (
            <>
              <div className="gauges">
                <div className="gauge" role="meter" aria-label={t.gauge.active} aria-valuenow={activeThisQuarter} aria-valuemin={0} aria-valuemax={totalProjects} aria-valuetext={t.gauge.outOf(activeThisQuarter, totalProjects)}>
                  <div className="gauge-label" aria-hidden="true">{t.gauge.active}</div>
                  <div className="gauge-val" aria-hidden="true">{activeThisQuarter}<span>/{totalProjects}</span></div>
                  <div className="bar" aria-hidden="true"><div className="fill" style={{ width: `${activePct}%` }} /></div>
                </div>
                <div className="gauge" role="meter" aria-label={t.gauge.owned} aria-valuenow={ownedCount} aria-valuemin={0} aria-valuemax={totalProjects} aria-valuetext={t.gauge.outOf(ownedCount, totalProjects)}>
                  <div className="gauge-label" aria-hidden="true">{t.gauge.owned}</div>
                  <div className="gauge-val" aria-hidden="true">{ownedCount}<span>/{totalProjects}</span></div>
                  <div className="bar" aria-hidden="true"><div className="fill fill-owned" style={{ width: `${ownedPct}%` }} /></div>
                </div>
                <div className="gauge" role="meter" aria-label={t.gauge.core} aria-valuenow={coreCount} aria-valuemin={0} aria-valuemax={ownedCount} aria-valuetext={t.gauge.outOf(coreCount, ownedCount)}>
                  <div className="gauge-label" aria-hidden="true">{t.gauge.core}</div>
                  <div className="gauge-val" aria-hidden="true">{coreCount}<span>/{ownedCount}</span></div>
                  <div className="bar" aria-hidden="true"><div className="fill fill-core" style={{ width: `${corePct}%` }} /></div>
                </div>
                <div className="gauge" role="meter" aria-label={`${t.gauge.topLang} — ${topLangName}`} aria-valuenow={topLangCount} aria-valuemin={0} aria-valuemax={totalProjects} aria-valuetext={t.gauge.outOf(topLangCount, totalProjects)}>
                  <div className="gauge-label" aria-hidden="true">{t.gauge.topLang} — <span lang="en">{topLangName}</span></div>
                  <div className="gauge-val" aria-hidden="true">{topLangCount}<span>/{totalProjects}</span></div>
                  <div className="bar" aria-hidden="true"><div className="fill fill-lang" style={{ width: `${topLangPct}%` }} /></div>
                </div>
              </div>
              {(data?.contributionCalendar?.length ?? 0) > 0 && (
                <ContribHeatmap calendar={data!.contributionCalendar} locale={locale} />
              )}
            </>
          )}
        </aside>
      </section>

      <section className="panel" id="github-live">
        <div className="section-head">
          <h2><span lang="en">GitHub</span> {t.feed.titleAfterGithub}</h2>
          <span className="mono">{t.feed.sub}</span>
        </div>
        {dataUnavailable ? (
          <p className="mono" style={{ opacity: 0.5 }}>{t.feed.unavailable}</p>
        ) : (
          <div className="live-grid">
            <article className="live-box">
              <div className="section-head">
                <span className="mono">{t.feed.latestRepos}</span>
                <Link className="mono" to="/projects" aria-label={t.feed.viewAllAria}>{t.feed.viewAll} <span aria-hidden="true">→</span></Link>
              </div>
              <ul className="live-list">
                {renderedLatestRepos}
              </ul>
              <ul className="lang-bars">
                {topLanguages.map(([lang, count]) => {
                  const pct = Math.round((count / maxLangCount) * 100);
                  return (
                    <li key={lang}>
                      <span aria-hidden="true">{lang}</span>
                      <div
                        className="lang-track"
                        role="meter"
                        aria-label={t.feed.repoCountAria(lang)}
                        aria-valuenow={count}
                        aria-valuemin={0}
                        aria-valuemax={maxLangCount}
                        aria-valuetext={t.feed.repoCount(count)}
                      >
                        <div className="lang-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span aria-hidden="true">{count} repo</span>
                    </li>
                  );
                })}
              </ul>
            </article>

            <article className="live-box">
              <div className="section-head">
                <span className="mono">{t.feed.recentEvents}</span>
                <a className="mono" href={githubUrl} target="_blank" rel="noreferrer" aria-label={t.feed.profileAria}>{t.feed.profile} <span aria-hidden="true">↗</span></a>
              </div>
              <ul className="live-list">
                {renderedEvents}
              </ul>
            </article>
          </div>
        )}
      </section>

      <section className="projects" id="projects" tabIndex={-1}>
        <div className="projects-header" aria-hidden="true">
          <div>#</div>
          <div>{t.projectsHeader.project}</div>
          <div>{t.projectsHeader.purpose}</div>
          <div>{t.projectsHeader.stack}</div>
          <div>{t.projectsHeader.status}</div>
        </div>
        {dataUnavailable ? (
          <div className="row"><span className="mono" style={{ opacity: 0.5 }}>{t.projectsUnavailable}</span></div>
        ) : (
          <>
            <ol className="projects-list">
              {topProjects.map((project, idx) => (
                <li className="row" key={`${project.owner}/${project.repository}`}>
                  <span className="mono">{String(idx + 1).padStart(2, "0")}</span>
                  <div>
                    <b>
                      <Link className="repo-link" lang="en" to={toProjectPath(project.repository)}>
                        {project.repository}
                      </Link>
                      {project.latestRelease ? (
                        <span className="repo-version mono">{project.latestRelease}</span>
                      ) : null}
                    </b>
                    <div className="mono">{project.description || t.noDescription}</div>
                  </div>
                  <div className="mono">
                    {project.isFork ? t.purposeFork : t.purposeOwned}
                  </div>
                  <div className="mono">{project.language || t.unknown}</div>
                  <span className={statusClass(project.category, project.isFork)}>
                    <Link to={toProjectPath(project.repository)} aria-label={`${statusLabel(project.category, project.isFork)}: ${t.feed.viewDetails(project.repository)}`}>{statusLabel(project.category, project.isFork)}</Link>
                  </span>
                </li>
              ))}
            </ol>
            <div className="projects-footer">
              <Link className="mono" to="/projects">
                {t.viewAllRepos(totalProjects)} <span aria-hidden="true">→</span>
              </Link>
            </div>
          </>
        )}
      </section>

      <section className="panel" id="cases" tabIndex={-1}>
        <div className="section-head">
          <h2>{t.cases.title}</h2>
          <span className="mono">{t.cases.sub}</span>
        </div>
        <div className="grid-3">
          {dataUnavailable ? (
            <article className="case">
              <h3>{t.cases.unavailableTitle}</h3>
              <ul><li><span>{t.cases.status}</span>{t.cases.unavailableBody}</li></ul>
            </article>
          ) : caseProjects.length > 0 ? caseProjects.map((p) => (
            <article className="case" key={p.repository}>
              <h3>
                <Link to={toProjectPath(p.repository)} lang="en" style={{ color: "inherit", textDecoration: "none" }}>
                  {p.repository}
                </Link>
                {p.latestRelease ? (
                  <span className="repo-version mono">{p.latestRelease}</span>
                ) : null}
              </h3>
              <ul>
                <li><span>{t.cases.stack}</span>{p.language || t.cases.multiLanguage}</li>
                <li><span>{t.cases.context}</span>{p.description || t.cases.contextFallback}</li>
                <li><span>{t.cases.approach}</span>{caseApproach(p, locale)}</li>
              </ul>
            </article>
          )) : (
            <article className="case">
              <h3>{t.cases.emptyTitle}</h3>
              <ul><li><span>{t.cases.status}</span>{t.cases.emptyBody}</li></ul>
            </article>
          )}
        </div>
      </section>

      <section className="grid-2" id="timeline" tabIndex={-1}>
        <article className="timeline">
          <div className="section-head">
            <h2>{t.timeline.title}</h2>
            <span className="mono">{t.timeline.sub}</span>
          </div>
          {dataUnavailable ? (
            <p className="mono" style={{ opacity: 0.5 }}>{t.timeline.unavailable}</p>
          ) : timelineProjects.map((p) => {
            const updatedTime = Date.parse(p.updatedAt);
            return (
            <div className="time-item" key={p.repository}>
              <span className="mono"><time dateTime={p.updatedAt} title={exactDateFormatter.format(updatedTime)}>{toQuarter(updatedTime)}</time></span>
              <div>
                <strong>
                  <Link className="repo-link" lang="en" to={toProjectPath(p.repository)}>{p.repository}</Link>
                </strong>
                <div className="mono">{p.description || t.timeline.fallback}</div>
              </div>
            </div>
            );
          })}
        </article>

        <article className="stack-matrix">
          <div className="section-head">
            <h2>{t.stack.title}</h2>
            <span className="mono">{t.stack.sub}</span>
          </div>
          <div className="stack-row"><span className="mono">{t.stack.primary}</span><div className="chips"><span className="chip">.NET Core</span><span className="chip">ASP.NET MVC</span><span className="chip">C#</span><span className="chip">REST APIs</span><span className="chip">EF Core</span></div></div>
          <div className="stack-row"><span className="mono">{t.stack.backendOps}</span><div className="chips"><span className="chip">SQL Server</span><span className="chip">SQLite</span><span className="chip">Redis</span><span className="chip">Caching</span><span className="chip">Service Layers</span></div></div>
          <div className="stack-row"><span className="mono">{t.stack.systems}</span><div className="chips"><span className="chip">Go</span><span className="chip">Rust</span><span className="chip">Tauri</span></div></div>
          <div className="stack-row"><span className="mono">{t.stack.fullStack}</span><div className="chips"><span className="chip">Razor</span><span className="chip">MVC Views</span><span className="chip">JavaScript</span><span className="chip">jQuery</span></div></div>
          <div className="stack-row"><span className="mono">{t.stack.frontend}</span><div className="chips"><span className="chip">React</span><span className="chip">TypeScript</span><span className="chip">Vite</span></div></div>
          <div className="stack-row"><span className="mono">{t.stack.deployOps}</span><div className="chips"><span className="chip">Docker</span><span className="chip">Linux</span><span className="chip">Coolify</span><span className="chip">Git</span><span className="chip">Self-hosted</span></div></div>
        </article>
      </section>

      <section className="notes">
        <div className="section-head">
          <h2>{t.notes.title}</h2>
          <span className="mono">{t.notes.sub}</span>
        </div>
        {t.notes.items.map((note) => (
          <article className="note" key={note.title}>
            <b>{note.title}</b>
            <span className="mono">{note.body}</span>
          </article>
        ))}
      </section>

      <section className="contact" id="contact" tabIndex={-1}>
        <div>
          <strong>{t.contact.title}</strong>
          <div className="mono">{t.contact.body}</div>
        </div>
        <div className="hero-actions">
          <a className="btn" href={githubUrl} target="_blank" rel="me noreferrer" lang="en" aria-label={t.openGithub}>GitHub <span aria-hidden="true">↗</span></a>
          <a className="btn" href="https://www.linkedin.com/in/samet-ozkan" target="_blank" rel="me noreferrer" lang="en" aria-label={t.openLinkedin}>LinkedIn <span aria-hidden="true">↗</span></a>
        </div>
      </section>
    </main>
  );
}
