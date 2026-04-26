## 2024-04-26 - Visually accessible loading states
**Learning:** Returning `null` during loading states creates a blank screen for users on slower networks and provides no context to screen reader users.
**Action:** Always return a visually accessible loading indicator with `role="status"` and `aria-live="polite"` to provide immediate feedback instead of returning `null`.
