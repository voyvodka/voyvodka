## 2024-05-24 - [Sanitize Markdown SSR Output to Prevent XSS]
**Vulnerability:** XSS (Cross-Site Scripting) vulnerability during Server-Side Rendering (SSR). Markdown generated via `marked.parse` for project READMEs and Changelogs was directly inserted into the DOM using React's `dangerouslySetInnerHTML` without any HTML sanitization.
**Learning:** Even when fetching data from trusted sources (like GitHub API), any HTML rendered from markdown that contains raw HTML strings could execute malicious scripts if not sanitized, especially in an SSR context where the output goes directly to the client.
**Prevention:** Always use a sanitization library like `isomorphic-dompurify` in Node.js/SSR environments to sanitize any HTML output before passing it to `dangerouslySetInnerHTML`.

## 2025-04-26 - [Safe JSON Serialization for DOM Injection]
**Vulnerability:** XSS (Cross-Site Scripting) vulnerability during Server-Side Rendering (SSR). Serialized JSON payloads injected into `<script>` tags (e.g., `window.__SSR_DATA__`, `application/ld+json`) using `JSON.stringify()` were not escaped.
**Learning:** If a JSON payload contains strings like `</script>`, it can prematurely close the `<script>` tag and allow execution of subsequent malicious HTML or JavaScript.
**Prevention:** Always escape `<` characters in JSON strings injected into the DOM by appending `.replace(/</g, "\\u003c")` to the `JSON.stringify()` output to prevent tag breakout.

## 2025-04-27 - Timing attack vulnerability in API key comparison
**Vulnerability:** The internal refresh endpoint used a standard string comparison (`!=`) to validate the `X-API-Key` header against the configured internal API key.
**Learning:** Standard string comparisons terminate early if a character mismatch is found. This creates a timing vulnerability where an attacker can theoretically infer the correct API key by measuring the response time of requests, discovering the key one character at a time.
**Prevention:** Always use `crypto/subtle.ConstantTimeCompare` (or equivalent in other languages) when comparing secrets, passwords, tokens, or API keys to ensure the comparison time is independent of the input contents.
## 2024-05-18 - Fix API Key Length Leakage via Timing Attack
**Vulnerability:** The `forceRefresh` endpoint in `backend/internal/http/handlers.go` was vulnerable to a timing attack. It used `crypto/subtle.ConstantTimeCompare` directly on byte slices of potentially different lengths. Since `ConstantTimeCompare` returns immediately if the lengths do not match, an attacker could observe the execution time to infer the length of the expected secret (`internalAPIKey`).
**Learning:** `crypto/subtle.ConstantTimeCompare` only provides constant-time comparison when the lengths of the two inputs are equal. If the lengths differ, it short-circuits. When comparing user input against secrets where the length itself is sensitive, using `ConstantTimeCompare` directly leaks information about the secret's length.
**Prevention:** Before comparing a secret of unknown or variable length with user input, hash both values (e.g., using `crypto/sha256.Sum256`). Hashing ensures that both byte slices have the same length (e.g., 32 bytes for SHA-256), completely avoiding length-based early returns in `ConstantTimeCompare` and protecting the secret's length from being leaked via timing side channels.
