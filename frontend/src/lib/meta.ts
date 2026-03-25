import type { PortfolioData, ProjectDetail } from "@/types/api";

export type PageMeta = {
  title: string;
  description: string;
};

const DEFAULT_DESCRIPTION =
  "Samet Özkan — .NET backend engineer. Clean service architecture, REST APIs, and reliable delivery. Portfolio of projects, contributions, and build history.";

export function getPageMeta(
  pathname: string,
  portfolioData?: PortfolioData,
  projectDetail?: ProjectDetail,
): PageMeta {
  if (pathname === "/") {
    return {
      title: "Samet Özkan — Software Engineer Portfolio & Projects",
      description: DEFAULT_DESCRIPTION,
    };
  }

  if (pathname === "/projects") {
    const count = portfolioData?.projects?.length ?? 0;
    return {
      title: "All Repositories — Samet Özkan | Projects & Contributions",
      description: count > 0
        ? `${count} open source repositories — projects and contributions by Samet Özkan, .NET backend engineer.`
        : DEFAULT_DESCRIPTION,
    };
  }

  if (pathname.startsWith("/projects/") && projectDetail) {
    const name = `${projectDetail.owner}/${projectDetail.repository}`;
    const rawDesc = projectDetail.description || DEFAULT_DESCRIPTION;
    const desc = rawDesc.length > 158 ? rawDesc.slice(0, 155) + "..." : rawDesc;
    const titleBase = `${name} — Samet Özkan`;
    const title = titleBase.length < 50 ? `${titleBase} | Project Detail` : titleBase;
    return { title, description: desc };
  }

  return {
    title: "Samet Özkan — Software Engineer Portfolio & Projects",
    description: DEFAULT_DESCRIPTION,
  };
}
