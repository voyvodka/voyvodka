import { useEffect } from "react";
import { useLocation } from "react-router";
import type { ReactNode } from "react";

import { useSSRData } from "@/context/DataContext";
import { homeCopy, localeFromPath } from "@/i18n/home";
import { getPageMeta } from "@/lib/meta";

function RouteChangeHandler() {
  const { pathname } = useLocation();
  const { portfolioData, projectDetail } = useSSRData();

  useEffect(() => {
    // Only execute if window is defined (avoiding SSR errors)
    if (typeof window !== "undefined") {
      const meta = getPageMeta(pathname, portfolioData, projectDetail);
      document.title = meta.title;
      document.documentElement.lang = localeFromPath(pathname);

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
  const { pathname } = useLocation();
  return (
    <>
      <RouteChangeHandler />
      <a href="#main-content" className="skip-link">{homeCopy[localeFromPath(pathname)].skipLink}</a>
      {children}
    </>
  );
}
