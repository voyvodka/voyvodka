import type { PortfolioData, ProjectDetail } from "@/types/api";

export type PageMeta = {
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: "website" | "article" | "profile";
};

const DEFAULT_DESCRIPTION =
  "Samet Özkan — .NET backend engineer. Clean service architecture, REST APIs, and reliable delivery. Portfolio of projects, contributions, and build history.";

const SITE_URL = "https://www.sametozkan.com.tr";

function toSlug(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 3);
  // Prefer a word boundary close to the cut so we don't leave dangling
  // syllables like "dashboa...". If no space is reasonably close, fall back
  // to the raw slice.
  const lastSpace = cut.lastIndexOf(" ");
  const safe = lastSpace > max * 0.7 ? cut.slice(0, lastSpace) : cut;
  return safe.trimEnd() + "...";
}

export function getPageMeta(
  pathname: string,
  portfolioData?: PortfolioData,
  projectDetail?: ProjectDetail,
): PageMeta {
  if (pathname === "/") {
    return {
      title: "Samet Özkan — Software Engineer Portfolio & Projects",
      description: DEFAULT_DESCRIPTION,
      ogTitle: "Samet Özkan — Backend Engineer",
      ogDescription: "Backend engineer — .NET Core, Go, Rust. Self-hosted delivery. Portfolio, projects, and build history.",
      ogImage: `${SITE_URL}/og/home.png`,
      ogType: "profile",
    };
  }

  if (pathname === "/projects") {
    const count = portfolioData?.projects?.length ?? 0;
    const description = count > 0
      ? `${count} open source repositories — projects and contributions by Samet Özkan, .NET backend engineer.`
      : DEFAULT_DESCRIPTION;
    return {
      title: "All Repositories — Samet Özkan | Projects & Contributions",
      description,
      ogTitle: "All Repositories — Samet Özkan",
      ogDescription: description,
      ogImage: `${SITE_URL}/og/projects.png`,
      ogType: "website",
    };
  }

  if (pathname.startsWith("/projects/") && projectDetail) {
    const name = `${projectDetail.owner}/${projectDetail.repository}`;
    const langLabel = projectDetail.language ? `${projectDetail.language} ` : "";
    const rawDesc = projectDetail.description || `A ${langLabel}project — ${projectDetail.repository}`;
    const BRAND_SUFFIX = " — by Samet Özkan, backend engineer.";
    const MAX_DESC = 160;
    const OG_MAX_DESC = 200;
    const projectDesc = rawDesc.replace(/[.!?]\s*$/, "");
    const desc = truncate(projectDesc, MAX_DESC - BRAND_SUFFIX.length) + BRAND_SUFFIX;
    const ogDesc = truncate(projectDesc, OG_MAX_DESC - BRAND_SUFFIX.length) + BRAND_SUFFIX;
    const titleBase = `${name} — Samet Özkan`;
    const title = titleBase.length < 50 ? `${titleBase} | Project Detail` : titleBase;
    const slug = toSlug(projectDetail.repository);
    return {
      title,
      description: desc,
      ogTitle: name,
      ogDescription: ogDesc,
      ogImage: `${SITE_URL}/og/${slug}.png`,
      ogType: "article",
    };
  }

  return {
    title: "Samet Özkan — Software Engineer Portfolio & Projects",
    description: DEFAULT_DESCRIPTION,
    ogTitle: "Samet Özkan — Backend Engineer",
    ogDescription: DEFAULT_DESCRIPTION,
    ogImage: `${SITE_URL}/og/home.png`,
    ogType: "website",
  };
}
