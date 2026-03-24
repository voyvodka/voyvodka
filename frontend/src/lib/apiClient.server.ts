import type { PortfolioData, ProjectDetail } from "@/types/api";

const API_BASE_URL = process.env["API_BASE_URL"] ?? "http://localhost:5555";

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`Server-side request failed: ${response.status} ${path}`);
  }

  return (await response.json()) as T;
}

export function fetchPortfolioData() {
  return request<PortfolioData>("/api/portfolio-data");
}

export function fetchProjectDetail(owner: string, repo: string) {
  return request<ProjectDetail>(`/api/project/${owner}/${repo}`);
}
