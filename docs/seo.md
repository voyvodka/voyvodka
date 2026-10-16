# SEO / GEO

Rules this site's SEO and AI-crawlability depend on, extracted from commit history
(`#168`-`#178` and earlier) and verified against current code. Read this before
touching `frontend/server.ts`, `frontend/src/lib/meta.ts`, `frontend/public/robots.txt`,
`frontend/public/llms.txt`, or the JSON-LD block, so a "cleanup" doesn't silently
regress a rule that was already earned once.

## Invariants

- **The creation date must not rotate on the landing and `/projects` schemas.**
  The landing `ProfilePage` pins `dateCreated` and the `/projects` Article pins
  `datePublished` to `SITE_PUBLISHED_AT` (a fixed constant, `frontend/server.ts`
  line ~149); only `dateModified` tracks the backend cache-refresh timestamp
  (`portfolioUpdatedAt`). Using the sync timestamp told crawlers the page was
  republished on every GitHub sync. Enforced in `generateJsonLd()`,
  `frontend/server.ts`.
- **The landing is a `ProfilePage` whose `mainEntity` is the Person**, not an
  Article. Google's ProfilePage documentation lists "About Me" pages as a valid
  use (checked 2026-10-14, page last updated 2026-09-08). The Person carries
  `alternateName` for the diacritic-free spelling and the handle, and the
  homepage `<h1>` opens with the name, because brand queries for the name were
  ranking on page one but not first.
- **Project-detail schema dates never fall back to `portfolioUpdatedAt`.**
  `SoftwareSourceCode`/`Article` dates for a project page use
  `firstRelease?.publishedAt || detail.pushedAt || detail.updatedAt`, and are
  omitted entirely (not defaulted) when none exist — a missing field is a
  stronger signal than a fabricated one. See the comment above `datePublished`
  in `generateJsonLd()`, `frontend/server.ts` (~line 377).
- **CSP must allow Cloudflare Web Analytics.** `script-src` includes
  `https://static.cloudflareinsights.com` and `connect-src` includes
  `https://cloudflareinsights.com`; Cloudflare injects the beacon at the edge,
  so without these hosts the CSP silently blocks it and the analytics collect
  nothing. Set in the security-headers middleware, `frontend/server.ts`
  (~line 797-814), production-only (CSP is skipped in dev so Vite HMR works
  without per-script nonces).
- **`llms.txt` uses markdown link syntax, not bare URLs.** `llmstxt.org`
  parses `[label](url)`; bare URLs after a label fail the Agentic-Browsing
  llms-txt audit. See `frontend/public/llms.txt`.
- **Resolve the project before applying any slug redirect; never serve raw
  `/index.html`.** Slugifying an unresolved path first (e.g.
  `/projects/foo.html` → `/projects/foo-html`) sends a redirect to a 404 that
  Search Console double-counts. Both the markdown-negotiation branch and the
  SSR catch-all look up the project by `canonicalSlug` before deciding to
  redirect or 404 — see the "Resolve before redirecting" comment in
  `frontend/server.ts` (~line 1141) and the matching logic ~line 1072.
  `GET /index.html` explicitly 308s to `/` (~line 831) because
  `express.static`'s `index: false` only disables directory-index resolution,
  not a direct hit on the file.
- **Markdown is served to agents via `Accept` content negotiation, not a
  separate route tree.** `wantsMarkdown()` requires `Accept` to contain
  `text/markdown` and NOT `text/html` (browsers always send `text/html`).
  `Vary: Accept` is set on every candidate path (markdown or not) so caches
  keep the two representations apart. See `wantsMarkdown()` and the
  "Markdown for Agents" block, `frontend/server.ts` (~line 675, ~line 1028).
- **Schema entities are linked with `about`/`mentions`, and technology names
  carry a canonical `sameAs` only when one is known.** Landing/`/projects`
  Articles set `about` to the Person; project pages set `about` to their own
  `SoftwareSourceCode` (`{ "@id": "${detailUrl}#code" }`), not the author —
  the code is what the page is about. `techEntity()` emits `sameAs` only for
  names present in `TECH_ENTITY_URLS`; an unlisted name (e.g. an unusual
  language) emits without `sameAs` rather than a guessed URL, because a wrong
  `sameAs` asserts a wrong identity. `frontend/server.ts` (~line 203-212,
  ~line 290-291, ~line 348-349, ~line 427-429).
- **`Content-Usage` is deliberately NOT emitted, in robots.txt or as an HTTP
  header.** Lighthouse 13.4.1 fails the robots.txt audit on it ("Unknown
  directive"), costing 8 SEO points, while the underlying spec
  (`draft-ietf-aipref-attach`) was expired with no RFC as of the decision.
  `Content-Signal` stays — validators accept it. Confirmed absent from
  `frontend/public/robots.txt` and `frontend/server.ts`.
- **`Content-Signal` lives inside the `User-agent: *` group, not after the
  last block.** Placing it after a specific bot's block scopes it to that bot
  only. See the comment at the top of `frontend/public/robots.txt`.
- **Retired crawler tokens and `FAQPage` schema are dropped, on purpose.**
  `robots.txt` lists only tokens the operators currently publish (OpenAI,
  Anthropic, plus a short "Others" list) — `Claude-Web`, `anthropic-ai`,
  `cohere-ai`, and `Bytespider` were removed because they don't appear on
  current bot lists (or, for Bytespider, are widely reported to ignore
  robots.txt anyway) and read as coverage without providing any. `FAQPage`
  JSON-LD was removed site-wide since Google withdrew FAQ rich results;
  confirmed no `FAQPage` reference remains in `frontend/`.
- **The homepage exists in English (`/`) and Turkish (`/tr`), and nothing else
  is translated.** Brand searches for the name come from Turkey in Turkish,
  and an English-only page was losing on language match. Both pages carry
  the same `hreflang` set (`en` → `/`, `tr` → `/tr`, `x-default` → `/`),
  each listing itself, and the sitemap repeats it as `xhtml:link`; Google
  ignores pairs that don't point at each other. `<html lang>`, `og:locale`
  and the `ProfilePage` (`/tr#profile`, `inLanguage: "tr"`) follow the page.
  Project pages stay English-only: their main content is GitHub text, and
  translating only the chrome around it is what Google's multilingual
  guidance warns against. No redirect on `Accept-Language`; the switch is a
  plain link. GitHub, LinkedIn, language and repository names carry
  `lang="en"` so `text-transform: uppercase` under `lang="tr"` doesn't turn
  their `i` into `İ`. `HOME_TRANSLATIONS`, `frontend/server.ts`;
  `frontend/src/i18n/home.ts`.
- **Known routes are whitelisted in the SSR catch-all; everything else is a
  real 404 with `noindex`.** Serving 200 + `index,follow` for unknown paths
  reads as a soft-404 against the apex. `/tr` is the only translated route;
  `/tr/<anything>` is a 404. `isKnownRoute` check,
  `frontend/server.ts` (~line 1117).
- **An unreachable portfolio API is a 503, never a 200 shell.** Pages and the
  sitemap are built from `/api/portfolio-data`; when it fails, the SSR
  catch-all and `/sitemap.xml` answer `503` + `Retry-After` + `no-store`
  (pages also `noindex`). The old fallback rendered an empty shell with
  200 + `index,follow` for every `/projects/<slug>` — retired and nonexistent
  slugs included — and a sitemap listing only `/` and `/projects`. A short 503
  makes Google retry and keep what it has indexed. `send503()` and the
  sitemap guard, `frontend/server.ts`.
- **Unsafe HTTP methods are rejected before the SSR catch-all.** Only `GET`,
  `HEAD`, `POST` pass; others get `405` + `Allow` instead of falling through
  to 200 HTML (cache-poisoning / log-pollution risk). `frontend/server.ts`
  (~line 763-771).
- **Trailing slashes normalize to one canonical form** (301, root excluded)
  so `/projects/foo` and `/projects/foo/` don't compete as duplicate content.
  `frontend/server.ts` (~line 776-785).
- **`/projects/samples/README.md` returns 410, not 404** — Google indexed it
  from outside the sitemap at some point; 410 de-indexes faster.
  `frontend/server.ts` (~line 980). Project pages of repositories deleted
  from GitHub answer 410 the same way (`RETIRED_PROJECT_SLUGS`, checked only
  when the slug matches no live project). Search Console listed
  `/projects/vueproject` and `/projects/webapplication` as 404s after those
  repositories were deleted. Renamed repositories are the other case: their old
  slug answers 301 to the new one (`RENAMED_PROJECT_SLUGS`), but only while the
  new slug is a live project, so the redirect never ends on a 404.
- **README links and images that are repo-relative point at GitHub.** A
  README's `LICENSE` or `docs/API.md` link would otherwise resolve under
  `/projects/` and 404 (Search Console listed `/projects/LICENSE`,
  `/projects/CONTRIBUTING.md`). `<a href>` goes to the github.com blob view,
  `<img src>` to raw.githubusercontent.com. `frontend/server.ts`
  (`rewriteRepoRelativeUrls`).
- **Thin/templated fallback content is avoided.** README/Changelog/Releases
  panels synthesize a paragraph from real repo metadata (language, owner,
  topics, license, branch) instead of one generic sentence repeated across
  many pages, which reads as thin content to Google's quality model.
- **Every profile in the Person `sameAs` is also a `rel="me"` link.** The
  head carries `<link rel="me">` for GitHub, LinkedIn and X, and the visible
  GitHub/LinkedIn buttons use `rel="me noreferrer"`, so the identity claim in
  the schema is matched by the page's own links. Add or remove a profile in
  both places together. `buildHead()`, `frontend/server.ts`;
  `frontend/src/pages/HomePage.tsx`.
- **Project H1 is the repo name only, not `owner/repo`.** All owned projects
  share one owner, so the prefix made every H1 start identically — a
  duplicate-content signal. Owner still appears in the meta row, breadcrumb
  JSON-LD, and URL.

## Known external blockers

- **HSTS on the apex comes from Cloudflare, not from this codebase.** The
  apex→www redirect is a 301 at the Cloudflare edge and never reaches the
  middleware that sets the header (`frontend/server.ts` ~line 807). HSTS is
  enabled in the zone's Edge Certificates settings with the same value the
  middleware sends (`max-age=63072000; includeSubDomains; preload`), and
  Cloudflare's header replaces the origin's — so a change to one must be made
  in both, or the edge silently wins. Submitting to `hstspreload.org` is a
  separate, owner-only decision.

## Before changing SEO code

The owner's actual checks, per commit history — don't invent others:

- **Lighthouse** (13.4.1 at time of writing) — SEO and Best Practices audits,
  including the robots.txt "Unknown directive" check and CSP violations.
- **Google Search Console** — redirect chains, soft-404s, index status; a
  redirect landing on a 404 is double-counted here.
- **`hstspreload.org`** — the HSTS preload submission target; see the apex
  edge-redirect gap above.
- **`llmstxt.org`** spec / Agentic Browsing audit category — governs
  `llms.txt` link syntax.
- **`isitagentready.com`** — origin of the agent-ready discovery signals
  (Content-Signal, RFC 8288 Link headers,
  `.well-known/http-message-signatures-directory`).

`frontend/server.ts` is the only source of production security headers.
