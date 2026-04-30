## 2024-05-14 - Add skip to content link

**Learning:** This app didn't have a "Skip to main content" link, making navigation difficult for screen reader users and keyboard-only users who have to tab through header navigation every time.
**Action:** Always verify a keyboard navigation bypass like a skip link exists at the very start of the layout component for accessible, fast navigation.

## 2024-05-14 - Adding tabIndex for skip link target

**Learning:** When using skip links in React/SPAs, simply adding `id="main-content"` isn't always enough because older browsers or specific screen readers might not correctly shift programmatic focus to a non-interactive element like `<main>`.
**Action:** Always add `tabIndex={-1}` to the target container of a skip link (e.g., `<main id="main-content" tabIndex={-1}>`) to ensure focus is reliably managed.
