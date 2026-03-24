import type { SSRData } from "@/context/DataContext";

declare global {
  interface Window {
    __SSR_DATA__?: SSRData;
  }
}

export {};
