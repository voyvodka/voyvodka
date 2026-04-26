## 2024-05-24 - [Sanitize Markdown SSR Output to Prevent XSS]
**Vulnerability:** XSS (Cross-Site Scripting) vulnerability during Server-Side Rendering (SSR). Markdown generated via `marked.parse` for project READMEs and Changelogs was directly inserted into the DOM using React's `dangerouslySetInnerHTML` without any HTML sanitization.
**Learning:** Even when fetching data from trusted sources (like GitHub API), any HTML rendered from markdown that contains raw HTML strings could execute malicious scripts if not sanitized, especially in an SSR context where the output goes directly to the client.
**Prevention:** Always use a sanitization library like `isomorphic-dompurify` in Node.js/SSR environments to sanitize any HTML output before passing it to `dangerouslySetInnerHTML`.

## 2025-04-26 - [Safe JSON Serialization for DOM Injection]
**Vulnerability:** XSS (Cross-Site Scripting) vulnerability during Server-Side Rendering (SSR). Serialized JSON payloads injected into `<script>` tags (e.g., `window.__SSR_DATA__`, `application/ld+json`) using `JSON.stringify()` were not escaped.
**Learning:** If a JSON payload contains strings like `</script>`, it can prematurely close the `<script>` tag and allow execution of subsequent malicious HTML or JavaScript.
**Prevention:** Always escape `<` characters in JSON strings injected into the DOM by appending `.replace(/</g, "\\u003c")` to the `JSON.stringify()` output to prevent tag breakout.
