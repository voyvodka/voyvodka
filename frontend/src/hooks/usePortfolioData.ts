import { useEffect, useState } from "react";

import { getPortfolioData } from "@/lib/apiClient";
import type { PortfolioData } from "@/types/api";

declare global {
  interface Window {
    __PORTFOLIO_SEED__?: PortfolioData;
  }
}

const CACHE_KEY = "portfolio_data_cache";

type State = {
  data: PortfolioData | null;
  loading: boolean;
  error: string | null;
};

function readCache(): PortfolioData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw) as PortfolioData;
  } catch {
  }
  if (typeof window !== "undefined" && window.__PORTFOLIO_SEED__) {
    return window.__PORTFOLIO_SEED__;
  }
  return null;
}

function writeCache(data: PortfolioData) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
  }
}

export function usePortfolioData() {
  const cached = readCache();
  const [state, setState] = useState<State>({
    data: cached,
    loading: cached === null,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    getPortfolioData(controller.signal)
      .then((data) => {
        writeCache(data);
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
  }, []);

  return state;
}
