import type { PortfolioData, ProjectDetail } from "@/types/api";

export type PageMeta = {
  title: string;
  description: string;
};

const DEFAULT_DESCRIPTION =
  "Samet Özkan — Backend engineer focused on .NET Core, clean service architecture, and reliable shipping cadence. Portfolio of projects, contributions, and build history.";

export function getPageMeta(
  pathname: string,
  portfolioData?: PortfolioData,
  projectDetail?: ProjectDetail,
): PageMeta {
  if (pathname === "/") {
    return {
      title: "Samet Özkan — Backend Engineer Portfolio",
      description: DEFAULT_DESCRIPTION,
    };
  }

  if (pathname === "/projects") {
    const count = portfolioData?.projects?.length ?? 0;
    return {
      title: "All Repositories — Samet Özkan",
      description: count > 0
        ? `${count} repositories — projects and contributions by Samet Özkan.`
        : DEFAULT_DESCRIPTION,
    };
  }

  if (pathname.startsWith("/projects/") && projectDetail) {
    const name = `${projectDetail.owner}/${projectDetail.repository}`;
    const desc = projectDetail.description || DEFAULT_DESCRIPTION;
    return {
      title: `${name} — Samet Özkan`,
      description: desc,
    };
  }

  return {
    title: "Samet Özkan — Backend Engineer Portfolio",
    description: DEFAULT_DESCRIPTION,
  };
}
