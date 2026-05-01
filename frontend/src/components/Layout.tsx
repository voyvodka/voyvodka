import type { PropsWithChildren } from "react";

export function Layout({ children }: PropsWithChildren) {
  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      {children}
    </>
  );
}
