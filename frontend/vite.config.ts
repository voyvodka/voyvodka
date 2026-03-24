import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

function portfolioSeedPlugin(): import("vite").Plugin {
  return {
    name: "portfolio-seed",
    async transformIndexHtml(_html, ctx) {
      const env = loadEnv(ctx.server ? "development" : "production", process.cwd(), "VITE_");
      const apiBase = env.VITE_PUBLIC_API_BASE_URL ?? "http://localhost:5555";
      try {
        const res = await fetch(`${apiBase}/api/portfolio-data`, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return;
        const data = await res.json();
        return [
          {
            tag: "script",
            injectTo: "head-prepend",
            children: `window.__PORTFOLIO_SEED__=${JSON.stringify(data)};`,
          },
        ];
      } catch {
        // API unavailable at build time — skip seed, app will fetch at runtime
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), portfolioSeedPlugin()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react-markdown") || id.includes("node_modules/remark")) {
            return "markdown";
          }
if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
            return "vendor";
          }
        },
      },
    },
  },
});
