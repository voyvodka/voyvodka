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
## 2025-05-01 - [Path Traversal in HTTP Route Path Values]
**Vulnerability:** Path Traversal / SSRF risk in Go's HTTP router. Go 1.22's `http.ServeMux` URL pattern matching allows capturing wildcards from paths (like `{repo}` and `{owner}`). However, if a caller sends URL-encoded slashes (`%2F`) or traversal segments (`..%2F`), `ServeMux` unescapes the path values before they reach the handler or external requests. These unsanitized values were directly appended to an external API URL (`/repos/%s/%s`), potentially leading to SSRF or unauthorized resource access.
**Learning:** `r.PathValue` values are derived from URL-encoded strings and are NOT inherently sanitized against traversal attacks. Assuming path variables are safe just because a router captured them without slashes is dangerous.
**Prevention:** Always implement strict allowlist-based input validation on dynamic URL path parameters BEFORE using them to construct paths, file system queries, or external API URLs. Disallow dots, traversals, and non-alphanumeric characters unless explicitly required.

## 2026-05-02 - [Fix Express Proxy SSRF via URL Encoded Path Traversal]
**Vulnerability:** The SSR Express proxy `/api` concatenated `req.url` to the backend URL without sanitization. Node.js `req.url` retains URL-encoded path characters like `%2e%2e` and `%2f`. Since the `fetch` API doesn't fully resolve encoded traversals or treats them as literal characters, they can be blindly passed down to the backend, bypassing frontend path-matching boundaries and allowing internal SSRF.
**Learning:** Middleware intended to constrain paths to specific boundaries (e.g. `/api/*`) must fully decode and securely parse the request URI. Just passing `req.url` through creates a mismatch between Express's frontend routing (which handles the literal `%2e%2e` as part of the path) and the backend's decoding behavior.
**Prevention:** Always decode and normalize proxied URLs. A robust way is wrapping `decodeURIComponent(req.url)` inside a `try/catch` (failing on 400), and validating the resolved path against a boundary by checking `new URL('/api' + decoded, 'http://localhost').pathname`.

## 2026-05-03 - [Fix Express Proxy SSRF via URL Encoded Path Traversal Part 2]
**Vulnerability:** Even after decoding and securely parsing the request URI, the SSR Express proxy `/api` was still appending the unsafe `req.url` directly to the `target` URL (e.g., `const target = \`\${API_BASE_URL}/api\${req.url}\`;`). This re-introduced the URL-encoded path traversal (e.g., `%2e%2e`) into the final fetch request.
**Learning:** Checking a safely parsed URL (`checkUrl.pathname`) for path boundaries is useless if you ultimately forward the unparsed, raw `req.url`. Both validation AND target construction must rely on the normalized, sanitized path.
**Prevention:** Always use the normalized properties of the WHATWG `URL` object (e.g., `checkUrl.pathname` and `checkUrl.search`) to construct downstream proxy requests, completely discarding the raw `req.url` in the proxy forwarding step.

## 2026-05-15 - [Fix Open Redirect via Trailing Slash Normalization]
**Vulnerability:** The trailing slash normalization middleware in Express sliced `req.path` to remove the trailing slash and used it directly in `res.redirect(301, ...)`. If a user visited a URL with multiple leading slashes like `//evil.com/`, the path became `//evil.com`. Browsers interpret double leading slashes as a protocol-relative absolute URL (e.g., `https://evil.com`), resulting in an Open Redirect.
**Learning:** `req.path` in Express retains multiple leading slashes (e.g., `//foo/` -> `//foo/`). Truncating a trailing slash does not make a path safe for redirection; the browser's interpretation of protocol-relative URLs (`//`) means internal path redirection can be hijacked to external domains.
**Prevention:** Always normalize multiple leading slashes to a single slash (e.g., `.replace(/^\/+/, '/')`) before passing paths to redirect functions when intending to keep redirects relative/internal to the site.

## 2026-06-25 - [Escape title in SSR to prevent XSS]
**Vulnerability:** Unescaped variables injected directly into the HTML `<title>` tag during Server-Side Rendering (SSR). While other attributes were escaped with `escapeAttr`, the inner text of the `<title>` tag used raw string interpolation (`<title>${meta.title}</title>`).
**Learning:** In HTML generation, any dynamic input interpolated into elements (like `<title>`) must be safely HTML encoded. If an attacker controls `meta.title`, they can input `</title><script>alert(1)</script>` to break out and execute scripts.
**Prevention:** Always use a utility function like `escapeAttr` to HTML-encode variables before interpolating them into HTML tags.

## 2024-06-25 - [Missing Input Length Limits (DoS Risk)]
**Vulnerability:** Denial of Service (DoS) vulnerability. Dynamic URL path variables (e.g., GitHub repo and owner names) were validated for valid characters but lacked an explicit length limit.
**Learning:** Even if basic character validation is present, processing arbitrarily long external strings without bounds can lead to excessive memory allocation or processing exhaustion.
**Prevention:** Always enforce an explicit input length limit (e.g., `len(name) > 100`) on dynamic URL path variables or external string inputs, even when basic character validation is already present.

## 2026-06-28 - [Missing ReadHeaderTimeout (Slowloris DoS Risk)]
**Vulnerability:** The Go backend's `http.Server` was configured with `ReadTimeout` and `WriteTimeout`, but `ReadHeaderTimeout` was omitted. This leaves the server vulnerable to Slowloris Denial of Service (DoS) attacks, where attackers send HTTP headers very slowly to exhaust server connections.
**Learning:** `ReadTimeout` covers the entire request reading process, but an explicit `ReadHeaderTimeout` is required to ensure clients cannot hold connections open indefinitely during the initial header transmission phase.
**Prevention:** Always explicitly configure `ReadHeaderTimeout` (e.g., `5 * time.Second`) on `http.Server` structs in Go applications to defend against Slowloris DoS attacks.

## 2026-06-29 - [Missing Input Length Limit on Hashed Secrets (DoS Risk)]
**Vulnerability:** Denial of Service (DoS) vulnerability via CPU exhaustion. The `forceRefresh` endpoint hashed the `X-API-Key` header without any length limit before comparing it. An attacker could send an extremely long string, causing the server to consume excessive CPU cycles to hash the input.
**Learning:** While hashing user input prevents timing attacks on secret lengths, doing so without bounds exposes the server to resource exhaustion. Any operation whose execution time scales with input size (like cryptographic hashing) must have strict input boundaries.
**Prevention:** Always enforce an explicit input length limit (e.g., `len(key) > 256`) on secrets, passwords, or tokens BEFORE passing them to cryptographic hashing functions.

## 2026-06-30 - [Missing io.LimitReader on External HTTP Responses (DoS Risk)]
**Vulnerability:** Denial of Service (DoS) vulnerability via memory exhaustion. The Go backend's GitHub client directly read external HTTP response bodies (`resp.Body`) without limits using `io.ReadAll` and `json.NewDecoder`. A malicious or compromised upstream could send an excessively large response, causing the server to allocate unbounded memory and crash.
**Learning:** External API responses cannot be fully trusted. Reading them into memory without bounds exposes the application to DoS attacks.
**Prevention:** Always wrap external HTTP response bodies (e.g., `resp.Body`) with `io.LimitReader` in Go before reading or JSON decoding to enforce a maximum payload size.

## 2026-07-02 - [Fix Query String Extraction Vulnerability in Middleware]
**Vulnerability:** The trailing slash normalization middleware in Express incorrectly extracted the query string using `req.url.slice(req.path.length)`. `req.url` retains URL-encoded characters and can be an absolute URI, while `req.path` is decoded. Length mismatches lead to corrupted query string extraction or potential vulnerabilities like Open Redirect or cache poisoning.
**Learning:** URL-encoded characters cause length mismatches between the raw `req.url` and decoded `req.path`. String slicing based on length is fragile and unsafe for URL processing.
**Prevention:** Always use the WHATWG `URL` constructor (e.g., `new URL(req.url, 'http://localhost')`) to parse and extract URL components like `.search` safely, rather than relying on manual string slicing.
