import type { PortfolioData, ProjectDetail } from "@/types/api";

const API_BASE_URL =
  import.meta.env.VITE_PUBLIC_API_BASE_URL ?? "http://localhost:5555";

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { signal });

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
