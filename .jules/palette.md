## 2024-05-24 - Focus visible styles missing
**Learning:** The application was completely missing `focus-visible` styles for interactive elements, which is a major accessibility issue for keyboard users.
**Action:** Added global `focus-visible` styles to `a`, `button`, and `.btn` elements in `frontend/src/styles.css` using the existing `--blue` design token.

## 2024-04-26 - Visually accessible loading states
**Learning:** Returning `null` during loading states creates a blank screen for users on slower networks and provides no context to screen reader users.
**Action:** Always return a visually accessible loading indicator with `role="status"` and `aria-live="polite"` to provide immediate feedback instead of returning `null`.
