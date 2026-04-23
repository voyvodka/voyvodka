## 2025-04-23 - Screen-reader friendly loading states
**Learning:** Returning `null` during component load state (e.g. `if (loading) return null;`) prevents the screen reader from indicating that a process is occurring, and provides zero visual feedback, leaving users wondering if the app has frozen.
**Action:** Always provide a loading state with `role="status"` and `aria-live="polite"` to communicate async operations without interrupting the user's flow.
