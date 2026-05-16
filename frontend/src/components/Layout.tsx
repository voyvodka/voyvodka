import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import type { ReactNode } from "react";

function RouteChangeHandler() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Only execute if window is defined (avoiding SSR errors)
    if (typeof window !== "undefined") {
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
