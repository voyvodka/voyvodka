import { useEffect, useState } from "react";

import { getProjectDetail } from "@/lib/apiClient";
import type { ProjectDetail } from "@/types/api";

const CACHE_PREFIX = "project_detail_cache:";

type State = {
  data: ProjectDetail | null;
  loading: boolean;
  error: string | null;
};

function readCache(key: string): ProjectDetail | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as ProjectDetail) : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, data: ProjectDetail) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // storage quota exceeded — ignore
  }
}

export function useProjectDetail(owner: string, repo: string) {
  const cacheKey = `${CACHE_PREFIX}${owner}/${repo}`;
  const cached = owner && repo ? readCache(cacheKey) : null;

  const [state, setState] = useState<State>({
    data: cached,
    loading: cached === null,
    error: null,
  });

  useEffect(() => {
    if (!owner || !repo) return;
    const controller = new AbortController();

    getProjectDetail(owner, repo, controller.signal)
      .then((data) => {
        writeCache(cacheKey, data);
        setState((prev) => {
          if (prev.data && JSON.stringify(prev.data) === JSON.stringify(data)) {
            return prev.loading ? { ...prev, loading: false } : prev;
          }
          return { data, loading: false, error: null };
        });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState((prev) => ({
          data: prev.data,
          loading: false,
          error: prev.data ? null : (error instanceof Error ? error.message : "Unknown error"),
        }));
      });

    return () => {
      controller.abort();
    };
  }, [owner, repo, cacheKey]);

  return state;
}
