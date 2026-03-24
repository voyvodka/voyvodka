import type { PortfolioData, ProjectDetail } from "@/types/api";

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export function getPortfolioData(signal?: AbortSignal) {
  return request<PortfolioData>("/api/portfolio-data", signal);
}

export function getProjectDetail(owner: string, repo: string, signal?: AbortSignal) {
  return request<ProjectDetail>(`/api/project/${owner}/${repo}`, signal);
}
