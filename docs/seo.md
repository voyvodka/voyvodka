# SEO / GEO

Rules this site's SEO and AI-crawlability depend on, extracted from commit history
(`#168`-`#178` and earlier) and verified against current code. Read this before
touching `frontend/server.ts`, `frontend/src/lib/meta.ts`, `frontend/public/robots.txt`,
`frontend/public/llms.txt`, or the JSON-LD block, so a "cleanup" doesn't silently
regress a rule that was already earned once.

## Invariants

- **`datePublished` must not rotate on the landing and `/projects` schemas.**
  Both Article schemas pin `datePublished` to `SITE_PUBLISHED_AT` (a fixed
  constant, `frontend/server.ts` line ~149) and let only `dateModified` track
  the backend cache-refresh timestamp (`portfolioUpdatedAt`). Using the sync
  timestamp for `datePublished` told crawlers the page was republished on
  every GitHub sync. Enforced in `generateJsonLd()`, `frontend/server.ts`.
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
- **Known routes are whitelisted in the SSR catch-all; everything else is a
  real 404 with `noindex`.** Serving 200 + `index,follow` for unknown paths
  reads as a soft-404 against the apex. `isKnownRoute` check,
  `frontend/server.ts` (~line 1117).
- **Unsafe HTTP methods are rejected before the SSR catch-all.** Only `GET`,
  `HEAD`, `POST` pass; others get `405` + `Allow` instead of falling through
  to 200 HTML (cache-poisoning / log-pollution risk). `frontend/server.ts`
  (~line 763-771).
- **Trailing slashes normalize to one canonical form** (301, root excluded)
  so `/projects/foo` and `/projects/foo/` don't compete as duplicate content.
  `frontend/server.ts` (~line 776-785).
- **`/projects/samples/README.md` returns 410, not 404** — Google indexed it
  from outside the sitemap at some point; 410 de-indexes faster.
  `frontend/server.ts` (~line 980).
- **Thin/templated fallback content is avoided.** README/Changelog/Releases
  panels synthesize a paragraph from real repo metadata (language, owner,
  topics, license, branch) instead of one generic sentence repeated across
  many pages, which reads as thin content to Google's quality model.
- **Project H1 is the repo name only, not `owner/repo`.** All owned projects
  share one owner, so the prefix made every H1 start identically — a
  duplicate-content signal. Owner still appears in the meta row, breadcrumb
  JSON-LD, and URL.

## Known external blockers

- **HSTS `preload` cannot be fully enabled from this codebase.** The header
  sets `preload` (`frontend/server.ts` ~line 797), but `hstspreload.org`
  requires the *apex* domain to serve the header — and the apex→www redirect
  is generated as a 301 at the Cloudflare edge, never reaching this
  middleware, so the apex currently serves no `Strict-Transport-Security`
  header at all. The only fix is enabling HSTS in Cloudflare's Edge
  Certificates dashboard; it is out of reach of this repo.

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

Note: `frontend/nginx.conf` is a leftover from before the SSR migration
(commit "switch runtime image from nginx to node") and is not wired into the
Dockerfile — it does not reflect the actual security headers in production;
`frontend/server.ts` is the only authoritative source for headers.
