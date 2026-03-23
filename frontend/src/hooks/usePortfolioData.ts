import { useEffect, useState } from "react";

import { getPortfolioData } from "@/lib/apiClient";
import type { PortfolioData } from "@/types/api";

type State = {
  data: PortfolioData | null;
  loading: boolean;
  error: string | null;
};

export function usePortfolioData() {
  const [state, setState] = useState<State>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    getPortfolioData(controller.signal)
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
  }, []);

  return state;
}
