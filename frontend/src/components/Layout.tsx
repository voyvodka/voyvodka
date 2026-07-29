import { useEffect } from "react";
import { useLocation } from "react-router";
import type { ReactNode } from "react";

import { useSSRData } from "@/context/DataContext";
import { getPageMeta } from "@/lib/meta";

function RouteChangeHandler() {
  const { pathname } = useLocation();
  const { portfolioData, projectDetail } = useSSRData();

  useEffect(() => {
    // Only execute if window is defined (avoiding SSR errors)
    if (typeof window !== "undefined") {
      const meta = getPageMeta(pathname, portfolioData, projectDetail);
      document.title = meta.title;

      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      const mainContent = document.getElementById("main-content");
      if (mainContent) {
        mainContent.focus({ preventScroll: true });
      }
    }
  }, [pathname]);

  return null;
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <RouteChangeHandler />
      <a href="#main-content" className="skip-link">Skip to main content</a>
      {children}
    </>
  );
}
