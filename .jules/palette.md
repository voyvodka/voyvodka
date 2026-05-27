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

## 2024-05-27 - Main navigation accessibility
**Learning:** Screen readers announce `<nav>` elements as a "navigation landmark," but without an explicit label, users lack context about its purpose, particularly if a page has multiple navigations (e.g., footer, breadcrumbs).
**Action:** Always add an explicit label like `aria-label="Main Navigation"` to primary navigation landmarks to clarify their role for assistive technology users.
## 2024-05-15 - Improve accessibility of generic links and decorative characters
**Learning:** Screen readers read link text out of context (e.g. from a links list). Repeated generic links like "view all", "profile", "Open on GitHub", or "Repository" lack context. Additionally, decorative text characters like "→" or "↗" are often read aloud, creating noise.
**Action:** Always add descriptive `aria-label`s to generic links (e.g., `aria-label="View all latest repositories"`) and hide decorative text characters from screen readers using `<span aria-hidden="true">`.
## 2024-05-28 - Do not overwrite descriptive link text with static aria-labels
**Learning:** Adding a static `aria-label` (e.g., "View all repositories") to a link that contains dynamic, descriptive text (e.g., "View all {totalProjects} repositories") is a regression. `aria-label` completely overrides the element's inner text for screen readers, masking useful contextual data.
**Action:** Do not add `aria-label`s to links that already have sufficient visible text; instead, let the screen reader read the text and only hide purely decorative elements (like `→`) using `aria-hidden="true"`.
## 2025-02-20 - Screen Reader Accessibility for Links and Arrows
**Learning:** Decorative characters (like `→`) in links are often read aloud by screen readers, creating noise, and generic text links (like "CORE" or "CONTRIB" badges) lack context for visually impaired users.
**Action:** Always wrap decorative text characters in `<span aria-hidden="true">` inside links or buttons. Add descriptive `aria-label`s to generic links that rely on visual context (such as placement near a project title) to be understood.

## 2025-02-21 - Scroll Position Retention in SPAs
**Learning:** Single-page applications built with React Router often retain scroll position across route changes. This creates a confusing experience when navigating from the bottom of one page to another page, leaving the user scrolled halfway down the new page content.
**Action:** Always include a `ScrollToTop` component that listens to `useLocation().pathname` and calls `window.scrollTo(0, 0)` on route transitions in the root Layout of SPAs.

## 2024-05-16 - Focus management during SPA navigation
**Learning:** In React SPAs, screen readers often lose context on navigation because the page doesn't do a full refresh. While `window.scrollTo` visually resets the view, assistive technologies need programmatic focus to announce the new page content.
**Action:** Implemented a component that listens to `useLocation().pathname`, scrolls to top, and programmatically applies `.focus({ preventScroll: true })` to the structural `#main-content` container. Combined this with `#main-content:focus { outline: none; }` to hide the focus ring for mouse users, ensuring a smooth experience for both visual and screen reader users.

## 2024-05-25 - Dynamic Document Title in React SPAs
**Learning:** Client-side routing in React SPAs does not automatically update `document.title` on route changes. This breaks context for screen reader users who rely on the document title to understand what page they are currently on after navigation.
**Action:** Always implement a programmatic `document.title` update (e.g., in a `useEffect` tied to the location `pathname`) alongside focus management (like `.focus()` on `#main-content`) when building accessible client-side routing.

## 2024-05-29 - Contextual aria-labels for generic links
**Learning:** Screen readers read link text out of context, meaning generic generic text links like `username/repo` lack context.
**Action:** Added a descriptive `aria-label` to generic links, e.g., `<a aria-label="View username/repo on GitHub">`.
