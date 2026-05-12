import type { ReactNode } from "react";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      {children}
    </>
  );
}
