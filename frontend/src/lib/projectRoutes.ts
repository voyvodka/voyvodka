import type { ProjectSummary } from "@/types/api";

export function extractRepositoryName(repositoryRef: string) {
  const parts = repositoryRef.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? repositoryRef;
}

export function toProjectSlug(repository: string) {
  return repository
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function toProjectPath(repository: string) {
  return `/projects/${toProjectSlug(extractRepositoryName(repository))}`;
}

export function findProjectBySlug(projects: ProjectSummary[], slug: string) {
  return projects.find((project) => toProjectSlug(project.repository) === slug) ?? null;
}
