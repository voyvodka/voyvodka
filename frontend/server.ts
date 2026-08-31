import fs from "node:fs";
import path from "node:path";
import { Transform } from "node:stream";
import { fileURLToPath } from "node:url";
import express from "express";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";
import type { ViteDevServer } from "vite";

import type { SSRData } from "./src/context/DataContext";
import type { ProjectDetail, ProjectSummary, PortfolioData } from "./src/types/api";
import type { PageMeta } from "./src/lib/meta";
import { renderOg, type OgTemplateInput } from "./og/render";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env["NODE_ENV"] === "production";
const port = Number(process.env["PORT"] ?? 3000);
const API_BASE_URL = process.env["API_BASE_URL"] ?? "http://localhost:8081";

const SSR_FETCH_TIMEOUT_MS = 8000;
const PROXY_FETCH_TIMEOUT_MS = 10000;

type RenderFn = (
  url: string,
  data: SSRData,
  callbacks: {
    onShellReady: () => void;
    onShellError: (err: unknown) => void;
    onError: (err: unknown) => void;
  },
) => { pipe: (dest: Transform) => Transform };

type GetPageMetaFn = (
  pathname: string,
  portfolio?: SSRData["portfolioData"],
  detail?: SSRData["projectDetail"],
) => PageMeta;

marked.setOptions({ async: false });

// C10: demote README headings by one level so page-owned <h1>owner/repo</h1>
// stays the only h1 on detail pages. h1→h2, h2→h3, ..., h5→h6, h6 clamped.
marked.use({
  renderer: {
    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens);
      const target = Math.min(depth + 1, 6);
      return `<h${target}>${text}</h${target}>\n`;
    },
  },
});

// marked's heading renderer only touches markdown heading tokens, not raw HTML
// blocks. READMEs often embed `<h1 align="center">…</h1>` which would leak a
// second h1 into the detail DOM and break the owner/repo h1 uniqueness. Demote
// raw headings in the input. Bottom-up order prevents cascading demotions.
function demoteRawHeadings(markdown: string): string {
  return markdown
    .replace(/<h5(\b[^>]*)>/gi, "<h6$1>").replace(/<\/h5>/gi, "</h6>")
    .replace(/<h4(\b[^>]*)>/gi, "<h5$1>").replace(/<\/h4>/gi, "</h5>")
    .replace(/<h3(\b[^>]*)>/gi, "<h4$1>").replace(/<\/h3>/gi, "</h4>")
    .replace(/<h2(\b[^>]*)>/gi, "<h3$1>").replace(/<\/h2>/gi, "</h3>")
    .replace(/<h1(\b[^>]*)>/gi, "<h2$1>").replace(/<\/h1>/gi, "</h2>");
}

type RepoCtx = { owner: string; repo: string; branch: string };

// READMEs reference screenshots with repo-relative paths like `./assets/x.png`
// or `assets/x.png`. They render on github.com because GitHub resolves them
// against the repo, but on this site they 404. Rewrite <img src> to absolute
// raw.githubusercontent.com URLs after sanitization.
function resolveRepoRelativeUrl(src: string, base: string): string {
  const trimmed = src.trim();
  if (!trimmed) return src;
  if (/^(https?:|data:|mailto:|#)/i.test(trimmed)) return src;
  if (trimmed.startsWith("//")) return src;
  if (trimmed.startsWith("/")) return base + trimmed.slice(1);
  if (trimmed.startsWith("./")) return base + trimmed.slice(2);
  return base + trimmed;
}

function rewriteRelativeImageSrc(html: string, ctx: RepoCtx): string {
  if (!ctx.owner || !ctx.repo) return html;
  const base = `https://raw.githubusercontent.com/${ctx.owner}/${ctx.repo}/${ctx.branch || "HEAD"}/`;
  return html.replace(/<img\b[^>]*>/gi, (tag) =>
    tag.replace(/\bsrc=(["'])([^"']+)\1/i, (_full, quote: string, src: string) => {
      const rewritten = resolveRepoRelativeUrl(src, base);
      return `src=${quote}${rewritten}${quote}`;
    }),
  );
}

function renderMarkdown(raw: string, ctx?: RepoCtx): string {
  if (!raw) return "";
  const html = marked.parse(demoteRawHeadings(raw)) as string;
  const sanitized = DOMPurify.sanitize(html);
  return ctx ? rewriteRelativeImageSrc(sanitized, ctx) : sanitized;
}

function enrichProjectDetail(detail: ProjectDetail): ProjectDetail {
  const ctx: RepoCtx = {
    owner: detail.owner,
    repo: detail.repository,
    branch: detail.defaultBranch || "HEAD",
  };
  return {
    ...detail,
    readmeHtml: renderMarkdown(detail.readme ?? "", ctx),
    changelogHtml: renderMarkdown(detail.changelog ?? "", ctx),
    releases: (detail.releases ?? []).map((release) => ({
      ...release,
      bodyHtml: renderMarkdown(release.body ?? "", ctx),
    })),
  };
}

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(SSR_FETCH_TIMEOUT_MS) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

const REACT_REFRESH_PREAMBLE = `<script type="module">
import RefreshRuntime from '/@react-refresh'
RefreshRuntime.injectIntoGlobalHook(window)
window.$RefreshReg$ = () => {}
window.$RefreshSig$ = () => () => {}
window.__vite_plugin_react_preamble_installed__ = true
</script>`;

const _cnamePath = path.join(__dirname, "public/CNAME");
const _cnameHost = fs.existsSync(_cnamePath) ? fs.readFileSync(_cnamePath, "utf-8").trim() : "";
const SITE_URL =
  process.env["SITE_URL"] ||
  (_cnameHost ? `https://${_cnameHost}` : "http://localhost:3000");

// IndexNow — Bing / Yandex / Seznam push-indexing. Key file lives at /<key>.txt.
// Enabled automatically in prod; can be overridden via INDEXNOW_KEY env.
const INDEXNOW_KEY =
  process.env["INDEXNOW_KEY"] ||
  "500d876fc5ccdb101ee8b881cfbec1d8e13ec187618e8693684beef7a4f229fc";

// Site launch date. Fixed on purpose: the landing and /projects schemas are
// evergreen pages, so datePublished must not follow the cache-refresh clock.
const SITE_PUBLISHED_AT = "2026-03-23T00:00:00Z";
const INDEXNOW_MIN_INTERVAL_MS = 10 * 60 * 1000;
let lastIndexNowPingAt = 0;
let lastIndexNowSignature = "";

async function pingIndexNow(hostname: string, urls: string[], signature: string): Promise<void> {
  if (!isProd) return;
  if (!INDEXNOW_KEY || urls.length === 0) return;
  if (signature === lastIndexNowSignature) return;
  const now = Date.now();
  if (now - lastIndexNowPingAt < INDEXNOW_MIN_INTERVAL_MS) return;
  lastIndexNowPingAt = now;
  lastIndexNowSignature = signature;
  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: hostname,
        key: INDEXNOW_KEY,
        keyLocation: `https://${hostname}/${INDEXNOW_KEY}.txt`,
        urlList: urls.slice(0, 10000),
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.warn(`IndexNow ping ${res.status}`);
  } catch (err) {
    console.warn("IndexNow ping failed:", err);
  }
}

// A bare "Go" or "Rust" in a schema is ambiguous. Pairing each name with a
// canonical URL is what lets a consumer resolve it to the right entity — all
// targets verified 200 on 2026-08-14.
const TECH_ENTITY_URLS: Record<string, string> = {
  ".NET Core": "https://en.wikipedia.org/wiki/.NET",
  "C#": "https://en.wikipedia.org/wiki/C_Sharp_(programming_language)",
  "ASP.NET": "https://en.wikipedia.org/wiki/ASP.NET",
  "REST APIs": "https://en.wikipedia.org/wiki/REST",
  "EF Core": "https://en.wikipedia.org/wiki/Entity_Framework",
  "Go": "https://en.wikipedia.org/wiki/Go_(programming_language)",
  "Rust": "https://en.wikipedia.org/wiki/Rust_(programming_language)",
  "TypeScript": "https://en.wikipedia.org/wiki/TypeScript",
  "JavaScript": "https://en.wikipedia.org/wiki/JavaScript",
  "Python": "https://en.wikipedia.org/wiki/Python_(programming_language)",
  "Java": "https://en.wikipedia.org/wiki/Java_(programming_language)",
  "C++": "https://en.wikipedia.org/wiki/C%2B%2B",
  "HTML": "https://en.wikipedia.org/wiki/HTML",
  "CSS": "https://en.wikipedia.org/wiki/CSS",
  "Shell": "https://en.wikipedia.org/wiki/Shell_script",
  "Docker": "https://en.wikipedia.org/wiki/Docker_(software)",
  "SQLite": "https://en.wikipedia.org/wiki/SQLite",
};

// Unknown names still get an entity, just without a sameAs — a guessed URL is
// worse than none, since a wrong sameAs asserts the wrong identity.
function techEntity(name: string) {
  const sameAs = TECH_ENTITY_URLS[name];
  return {
    "@type": "Thing",
    "name": name,
    ...(sameAs ? { "sameAs": sameAs } : {}),
  };
}

function generateJsonLd(pathname: string, ssrData: SSRData): string {
  const schemas: object[] = [];
  const portfolioUpdatedAt = ssrData.portfolioData?.updatedAt;
  const homeOgImage = `${SITE_URL}/og/home.png`;
  const projectsOgImage = `${SITE_URL}/og/projects.png`;

  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${SITE_URL}/#person`,
    "name": ssrData.portfolioData?.profile.name || "Samet Özkan",
    "jobTitle": "Backend Engineer",
    "url": SITE_URL,
    "image": homeOgImage,
    "sameAs": [
      `https://github.com/${ssrData.portfolioData?.profile.username || "voyvodka"}`,
      "https://www.linkedin.com/in/samet-ozkan",
      "https://x.com/voyvodka",
    ],
    "knowsAbout": [".NET Core", "C#", "ASP.NET", "REST APIs", "EF Core", "Go", "Rust", "TypeScript", "Docker", "SQLite"],
  };

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    "name": "Samet Özkan",
    "url": SITE_URL,
    "logo": {
      "@type": "ImageObject",
      "url": `${SITE_URL}/brand/logo-D1.png`,
      "contentUrl": `${SITE_URL}/brand/logo-D1.png`,
      "width": 512,
      "height": 512,
    },
    "image": homeOgImage,
    "sameAs": [
      `https://github.com/${ssrData.portfolioData?.profile.username || "voyvodka"}`,
      "https://www.linkedin.com/in/samet-ozkan",
      "https://x.com/voyvodka",
    ],
    "founder": { "@id": `${SITE_URL}/#person` },
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    "url": SITE_URL,
    "name": "Samet Özkan — Portfolio",
    "description": "Portfolio of Samet Özkan — Backend engineer focused on .NET Core, clean service architecture, and reliable shipping cadence.",
    "inLanguage": "en",
    "publisher": { "@id": `${SITE_URL}/#person` },
    "about": { "@id": `${SITE_URL}/#person` },
  };

  if (pathname === "/") {
    schemas.push(person);
    schemas.push(organization);
    schemas.push(website);

    const articleDates = {
      "datePublished": SITE_PUBLISHED_AT,
      ...(portfolioUpdatedAt ? { "dateModified": portfolioUpdatedAt } : {}),
    };

    schemas.push({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Samet Özkan — Software Engineer Portfolio & Projects",
      "description": "Samet Özkan — .NET backend engineer. Clean service architecture, REST APIs, and reliable delivery. Portfolio of projects, contributions, and build history.",
      "author": { "@id": `${SITE_URL}/#person` },
      "publisher": { "@id": `${SITE_URL}/#organization` },
      "image": homeOgImage,
      "url": SITE_URL,
      "mainEntityOfPage": SITE_URL,
      "about": { "@id": `${SITE_URL}/#person` },
      "mentions": person.knowsAbout.map(techEntity),
      ...articleDates,
    });

    if ((ssrData.portfolioData?.projects?.length ?? 0) > 0) {
      schemas.push({
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Projects by Samet Özkan",
        "description": "Open source projects and contributions by Samet Özkan, .NET backend engineer.",
        "url": `${SITE_URL}/projects`,
        "itemListElement": ssrData.portfolioData!.projects.slice(0, 10).map((project, idx) => ({
          "@type": "ListItem",
          "position": idx + 1,
          "name": project.repository,
          ...(project.description ? { "description": project.description } : {}),
          "url": `${SITE_URL}/projects/${toSlug(project.repository)}`,
          ...(project.updatedAt ? { "datePublished": project.updatedAt } : {}),
        })),
      });
    }

  } else if (pathname === "/projects") {
    schemas.push(person);
    schemas.push(organization);
    schemas.push(website);

    schemas.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL },
        { "@type": "ListItem", "position": 2, "name": "All Repositories", "item": `${SITE_URL}/projects` },
      ],
    });

    const projectsArticleDates = {
      "datePublished": SITE_PUBLISHED_AT,
      ...(portfolioUpdatedAt ? { "dateModified": portfolioUpdatedAt } : {}),
    };

    // Repos with no detected language come back as "", which must not become
    // an empty-named entity.
    const projectLanguages = [
      ...new Set((ssrData.portfolioData?.projects ?? []).map((p) => p.language).filter(Boolean)),
    ].sort();

    schemas.push({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "All Repositories — Samet Özkan | Projects & Contributions",
      "description": "Complete list of open source projects and contributions by Samet Özkan, .NET backend engineer.",
      "author": { "@id": `${SITE_URL}/#person` },
      "publisher": { "@id": `${SITE_URL}/#organization` },
      "image": projectsOgImage,
      "url": `${SITE_URL}/projects`,
      "mainEntityOfPage": `${SITE_URL}/projects`,
      "about": { "@id": `${SITE_URL}/#person` },
      ...(projectLanguages.length > 0 ? { "mentions": projectLanguages.map(techEntity) } : {}),
      ...projectsArticleDates,
    });

    if ((ssrData.portfolioData?.projects?.length ?? 0) > 0) {
      schemas.push({
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "All Repositories by Samet Özkan",
        "description": `${ssrData.portfolioData!.projects.length} repositories — projects and contributions by Samet Özkan.`,
        "url": `${SITE_URL}/projects`,
        "itemListElement": ssrData.portfolioData!.projects.map((project, idx) => ({
          "@type": "ListItem",
          "position": idx + 1,
          "name": project.repository,
          ...(project.description ? { "description": project.description } : {}),
          "url": `${SITE_URL}/projects/${toSlug(project.repository)}`,
          ...(project.updatedAt ? { "datePublished": project.updatedAt } : {}),
        })),
      });
    }

  } else if (pathname.startsWith("/projects/") && ssrData.projectDetail) {
    const detail = ssrData.projectDetail;
    const detailUrl = `${SITE_URL}${pathname}`;
    const detailOgImage = `${SITE_URL}/og/${toSlug(detail.repository)}.png`;
    const repoUrl = detail.repoUrl || `https://github.com/${detail.owner}/${detail.repository}`;
    const firstRelease = detail.releases && detail.releases.length > 0 ? detail.releases[detail.releases.length - 1] : null;
    // Don't fall back to portfolioUpdatedAt — it's the cache-refresh time
    // and would rotate the date on every backend sync.
    const datePublished = firstRelease?.publishedAt || detail.pushedAt || detail.updatedAt;
    const dateModified = detail.pushedAt || detail.updatedAt;
    // Fallback description for repos without an upstream GitHub description.
    // Language-aware so the schema/FAQ text remains entity-dense for LLMs.
    const langLabel = detail.language ? `${detail.language} ` : "";
    const fallbackDesc = `A ${langLabel}project by Samet Özkan — ${detail.repository}.`;
    schemas.push(person);
    schemas.push(organization);

    schemas.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL },
        { "@type": "ListItem", "position": 2, "name": "All Repositories", "item": `${SITE_URL}/projects` },
        { "@type": "ListItem", "position": 3, "name": `${detail.owner}/${detail.repository}`, "item": detailUrl },
      ],
    });

    schemas.push({
      "@context": "https://schema.org",
      "@type": "SoftwareSourceCode",
      "@id": `${detailUrl}#code`,
      "name": detail.repository,
      "headline": `${detail.owner}/${detail.repository}`,
      "description": detail.description || fallbackDesc,
      "author": { "@id": `${SITE_URL}/#person` },
      "codeRepository": repoUrl,
      "url": detailUrl,
      "image": detailOgImage,
      ...(detail.language ? { "programmingLanguage": detail.language } : {}),
      ...(detail.license ? { "license": detail.license } : {}),
      ...(detail.topics && detail.topics.length > 0 ? { "keywords": detail.topics.join(", ") } : {}),
      ...(datePublished ? { "datePublished": datePublished } : {}),
      ...(dateModified ? { "dateModified": dateModified } : {}),
    });

    schemas.push({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": `${detail.owner}/${detail.repository} — Samet Özkan`,
      "description": detail.description || fallbackDesc,
      "author": { "@id": `${SITE_URL}/#person` },
      "publisher": { "@id": `${SITE_URL}/#organization` },
      "image": detailOgImage,
      "url": detailUrl,
      "mainEntityOfPage": detailUrl,
      // The page is about the code, not about its author — point `about` at the
      // SoftwareSourceCode emitted just above rather than at the Person.
      "about": { "@id": `${detailUrl}#code` },
      ...(detail.language ? { "mentions": [techEntity(detail.language)] } : {}),
      ...(datePublished ? { "datePublished": datePublished } : {}),
      ...(dateModified ? { "dateModified": dateModified } : {}),
    });

    // Only emit ItemList for releases with real publishedAt. Forked repos
    // sometimes carry release objects with empty publishedAt — keeping them
    // would leave schema items without datePublished, which is low-quality
    // for AEO/GEO. DOM rendering already hides the <time> for those.
    const publishedReleases = (detail.releases ?? []).filter((r) => r.publishedAt);
    if (publishedReleases.length > 0) {
      schemas.push({
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": `Releases for ${detail.repository}`,
        "description": `${publishedReleases.length} release${publishedReleases.length !== 1 ? "s" : ""} for ${detail.owner}/${detail.repository}.`,
        "url": detailUrl,
        "itemListElement": publishedReleases.slice(0, 10).map((release, idx) => ({
          "@type": "ListItem",
          "position": idx + 1,
          "name": release.name || release.tagName,
          "url": release.url,
          "datePublished": release.publishedAt,
        })),
      });
    }

  }

  if (schemas.length === 0) return "";
  return schemas
    .map((s) => `<script type="application/ld+json">\n${JSON.stringify(s, null, 2).replace(/</g, "\\u003c")}\n</script>`)
    .join("\n    ");
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildHead(meta: PageMeta, cssLinks: string, devMode: boolean, jsonLd = "", canonicalUrl = ""): string {
  const ogTitle = escapeAttr(meta.ogTitle ?? meta.title);
  const ogDescription = escapeAttr(meta.ogDescription ?? meta.description);
  const ogImage = meta.ogImage ?? `${SITE_URL}/og/home.png`;
  const ogType = meta.ogType ?? "website";
  const ogUrl = canonicalUrl || SITE_URL;
  const siteName = "Samet Özkan";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeAttr(meta.title)}</title>
    <meta name="description" content="${escapeAttr(meta.description)}" />
    <meta name="robots" content="index, follow" />
    <meta name="author" content="Samet Özkan" />
    <meta name="theme-color" content="#101417" />
    <meta name="color-scheme" content="dark" />
    <meta name="application-name" content="${siteName}" />
    <meta name="apple-mobile-web-app-title" content="${siteName}" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="format-detection" content="telephone=no" />
    ${canonicalUrl ? `<link rel="canonical" href="${escapeAttr(canonicalUrl)}" />` : ""}
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="apple-touch-icon" href="/favicon.svg" />
    <link rel="mask-icon" href="/favicon.svg" color="#75a8ff" />
    <link rel="author" href="/humans.txt" />
    <meta property="og:type" content="${escapeAttr(ogType)}" />
    <meta property="og:site_name" content="${siteName}" />
    <meta property="og:title" content="${ogTitle}" />
    <meta property="og:description" content="${ogDescription}" />
    <meta property="og:url" content="${escapeAttr(ogUrl)}" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:image" content="${escapeAttr(ogImage)}" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${ogTitle}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@voyvodka" />
    <meta name="twitter:creator" content="@voyvodka" />
    <meta name="twitter:title" content="${ogTitle}" />
    <meta name="twitter:description" content="${ogDescription}" />
    <meta name="twitter:image" content="${escapeAttr(ogImage)}" />
    <meta name="twitter:image:alt" content="${ogTitle}" />
    <link rel="preload" href="/fonts/rajdhani-500.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="preload" href="/fonts/rajdhani-700.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="preload" href="/fonts/space-mono-400.woff2" as="font" type="font/woff2" crossorigin />
    ${devMode ? `<link rel="stylesheet" href="/src/styles.css" />` : cssLinks}
    ${devMode ? REACT_REFRESH_PREAMBLE : ""}
    ${jsonLd}
  </head>
  <body>
    <div id="root">`;
}

type ProdAssets = { cssLinks: string; scriptTag: string };

function getProdAssets(): ProdAssets {
  const manifestPath = path.join(__dirname, "dist/client/.vite/manifest.json");
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as Record<
      string,
      { file: string; css?: string[]; isEntry?: boolean }
    >;
    const cssHrefs: string[] = [];
    let scriptTag = "";
    for (const chunk of Object.values(manifest)) {
      if (chunk.isEntry) {
        if (chunk.css) {
          cssHrefs.push(...chunk.css.map((c) => `<link rel="stylesheet" href="/${c}" />`));
        }
        scriptTag = `<script type="module" src="/${chunk.file}"></script>`;
      }
    }
    return { cssLinks: cssHrefs.join("\n    "), scriptTag };
  } catch {
    return { cssLinks: "", scriptTag: "" };
  }
}

function toSlug(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function sendStatusPage(
  res: express.Response,
  status: 404 | 410,
  heading: string,
  body: string,
): void {
  const title = status === 410 ? "Gone — Samet Özkan" : "Not Found — Samet Özkan";
  res.status(status);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
  res.end(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>${escapeAttr(title)}</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: ui-monospace, "Space Mono", SFMono-Regular, Menlo, monospace;
        background: #101417;
        color: #e6e9ee;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }
      header {
        padding: 1.25rem 2rem;
        border-bottom: 1px solid #1d2329;
      }
      header a {
        color: #e6e9ee;
        text-decoration: none;
        font-family: system-ui, sans-serif;
        font-weight: 700;
        font-size: 1.1rem;
        letter-spacing: 0.04em;
      }
      main {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
      }
      .panel { max-width: 36rem; text-align: center; }
      .code {
        font-family: system-ui, sans-serif;
        font-weight: 700;
        font-size: 5rem;
        line-height: 1;
        color: #75a8ff;
        margin-bottom: 1rem;
        letter-spacing: -0.02em;
      }
      h1 {
        font-family: system-ui, sans-serif;
        font-weight: 600;
        font-size: 1.5rem;
        margin-bottom: 1rem;
        color: #e6e9ee;
      }
      p { line-height: 1.6; color: #9ba3ad; margin-bottom: 1.5rem; font-size: 0.95rem; }
      .actions { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
      .actions a {
        color: #75a8ff;
        text-decoration: none;
        padding: 0.55rem 1rem;
        border: 1px solid #1d2329;
        border-radius: 4px;
        font-size: 0.9rem;
      }
      .actions a:hover { background: #1d2329; }
    </style>
  </head>
  <body>
    <header><a href="/">Samet Özkan</a></header>
    <main>
      <div class="panel">
        <div class="code">${status}</div>
        <h1>${heading}</h1>
        <p>${body}</p>
        <div class="actions">
          <a href="/">Home</a>
          <a href="/projects">All projects</a>
        </div>
      </div>
    </main>
  </body>
</html>`);
}

function send404(res: express.Response): void {
  sendStatusPage(
    res,
    404,
    "Page not found",
    "The page you're looking for doesn't exist or has been moved. Try one of the links below.",
  );
}

function send410(res: express.Response): void {
  sendStatusPage(
    res,
    410,
    "Page permanently removed",
    "This page used to exist but has been permanently removed.",
  );
}

const CATEGORY_LABEL: Record<ProjectSummary["category"], string> = {
  core: "CORE — owned & maintained",
  explore: "EXPLORE — personal R&D",
  contrib: "CONTRIB — fork-based contributions",
};

const CATEGORY_ORDER: ProjectSummary["category"][] = ["core", "explore", "contrib"];

// Browsers always send text/html in Accept, so its absence is what separates a
// content-consuming agent from a human's tab.
function wantsMarkdown(req: express.Request): boolean {
  const accept = req.headers.accept ?? "";
  return accept.includes("text/markdown") && !accept.includes("text/html");
}

function readLlmsTxt(): string {
  for (const dir of ["dist/client", "public"]) {
    const candidate = path.join(__dirname, dir, "llms.txt");
    if (fs.existsSync(candidate)) return fs.readFileSync(candidate, "utf-8");
  }
  return "";
}

function markdownForProjectList(portfolio: PortfolioData): string {
  const out: string[] = [`# All Repositories — ${portfolio.profile.name}`, ""];
  out.push(
    `${portfolio.projects.length} repositories. Each has a detail page at ${SITE_URL}/projects/<slug>, also available as markdown.`,
    "",
  );

  for (const category of CATEGORY_ORDER) {
    const items = portfolio.projects.filter((p) => p.category === category);
    if (items.length === 0) continue;
    out.push(`## ${CATEGORY_LABEL[category]}`, "");
    for (const project of items) {
      out.push(`### ${project.owner}/${project.repository}`, "");
      if (project.description) out.push(project.description, "");
      const facts = [`Language: ${project.language || "n/a"}`, `Stars: ${project.stars}`];
      if (project.latestRelease) facts.push(`Latest release: ${project.latestRelease}`);
      if (project.updatedAt) facts.push(`Updated: ${project.updatedAt.slice(0, 10)}`);
      out.push(facts.join(" · "), "");
      out.push(`- Detail: ${SITE_URL}/projects/${toSlug(project.repository)}`);
      out.push(`- Source: ${project.repoUrl}`);
      if (project.liveUrl) out.push(`- Live: ${project.liveUrl}`);
      out.push("");
    }
  }
  return out.join("\n");
}

function markdownForProject(detail: ProjectDetail): string {
  const out: string[] = [`# ${detail.owner}/${detail.repository}`, ""];
  if (detail.description) out.push(detail.description, "");

  out.push(`- Category: ${CATEGORY_LABEL[detail.category]}`);
  out.push(`- Source: ${detail.repoUrl}`);
  if (detail.liveUrl) out.push(`- Live: ${detail.liveUrl}`);
  if (detail.language) out.push(`- Primary language: ${detail.language}`);
  out.push(`- Stars: ${detail.stars} · Forks: ${detail.forks} · Open issues: ${detail.openIssues}`);
  if (detail.license) out.push(`- License: ${detail.license}`);
  if (detail.topics?.length) out.push(`- Topics: ${detail.topics.join(", ")}`);
  if (detail.isFork && detail.parentRepo) {
    out.push(`- Fork of: ${detail.parentRepo} (${detail.parentRepoUrl})`);
  }
  if (detail.updatedAt) out.push(`- Last updated: ${detail.updatedAt.slice(0, 10)}`);
  out.push("");

  const published = (detail.releases ?? []).filter((r) => r.publishedAt);
  if (published.length > 0) {
    out.push("## Releases", "");
    for (const release of published.slice(0, 10)) {
      out.push(`- [${release.name || release.tagName}](${release.url}) — ${release.publishedAt.slice(0, 10)}`);
    }
    out.push("");
  }

  if (detail.readme) out.push("## README", "", detail.readme.trim(), "");
  if (detail.changelog) out.push("## Changelog", "", detail.changelog.trim(), "");
  return out.join("\n");
}

function sendMarkdown(res: express.Response, body: string): void {
  res.setHeader("Content-Type", "text/markdown; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300");
  res.send(body);
}

async function createServer() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", true);

  // Reject unsafe/unused HTTP methods at the edge. Default Express handles
  // DELETE/PUT/TRACE/OPTIONS by falling through to the SSR catch-all (which
  // returned 200 HTML) — a cache-poisoning / log-pollution vector. Keep only
  // the methods the app actually uses.
  const ALLOWED_METHODS = new Set(["GET", "HEAD", "POST"]);
  app.use((req, res, next) => {
    if (!ALLOWED_METHODS.has(req.method)) {
      res.setHeader("Allow", "GET, HEAD, POST");
      res.status(405).type("text/plain").send("Method Not Allowed");
      return;
    }
    next();
  });

  // Normalize trailing slash — except root — so every path has one canonical
  // form. Without this, /projects/foo and /projects/foo/ render as two
  // different pages with two different canonicals (duplicate-content risk).
  app.use((req, res, next) => {
    if (req.path.length > 1 && req.path.endsWith("/")) {
      const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const query = parsedUrl.search;
      const safePath = req.path.slice(0, -1).replace(/^\/+/, '/');
      res.redirect(301, safePath + query);
      return;
    }
    next();
  });

  // HSTS `preload` is inert: hstspreload.org needs the apex to serve it, but apex→www
  // is a Cloudflare edge 301 — enable HSTS in CF Edge Certificates, not here.
  // CSP is production-only so Vite HMR keeps working without per-script nonces.
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "interest-cohort=(), browsing-topics=()");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    if (isProd) {
      res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
      res.setHeader(
        "Content-Security-Policy",
        [
          "default-src 'self'",
          "base-uri 'self'",
          "frame-ancestors 'none'",
          "form-action 'self'",
          "img-src 'self' data: https:",
          "style-src 'self' 'unsafe-inline'",
          "font-src 'self' data:",
          // Cloudflare Web Analytics is injected at the edge; without these two
          // hosts the beacon is CSP-blocked and collects nothing.
          "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
          "connect-src 'self' https://cloudflareinsights.com",
          "object-src 'none'",
        ].join("; "),
      );
    }
    // RFC 8288 Link headers — agent-discoverable entrypoints to llms.txt,
    // sitemap, and security.txt without HTML scraping.
    res.setHeader(
      "Link",
      [
        `</llms.txt>; rel="alternate"; type="text/markdown"`,
        `</sitemap.xml>; rel="sitemap"; type="application/xml"`,
        `</.well-known/security.txt>; rel="security-txt"`,
      ].join(", "),
    );
    next();
  });

  // `index: false` only stops directory-index resolution; a direct GET still
  // serves the bare Vite shell. Must precede express.static to win.
  app.get("/index.html", (_req, res) => {
    res.redirect(308, "/");
  });

  let vite: ViteDevServer | null = null;
  let cssLinks = "";
  let clientScriptTag = `<script type="module" src="/src/entry-client.tsx"></script>`;

  if (isProd) {
    const clientDist = path.join(__dirname, "dist/client");
    app.use(
      "/assets",
      express.static(path.join(clientDist, "assets"), { maxAge: "1y", immutable: true }),
    );
    // dotfiles: "allow" so /.well-known/security.txt (and future RFC-defined
    // well-known resources) are served as static files instead of falling
    // through to the SSR catch-all, which would return HTML.
    app.use(express.static(clientDist, { maxAge: "1h", index: false, dotfiles: "allow" }));
    const prodAssets = getProdAssets();
    cssLinks = prodAssets.cssLinks;
    clientScriptTag = prodAssets.scriptTag;
  } else {
    const { createServer: createVite } = await import("vite");
    vite = await createVite({
      root: process.cwd(),
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);
  }

  // Web Bot Auth (RFC 9421) — JWKS directory placeholder. We don't currently
  // make signed outbound requests, so the key set is empty. Shipping the empty
  // directory still satisfies isitagentready.com and reserves the path for
  // future signing infrastructure.
  app.get("/.well-known/http-message-signatures-directory", (_req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(JSON.stringify({ keys: [] }));
  });

  app.get("/sitemap.xml", async (_req, res) => {
    const portfolio = await fetchJSON<PortfolioData>(`${API_BASE_URL}/api/portfolio-data`);
    const today = new Date().toISOString().slice(0, 10);
    const rootLastmod = portfolio?.updatedAt ? portfolio.updatedAt.slice(0, 10) : today;
    const allUrls: string[] = [`${SITE_URL}/`, `${SITE_URL}/projects`];
    const projectUrls = (portfolio?.projects ?? [])
      .map((p) => {
        const url = `${SITE_URL}/projects/${toSlug(p.repository)}`;
        allUrls.push(url);
        const lastmod = (p.updatedAt && p.updatedAt.length >= 10 ? p.updatedAt.slice(0, 10) : rootLastmod);
        return `  <url><loc>${url}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>`;
      })
      .join("\n");
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE_URL}/</loc><lastmod>${rootLastmod}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>${SITE_URL}/projects</loc><lastmod>${rootLastmod}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>
${projectUrls}
</urlset>`;
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(xml);

    try {
      const host = new URL(SITE_URL).hostname;
      const signature = portfolio?.updatedAt ?? "";
      void pingIndexNow(host, allUrls, signature);
    } catch {
      /* ignore */
    }
  });

  app.get(/^\/og\/([a-z0-9-]+)\.png$/, async (req, res) => {
    const slug = (req.params as unknown as string[])[0] ?? "";
    try {
      const portfolio = await fetchJSON<PortfolioData>(`${API_BASE_URL}/api/portfolio-data`);
      let input: OgTemplateInput;

      if (slug === "home" || slug === "index") {
        const kpi = portfolio?.kpi;
        const chips: OgTemplateInput["metaChips"] = [];
        if (kpi) {
          chips.push({ label: "repos", value: String(kpi.ownedRepositories), accent: "blue" });
          chips.push({ label: "prs merged", value: String(kpi.mergedPRs), accent: "green" });
          chips.push({ label: "stars", value: String(kpi.totalStars), accent: "amber" });
        }
        input = {
          kind: "home",
          title: "Samet Özkan",
          subtitle: "Backend engineer · .NET Core · Go · Rust · Self-hosted delivery",
          metaChips: chips,
        };
      } else if (slug === "projects") {
        const count = portfolio?.projects?.length ?? 0;
        input = {
          kind: "projects",
          title: "All Repositories",
          subtitle: "Projects, explorations, and upstream contributions by Samet Özkan.",
          metaChips: count > 0 ? [{ label: "total", value: String(count), accent: "blue" }] : [],
        };
      } else {
        const project: ProjectSummary | undefined = portfolio?.projects?.find((p) => toSlug(p.repository) === slug);
        if (!project) {
          res.status(404).setHeader("Content-Type", "text/plain; charset=utf-8").send("not found");
          return;
        }
        const badge = project.category === "contrib" || project.isFork
          ? "CONTRIB"
          : project.category === "explore"
            ? "EXPLORE"
            : "CORE";
        const rawDesc = project.description || "A project by Samet Özkan.";
        const subtitle = rawDesc.length > 180 ? rawDesc.slice(0, 177) + "..." : rawDesc;
        const chips: OgTemplateInput["metaChips"] = [];
        if (project.language) chips.push({ label: "lang", value: project.language, accent: "blue" });
        chips.push({ label: "stars", value: String(project.stars ?? 0), accent: "amber" });
        chips.push({ label: "owner", value: project.owner, accent: "muted" });
        input = {
          kind: "project",
          statusBadge: badge,
          title: project.repository,
          subtitle,
          metaChips: chips,
        };
      }

      const png = await renderOg(input);
      res.setHeader("Content-Type", "image/png");
      res.setHeader(
        "Cache-Control",
        "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
      );
      res.end(png);
    } catch (err) {
      console.error("OG render error:", err);
      res.status(500).setHeader("Content-Type", "text/plain; charset=utf-8").end("render failed");
    }
  });

  // Any other /og/*.png path — e.g. /og/projects/foo.png — is invalid and
  // would otherwise fall through to the SSR catch-all and return HTML, which
  // Googlebot flags as a broken og:image. Return a clean 404 instead.
  app.get(/^\/og\/.*\.png$/, (_req, res) => {
    res.status(404).setHeader("Content-Type", "text/plain; charset=utf-8").send("not found");
  });

  // Stale URL Google indexed at some point but never appeared in our sitemap.
  // 410 tells crawlers it's permanently gone, faster than 404 for de-indexing.
  app.get("/projects/samples/README.md", (_req, res) => send410(res));

  app.use("/api", async (req, res) => {
    let decoded = req.url;
    try {
      decoded = decodeURIComponent(req.url);
    } catch {
      res.status(400).json({ error: "bad request" });
      return;
    }
    const checkUrl = new URL(`/api${decoded}`, "http://localhost");
    if (!checkUrl.pathname.startsWith("/api/") && checkUrl.pathname !== "/api") {
      res.status(403).json({ error: "forbidden" });
      return;
    }

    const normalizedPath = checkUrl.pathname.replace(/^\/api/, "");
    const target = `${API_BASE_URL}/api${normalizedPath}${checkUrl.search}`;
    const isProjectDetail = /^\/project\/[^/]+\/[^/]+$/.test(normalizedPath);
    try {
      const upstream = await fetch(target, {
        method: req.method,
        signal: AbortSignal.timeout(PROXY_FETCH_TIMEOUT_MS),
      });
      res.status(upstream.status);
      const ct = upstream.headers.get("content-type");
      if (ct) res.setHeader("Content-Type", ct);
      const cc = upstream.headers.get("cache-control");
      if (cc) res.setHeader("Cache-Control", cc);

      if (isProjectDetail && upstream.ok) {
        const json = await upstream.json() as ProjectDetail;
        res.json(enrichProjectDetail(json));
      } else {
        upstream.body?.pipeTo(
          new WritableStream({
            write(chunk) { res.write(chunk); },
            close() { res.end(); },
            abort(err) { console.error("proxy stream abort", err); res.end(); },
          }),
        );
      }
    } catch (err) {
      console.error("API proxy error:", err);
      res.status(502).json({ error: "upstream unavailable" });
    }
  });

  // Markdown for Agents — an agent asking for text/markdown gets the source it
  // would otherwise have to strip out of SSR HTML. `Vary: Accept` is set for
  // every candidate path, markdown or not, so caches keep the two apart.
  app.use(async (req, res, next) => {
    const pathname = req.path;
    const isCandidate =
      pathname === "/" || pathname === "/projects" || pathname.startsWith("/projects/");
    if (!isCandidate) {
      next();
      return;
    }
    res.setHeader("Vary", "Accept");
    if (req.method !== "GET" || !wantsMarkdown(req)) {
      next();
      return;
    }

    if (pathname === "/") {
      const llms = readLlmsTxt();
      if (!llms) {
        next();
        return;
      }
      sendMarkdown(res, llms);
      return;
    }

    const portfolio = await fetchJSON<PortfolioData>(`${API_BASE_URL}/api/portfolio-data`);
    if (!portfolio) {
      next();
      return;
    }

    if (pathname === "/projects") {
      sendMarkdown(res, markdownForProjectList(portfolio));
      return;
    }

    const rest = pathname.replace(/^\/projects\//, "");
    const rawSlug = rest.split("/")[0] ?? "";
    if (rest.includes("/") || !toSlug(rawSlug)) {
      next();
      return;
    }
    const canonicalSlug = toSlug(rawSlug);
    const matched = portfolio.projects.find((p) => toSlug(p.repository) === canonicalSlug);
    if (!matched) {
      next();
      return;
    }
    if (canonicalSlug !== rawSlug) {
      res.redirect(301, `/projects/${canonicalSlug}`);
      return;
    }
    const detail = await fetchJSON<ProjectDetail>(
      `${API_BASE_URL}/api/project/${matched.owner}/${matched.repository}`,
    );
    if (!detail) {
      next();
      return;
    }
    sendMarkdown(res, markdownForProject(detail));
  });

  app.use("*url", async (req, res) => {
    const url = req.originalUrl;
    const pathname = new URL(url, "http://localhost").pathname;

    try {
      let render: RenderFn;
      let getPageMeta: GetPageMetaFn;

      if (isProd) {
        const mod = await import(path.join(__dirname, "dist/server/entry-server.js")) as {
          render: RenderFn;
          getPageMeta: GetPageMetaFn;
        };
        render = mod.render;
        getPageMeta = mod.getPageMeta;
      } else {
        const entryMod = await vite!.ssrLoadModule("/src/entry-server.tsx") as { render: RenderFn };
        const metaMod = await vite!.ssrLoadModule("/src/lib/meta.ts") as { getPageMeta: GetPageMetaFn };
        render = entryMod.render;
        getPageMeta = metaMod.getPageMeta;
      }

      // Whitelist known routes. Anything else — /random, /blog, typos — was
      // returning 200 + index,follow with the SPA shell, which Google reads as
      // a soft-404 against the apex domain.
      const isKnownRoute =
        pathname === "/" ||
        pathname === "/projects" ||
        pathname.startsWith("/projects/");

      if (!isKnownRoute) {
        send404(res);
        return;
      }

      const ssrData: SSRData = {};
      ssrData.portfolioData = await fetchJSON(`${API_BASE_URL}/api/portfolio-data`) ?? undefined;

      if (pathname.startsWith("/projects/") && ssrData.portfolioData) {
        const rest = pathname.replace(/^\/projects\//, "");
        const rawSlug = rest.split("/")[0] ?? "";
        const hasExtraSegments = rest.includes("/");
        const canonicalSlug = toSlug(rawSlug);

        if (!canonicalSlug || hasExtraSegments) {
          send404(res);
          return;
        }

        // Resolve before redirecting. Slugifying first would send
        // /projects/foo.html to /projects/foo-html, which then 404s — a
        // redirect→404 chain Search Console reports twice.
        const matched = ssrData.portfolioData.projects.find(
          (p) => toSlug(p.repository) === canonicalSlug,
        );

        if (matched && canonicalSlug !== rawSlug) {
          res.redirect(301, `/projects/${canonicalSlug}`);
          return;
        }
        if (!matched) {
          send404(res);
          return;
        }

        const raw = await fetchJSON<ProjectDetail>(
          `${API_BASE_URL}/api/project/${matched.owner}/${matched.repository}`,
        );
        if (raw) ssrData.projectDetail = enrichProjectDetail(raw);
      }

      const meta = getPageMeta(pathname, ssrData.portfolioData, ssrData.projectDetail);
      const jsonLd = generateJsonLd(pathname, ssrData);

      let didError = false;

      const tail =
        `</div><script>window.__SSR_DATA__=${JSON.stringify(ssrData).replace(/</g, "\\u003c")};</script>` +
        `${clientScriptTag}</body>\n</html>`;

      const tailInject = new Transform({
        transform(chunk, _enc, cb) { this.push(chunk); cb(); },
        flush(cb) { this.push(tail); cb(); },
      });

      const stream = render(url, ssrData, {
        onShellReady() {
          res.status(didError ? 500 : 200);
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
          res.write(buildHead(meta, cssLinks, !isProd, jsonLd, `${SITE_URL}${pathname}`));
          stream.pipe(tailInject).pipe(res);
        },
        onShellError(err: unknown) {
          console.error("Shell error:", err);
          res.status(500).send("<!doctype html><p>Internal Server Error</p>");
        },
        onError(err: unknown) {
          didError = true;
          console.error("SSR render error:", err);
        },
      });

    } catch (err) {
      if (vite) vite.ssrFixStacktrace(err as Error);
      console.error(err);
      if (!res.headersSent) {
        res.status(500).send("<!doctype html><p>Internal Server Error</p>");
      }
    }
  });

  app.listen(port, () => {
    console.log(`SSR server → http://localhost:${port}`);
  });
}

createServer();
