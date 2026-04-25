## 2024-05-18 - Avoid returning null for loading states
**Learning:** Returning `null` during async loading creates an empty screen that screen readers cannot interpret, providing no feedback to users.
**Action:** Always return a visually accessible loading indicator with `role="status"` and `aria-live="polite"` to provide proper feedback.
