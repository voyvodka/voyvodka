import { useEffect, useState } from "react";

import { getProjectDetail } from "@/lib/apiClient";
import type { ProjectDetail } from "@/types/api";
import { useSSRData } from "@/context/DataContext";

type State = {
  data: ProjectDetail | null;
  loading: boolean;
  error: string | null;
};

export function useProjectDetail(owner: string, repo: string) {
  const { projectDetail: ssrProjectDetail } = useSSRData();

  const ssrMatch =
    ssrProjectDetail?.owner === owner && ssrProjectDetail.repository === repo
      ? ssrProjectDetail
      : null;

  const [state, setState] = useState<State>({
    data: ssrMatch ?? null,
    loading: ssrMatch == null && Boolean(owner && repo),
    error: null,
  });

  useEffect(() => {
    if (!owner || !repo) return;
    if (ssrMatch) return;

    const controller = new AbortController();

    getProjectDetail(owner, repo, controller.signal)
      .then((data) => {
        setState({ data, loading: false, error: null });
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
  }, [owner, repo]);

  return state;
}
