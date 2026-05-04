## 2024-05-24 - Focus visible styles missing
**Learning:** The application was completely missing `focus-visible` styles for interactive elements, which is a major accessibility issue for keyboard users.
**Action:** Added global `focus-visible` styles to `a`, `button`, and `.btn` elements in `frontend/src/styles.css` using the existing `--blue` design token.

## 2024-04-26 - Visually accessible loading states
**Learning:** Returning `null` during loading states creates a blank screen for users on slower networks and provides no context to screen reader users.
**Action:** Always return a visually accessible loading indicator with `role="status"` and `aria-live="polite"` to provide immediate feedback instead of returning `null`.
## 2024-04-29 - Making Heatmaps Accessible
**Learning:** Interactive data visualizations built with standard HTML elements (like `<span>` used as cells in a heatmap grid) are completely inaccessible to keyboard and screen reader users out of the box, as they only support mouse-hover events by default.
**Action:** Always add `tabIndex={0}`, keyboard focus handlers (`onFocus`/`onBlur` mirroring the hover logic), and semantic roles (`role="img"` and `aria-label`) to ensure full parity between mouse users and assistive technology users for interactive micro-visualizations.

## 2024-05-14 - Add skip to content link
**Learning:** This app didn't have a "Skip to main content" link, making navigation difficult for screen reader users and keyboard-only users who have to tab through header navigation every time.
**Action:** Always verify a keyboard navigation bypass like a skip link exists at the very start of the layout component for accessible, fast navigation.

## 2024-05-14 - Adding tabIndex for skip link target
**Learning:** When using skip links in React/SPAs, simply adding `id="main-content"` isn't always enough because older browsers or specific screen readers might not correctly shift programmatic focus to a non-interactive element like `<main>`.
**Action:** Always add `tabIndex={-1}` to the target container of a skip link (e.g., `<main id="main-content" tabIndex={-1}>`) to ensure focus is reliably managed.

## 2024-05-24 - Focus visible styles for custom interactive elements
**Learning:** Even when `tabIndex={0}` is added to custom interactive elements (like heatmap cells) to make them keyboard focusable, they are practically invisible to sighted keyboard users unless explicit `focus-visible` styles are provided. Furthermore, tightly packed grid elements may require `position: relative; z-index: 1;` so their focus outline isn't clipped by adjacent elements.
**Action:** Always ensure that custom interactive components given `tabIndex={0}` also receive `focus-visible` styling (including `outline` and necessary layout tweaks like `z-index`) so their focus state is visually apparent.
## 2024-05-24 - Provide Actionable Recovery from Dead-end States
**Learning:** Returning plain text paragraphs for UI error boundaries or empty states (e.g., "Project not found") creates a dead-end experience and lacks screen reader announcements.
**Action:** Always wrap error/empty state messages in a styled container with `role="alert"` for accessibility, and provide an explicit navigation fallback (like a "Return Home" or "View All" link) so users are not forced to rely on browser navigation to recover.
