import { useEffect } from "react";

export function useDocumentTitle(title: string) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      document.title = title;
    }
  }, [title]);
}
