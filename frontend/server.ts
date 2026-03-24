import fs from "node:fs";
import path from "node:path";
import { Transform } from "node:stream";
import { fileURLToPath } from "node:url";
import express from "express";
import { marked } from "marked";
import type { ViteDevServer } from "vite";

import type { SSRData } from "./src/context/DataContext";
import type { ProjectDetail } from "./src/types/api";
import type { PageMeta } from "./src/lib/meta";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env["NODE_ENV"] === "production";
const port = Number(process.env["PORT"] ?? 3000);
const API_BASE_URL = process.env["API_BASE_URL"] ?? "http://localhost:5555";

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

function renderMarkdown(raw: string): string {
  if (!raw) return "";
  return marked.parse(raw) as string;
}

function enrichProjectDetail(detail: ProjectDetail): ProjectDetail {
  return {
    ...detail,
    readmeHtml: renderMarkdown(detail.readme ?? ""),
    changelogHtml: renderMarkdown(detail.changelog ?? ""),
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

function buildHead(meta: PageMeta, cssLinks: string, devMode: boolean): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${meta.title}</title>
    <meta name="description" content="${meta.description.replace(/"/g, "&quot;")}" />
    <meta name="robots" content="index, follow" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="preload" href="/fonts/rajdhani-500.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="preload" href="/fonts/rajdhani-700.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="preload" href="/fonts/space-mono-400.woff2" as="font" type="font/woff2" crossorigin />
    ${devMode ? `<link rel="stylesheet" href="/src/styles.css" />` : cssLinks}
    ${devMode ? REACT_REFRESH_PREAMBLE : ""}
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

async function createServer() {
  const app = express();

  let vite: ViteDevServer | null = null;
  let cssLinks = "";
  let clientScriptTag = `<script type="module" src="/src/entry-client.tsx"></script>`;

  if (isProd) {
    const clientDist = path.join(__dirname, "dist/client");
    app.use(
      "/assets",
      express.static(path.join(clientDist, "assets"), { maxAge: "1y", immutable: true }),
    );
    app.use(express.static(clientDist, { maxAge: "1h", index: false }));
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

  app.use("/api", async (req, res) => {
    const target = `${API_BASE_URL}/api${req.url}`;
    const isProjectDetail = /^\/project\/[^/]+\/[^/]+$/.test(req.url);
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

      const ssrData: SSRData = {};

      const needsPortfolio =
        pathname === "/" ||
        pathname === "/projects" ||
        pathname.startsWith("/projects/");

      if (needsPortfolio) {
        ssrData.portfolioData = await fetchJSON(`${API_BASE_URL}/api/portfolio-data`) ?? undefined;
      }

      if (pathname.startsWith("/projects/") && ssrData.portfolioData) {
        const slug = pathname.replace(/^\/projects\//, "").split("/")[0] ?? "";
        const matched = ssrData.portfolioData.projects.find((p) => toSlug(p.repository) === slug);
        if (matched) {
          const raw = await fetchJSON<ProjectDetail>(
            `${API_BASE_URL}/api/project/${matched.owner}/${matched.repository}`,
          );
          if (raw) ssrData.projectDetail = enrichProjectDetail(raw);
        }
      }

      const meta = getPageMeta(pathname, ssrData.portfolioData, ssrData.projectDetail);

      let didError = false;

      const tail =
        `</div><script>window.__SSR_DATA__=${JSON.stringify(ssrData)};</script>` +
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
          res.write(buildHead(meta, cssLinks, !isProd));
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
