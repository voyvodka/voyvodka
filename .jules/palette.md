## 2024-05-24 - Focus visible styles missing
**Learning:** The application was completely missing `focus-visible` styles for interactive elements, which is a major accessibility issue for keyboard users.
**Action:** Added global `focus-visible` styles to `a`, `button`, and `.btn` elements in `frontend/src/styles.css` using the existing `--blue` design token.

## 2024-04-26 - Visually accessible loading states
**Learning:** Returning `null` during loading states creates a blank screen for users on slower networks and provides no context to screen reader users.
**Action:** Always return a visually accessible loading indicator with `role="status"` and `aria-live="polite"` to provide immediate feedback instead of returning `null`.
## 2024-04-29 - Making Heatmaps Accessible
**Learning:** Interactive data visualizations built with standard HTML elements (like `<span>` used as cells in a heatmap grid) are completely inaccessible to keyboard and screen reader users out of the box, as they only support mouse-hover events by default.
**Action:** Always add `tabIndex={0}`, keyboard focus handlers (`onFocus`/`onBlur` mirroring the hover logic), and semantic roles (`role="img"` and `aria-label`) to ensure full parity between mouse users and assistive technology users for interactive micro-visualizations.
