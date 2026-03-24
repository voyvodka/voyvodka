import { useEffect, useState } from "react";

import { getPortfolioData } from "@/lib/apiClient";
import type { PortfolioData } from "@/types/api";
import { useSSRData } from "@/context/DataContext";

type State = {
  data: PortfolioData | null;
  loading: boolean;
  error: string | null;
};

export function usePortfolioData() {
  const { portfolioData: ssrPortfolioData } = useSSRData();

  const [state, setState] = useState<State>({
    data: ssrPortfolioData ?? null,
    loading: ssrPortfolioData == null,
    error: null,
  });

  useEffect(() => {
    if (ssrPortfolioData) return;

    const controller = new AbortController();

    getPortfolioData(controller.signal)
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
  }, []);

  return state;
}
