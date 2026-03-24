import { createContext, useContext } from "react";

import type { PortfolioData, ProjectDetail } from "@/types/api";

export type SSRData = {
  portfolioData?: PortfolioData;
  projectDetail?: ProjectDetail;
};

const DataContext = createContext<SSRData>({});

export function DataProvider({ value, children }: { value: SSRData; children: React.ReactNode }) {
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useSSRData(): SSRData {
  return useContext(DataContext);
}
