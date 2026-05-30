# PrimeCV — Security Assessment Report

**Date:** 2026-05-26  
**Project:** PrimeCV (ATS-optimised CV builder)  
**Scope:** Full-stack application (Vite + React + Express + Supabase + Stripe + Netlify)

---

## 1. Dependency Vulnerabilities

| Severity | Package | Direct? | Range | Issue |
|----------|---------|---------|-------|-------|
| **HIGH** | vite | Yes | ≤6.4.1 | Path traversal in optimised deps; arbitrary file read via dev server WebSocket |
| MOD | express | Yes | ≥4.21.0 | qs denial-of-service |
| MOD | dompurify | No | ≤3.3.3 | Multiple XSS bypasses (CVE-2025-26791 et al.) |
| MOD | postcss | No | <8.5.10 | XSS via unescaped `</style>` |
| MOD | qs | No | 6.11.1–6.15.1 | DoS crash on null/undefined entries |

**Remediation:** `npm audit fix` resolves all of these.

---

## 2. API & Server-Side Issues

### 2.1 Supabase Service Role Key on the Server
- **File:** `api/app.ts:9`
- The `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security.
- It is correctly scoped to the server only (not in Vite env vars), but if the API process or Netlify function is compromised, an attacker has full database access.
- **Recommendation:** Restrict the key's network access in Supabase dashboard; consider using a separate restricted key for server-side operations.

### 2.2 No Rate Limiting
- `/api/create-checkout-session` and `/api/create-portal-session` have no rate limiting.
- An attacker could spam Stripe session creation, incurring costs or harvesting metadata.
- **Recommendation:** Add rate limiting (e.g., `express-rate-limit`) on all POST endpoints.

### 2.3 Unvalidated Stripe Webhook Metadata
- **File:** `api/app.ts:47`
- `session.metadata.uid` is used directly in a database update without validation.
- If Stripe metadata were ever manipulated (e.g., via a compromised merchant account), an attacker could update arbitrary user records.
- **Recommendation:** Validate that `uid` exists in the database before applying the update; use parameterised queries.

### 2.4 Server Listens on `0.0.0.0`
- **File:** `server.ts:22`
- The development server binds to all network interfaces.
- **Recommendation:** Bind to `127.0.0.1` in development unless remote access is required.

### 2.5 No CSRF Protection
- All POST endpoints accept requests without CSRF tokens or origin/referrer validation.
- **Recommendation:** Add `same-origin` checks or CSRF tokens for critical endpoints.

---

## 3. Authentication & Session Security

### 3.1 Supabase Stub Bypass
- **File:** `supabase.ts:151-160`
- When `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` are missing, a stub client auto-authenticates as `demo@primecv.co.uk` with `is_pro: true`.
- If env vars are misconfigured in production, all users bypass authentication entirely.
- **Recommendation:** Crash on startup if Supabase env vars are missing in production, or disable the stub in production builds.

### 3.2 Hardcoded Admin Email
- **Files:** `AuthModal.ts:33`, `App.tsx:236`
- `rjcosta@gmail.com` is hardcoded as an admin — any user with this email automatically gets `is_pro: true` at sign-in.
- Email ownership is not verified before granting admin privileges.
- **Recommendation:** Remove the hardcoded email check; use a database-level admin flag or Supabase custom claims.

### 3.3 No Password Strength Enforcement
- Sign-up accepts any password with no minimum length or complexity requirements.
- **Recommendation:** Enforce minimum password length (8+ characters) on the client and configure Supabase Auth password strength settings.

### 3.4 No MFA Support
- Multi-factor authentication is not configured.
- **Recommendation:** Enable MFA in Supabase Auth for admin accounts.

---

## 4. Secrets & Credential Exposure

### 4.1 .env File
- **File:** `.env`
- Contains placeholder placeholder secrets (`sk_test_placeholder`, `whsec_placeholder`). No real production keys committed. ✅
- **Recommendation:** Ensure `.env` is never committed (`.gitignore` already excludes it). ✅

### 4.2 Stripe Price IDs Hardcoded Client-Side
- **Files:** `App.tsx:62-64`, `LandingPage.tsx:37-39`
- Stripe price IDs are hardcoded in the frontend source code.
- While price IDs are public by design, hardcoding them means any pricing change requires a rebuild and redeploy.
- **Recommendation:** Move price IDs to environment variables.

### 4.3 No Production Credentials in Repository
- No real API keys, tokens, or secrets were found in the codebase. ✅

---

## 5. Client-Side XSS & Data Handling

### 5.1 Unsanitised Markdown Rendering
- **File:** `App.tsx` (uses `react-markdown`)
- CV content is user-controlled and rendered via `react-markdown` without sanitisation.
- An attacker who crafts malicious markdown could inject arbitrary HTML/JavaScript into the preview.
- **Recommendation:** Sanitise output with DOMPurify or similar before rendering.

### 5.2 `eval()` in Browser Agent
- **File:** `browser-agent.cjs:75`
- The `eval` command executes arbitrary JavaScript received as command-line arguments.
- A local privilege escalation risk if the script is invoked with untrusted input.
- **Recommendation:** Remove the `eval` command or restrict it to trusted users only.

### 5.3 CV Data Stored in localStorage
- **File:** `App.tsx:73-82`
- CV data (potentially containing personal information) is stored unencrypted in `localStorage`.
- **Recommendation:** Avoid storing sensitive PII client-side. At minimum, clear on session end.

### 5.4 No Content Security Policy (CSP)
- No CSP headers are set in `netlify.toml` or Vite config.
- **Recommendation:** Add CSP headers via Netlify headers file or Vite plugin.

---

## 6. Infrastructure & Deployment

### 6.1 No Security Middleware
- Express `helmet` middleware is not used.
- No HSTS, X-Content-Type-Options, X-Frame-Options, or XSS-Protection headers are set.
- **Recommendation:** Add `helmet` middleware.

### 6.2 HTTP in Development
- **Files:** `vite.config.ts:16`, `server.ts:22`
- Dev servers run on HTTP with no forced HTTPS.
- **Recommendation:** Use HTTPS in development with self-signed certificates.

### 6.3 SPA Catch-All Redirect
- **File:** `netlify.toml:13-16`
- All routes redirect to `index.html`. Every URL returns an HTML page, which could aid phishing or content injection.
- **Recommendation:** Add more specific route handling before the catch-all.

---

## 7. Compliance & Privacy

| Requirement | Status | Notes |
|-------------|--------|-------|
| GDPR consent checkbox | ✅ Present | Stored as `gdpr_consent` field |
| Privacy Policy | ✅ Present | Shown in LegalModal |
| Terms of Service | ✅ Present | Shown in LegalModal |
| Data deletion (self-service) | ❌ Missing | Policy mentions right to delete, but no UI or endpoint exists |
| Cookie consent banner | ❌ Missing | Not needed currently (no tracking cookies), but required if analytics are added |
| Data retention policy | ❌ Not documented | No retention schedule defined |

---

## 8. Summary: Risk Heatmap

| # | Finding | Severity | Effort to Fix | Priority |
|---|---------|----------|---------------|----------|
| 1 | Dependency vulnerabilities (Vite HIGH + 4 MOD) | **High** | Low | **P0** |
| 2 | Stub auth bypass in production | **High** | Low | **P0** |
| 3 | Unsanitised markdown rendering (XSS) | **High** | Low | **P0** |
| 4 | Hardcoded admin email bypass | **High** | Low | **P1** |
| 5 | No rate limiting on Stripe endpoints | Medium | Low | **P1** |
| 6 | Unvalidated webhook metadata | Medium | Low | **P1** |
| 7 | `eval()` in browser agent | Medium | Low | **P2** |
| 8 | No CSP / security headers | Medium | Medium | **P2** |
| 9 | Server binds `0.0.0.0` | Low | Low | **P3** |
| 10 | Price IDs hardcoded | Low | Low | **P3** |

---

*Assessment performed by opencode. Fix recommendations are available on request.*
