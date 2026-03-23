import { useEffect, useState } from "react";

import { getProjectDetail } from "@/lib/apiClient";
import type { ProjectDetail } from "@/types/api";

type State = {
  data: ProjectDetail | null;
  loading: boolean;
  error: string | null;
};

export function useProjectDetail(owner: string, repo: string) {
  const [state, setState] = useState<State>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!owner || !repo) return;
    const controller = new AbortController();

    getProjectDetail(owner, repo, controller.signal)
      .then((data) => {
        setState({ data, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({
          data: null,
          loading: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      });

    return () => {
      controller.abort();
    };
  }, [owner, repo]);

  return state;
}
