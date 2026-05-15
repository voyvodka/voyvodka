import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import type { ReactNode } from "react";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Only scroll if window is defined (avoiding SSR errors)
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [pathname]);

  return null;
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <ScrollToTop />
      <a href="#main-content" className="skip-link">Skip to main content</a>
      {children}
    </>
  );
}
