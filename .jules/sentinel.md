## 2024-05-24 - [Sanitize Markdown SSR Output to Prevent XSS]
**Vulnerability:** XSS (Cross-Site Scripting) vulnerability during Server-Side Rendering (SSR). Markdown generated via `marked.parse` for project READMEs and Changelogs was directly inserted into the DOM using React's `dangerouslySetInnerHTML` without any HTML sanitization.
**Learning:** Even when fetching data from trusted sources (like GitHub API), any HTML rendered from markdown that contains raw HTML strings could execute malicious scripts if not sanitized, especially in an SSR context where the output goes directly to the client.
**Prevention:** Always use a sanitization library like `isomorphic-dompurify` in Node.js/SSR environments to sanitize any HTML output before passing it to `dangerouslySetInnerHTML`.
