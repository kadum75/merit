# Cybersecurity Audit — Merit CV Builder

**Date:** 4 June 2026
**Scope:** API backend, React frontend, Supabase database, infrastructure, dependencies
**Previous findings excluded:** Admin email backdoor (`src/App.tsx:490`) — **FIXED** (0b7cebf)

---

## Severity Legend

| Level | Meaning |
|-------|---------|
| 🔴 **CRITICAL** | Immediate exploitation possible with known impact |
| 🟠 **HIGH** | Realistic attack vector, significant impact |
| 🟡 **MEDIUM** | Limited exploitability or impact, but should be addressed |
| 🔵 **LOW** | Defence-in-depth, information leakage, minor hardening |
| ✅ **PASS** | Verified as secure |

---

## 1. Database Security (Supabase)

### 1.1 🔴 `SECURITY DEFINER` on `user_stats` view
- **Table:** `public.user_stats`
- **Detail:** View defined with `SECURITY DEFINER` — enforces creator's permissions, not querying user's
- **Severity:** ERROR (Supabase linter)
- **Fix:** Remove `SECURITY DEFINER` — view should use invoker's RLS

### 1.2 🟡 `anon` can `INSERT` to `error_logs` freely
- **Table:** `public.error_logs`
- **Policy:** `insert_logs_anon` — `WITH CHECK (true)` allows unrestricted inserts by anyone
- **Impact:** Attacker can fill the table with garbage, masking real errors or consuming storage
- **Fix:** Restrict `INSERT` to `authenticated` role, or add a check constraint limiting insert fields

### 1.3 🟡 `delete_user_account()` executable by `anon` as `SECURITY DEFINER`
- **Function:** `public.delete_user_account()`
- **Detail:** The `anon` role can call this via `/rest/v1/rpc/delete_user_account` and it runs as `SECURITY DEFINER`
- **Impact:** Any unauthenticated user can call this function. However, it checks `uid = auth.uid()` inside, so it only deletes the calling user's account. Still, running as `SECURITY DEFINER` is unnecessary risk
- **Fix:** Change to `SECURITY INVOKER` or revoke `EXECUTE` from `anon`

### 1.4 🟡 Multiple permissive RLS policies on `users`
- **Detail:** For each role/action on `users`, there are two policies that OR together ("Admin full access" + user-specific policy). This is suboptimal for both performance and clarity
- **Impact:** Performance degradation (both policies evaluated per query). Minor — no security bypass since both policies check `auth.uid()`
- **Fix:** Consolidate into single policy per role/action

### 1.5 🟡 Auth RLS init-plan performance
- **Policy:** `Admin full access` on `users`
- **Detail:** Calls `auth.uid()` directly instead of wrapped in `(SELECT auth.uid())` — causes per-row re-evaluation
- **Impact:** Suboptimal query performance at scale (not a security issue)
- **Fix:** Replace `auth.uid()` with `(SELECT auth.uid())`

### 1.6 🔵 Leaked password protection disabled
- **Detail:** Supabase "Leaked Password Protection" (HaveIBeenPwned check) is not enabled
- **Fix:** Enable in Supabase Auth settings (requires Pro plan)

### 1.7 🔵 Unused indexes
- `idx_error_logs_user_id` — never used
- `idx_webhook_events_event_id` — never used
- `idx_users_uid` — never used
- `idx_cvs_updated_at` — never used
- `idx_cvs_user_uid` — never used
- **Impact:** Wasted storage, minor INSERT/UPDATE overhead
- **Fix:** Drop unused indexes

---

## 2. API Security

### 2.1 🟠 No Price ID whitelist (pricing manipulation)
- **File:** `api/app.ts:200,212-214`
- **Detail:** Client sends any `priceId`, passed directly to Stripe. No server-side validation against allowed IDs
- **Impact:** A user could craft a request with a lower-priced product's Price ID, bypassing intended pricing
- **Fix:** Add server-side whitelist of allowed Price IDs

### 2.2 🟠 No rate limiting on POST endpoints
- **File:** `api/app.ts:189-268`
- **Detail:** `/api/create-checkout-session` and `/api/create-portal-session` have no rate limiting
- **Impact:** Attacker could spam Stripe Checkout session creation, incurring Stripe fees and resource costs
- **Fix:** Add rate limiting (Supabase-based or Vercel Edge middleware, since in-memory doesn't work on serverless)

### 2.3 🟠 `server.ts` missing import for `createApp()`
- **File:** `server.ts:15`
- **Detail:** Calls `createApp()` but never imports it. Local dev via `npm run dev:api` throws `ReferenceError`
- **Impact:** Local API development is broken
- **Fix:** Add `import { createApp } from "./api/app.js";`

### 2.4 🟡 Stripe error messages leaked to client
- **File:** `api/app.ts:222-223,265-266`
- **Detail:** `res.status(500).json({ error: error.message })` — raw Stripe error messages returned to client
- **Impact:** Stripe errors can reveal internal implementation details, API method names, hints about configuration
- **Fix:** Log full error server-side, return generic message

### 2.5 🟡 Webhook `uid` from metadata not validated against DB
- **File:** `api/app.ts:86-100`
- **Detail:** `uid` from Stripe metadata used in `.eq("uid", uid)` without confirming user exists
- **Impact:** If Stripe metadata were manipulated (compromised merchant account), attacker could update arbitrary records
- **Fix:** Validate `uid` exists in `users` table before updating

### 2.6 🟡 `/api/config` leaks system state without auth
- **File:** `api/app.ts:50-52`
- **Detail:** Unauthenticated endpoint returns `{ isStripeConfigured, isSupabaseConfigured }`
- **Impact:** Reconnaissance — attacker can determine backend readiness
- **Fix:** Stricter responses, or require auth

### 2.7 🟡 `STRIPE_WEBHOOK_SECRET` not validated at startup
- **File:** `api/app.ts:61`
- **Detail:** Falls back to `""` if missing, causing confusing 400 errors on every webhook call
- **Impact:** If misconfigured, all webhooks silently fail
- **Fix:** Add startup validation similar to `STRIPE_SECRET_KEY`

### 2.8 🟡 No CORS middleware
- **File:** `api/app.ts`
- **Detail:** API has zero CORS configuration. Vite proxy covers dev, but standalone API rejects cross-origin requests
- **Impact:** If API is run outside Vite proxy, browser requests from different origins fail
- **Fix:** Add `cors()` middleware

### 2.9 🟡 Webhook events acknowledged even if DB unavailable
- **File:** `api/app.ts:67-80,184`
- **Detail:** Returns `{ received: true }` even when Supabase is null and no DB actions were taken
- **Impact:** Stripe considers webhook processed, but user records never updated
- **Fix:** Return error to Stripe if DB is unavailable

### 2.10 🟡 Silent error swallowing in webhook dedup insert
- **File:** `api/app.ts:79`
- **Detail:** `.catch(() => {})` — errors during dedup insert silently swallowed
- **Impact:** Dedup could silently fail, causing duplicate webhook processing
- **Fix:** Log the error at minimum

### 2.11 🔵 Server binds `0.0.0.0` in development
- **File:** `server.ts:24`
- **Detail:** `app.listen(PORT, "0.0.0.0", ...)` exposes API to local network
- **Fix:** Bind to `127.0.0.1` unless remote access needed

### 2.12 🔵 `stripe` typed as `null as unknown as Stripe`
- **File:** `api/app.ts:34`
- **Detail:** TypeScript won't catch null-access errors at compile time
- **Fix:** Use `Stripe | null` and guard accesses

### 2.13 🔵 Incomplete subscription status handling
- **File:** `api/app.ts:104-117`
- **Detail:** `paused` and future Stripe statuses not explicitly handled
- **Fix:** Add explicit handling for all known statuses

---

## 3. Frontend Security

### 3.1 🟠 DOC export — unescaped HTML injection
- **File:** `src/App.tsx:969-975`
- **Detail:** Regex-based markdown-to-HTML conversion doesn't escape user content before inserting into HTML tags. User input like `</h2><img src=x onerror=alert(1)>` in CV fields would be rendered as HTML in the exported `.doc` file
- **Impact:** If the `.doc` file is opened in a browser-based viewer (Google Docs, email preview), injected HTML/JS could execute
- **Fix:** Escape HTML entities (`<`, `>`, `&`, `"`, `'`) in captured groups, or use proper markdown-to-HTML with sanitization

### 3.2 🟠 CSP allows `'unsafe-inline'` and `'unsafe-eval'`
- **File:** `vercel.json:14`
- **Detail:** `script-src 'self' 'unsafe-inline' 'unsafe-eval'` — defeats CSP's primary XSS protection
- **Impact:** Any injection point can execute arbitrary JS. `eval()` also available
- **Fix:** Use nonce/hash-based CSP for production. Vite supports this with `vite-plugin-csp`

### 3.3 🟡 Auth tokens and PII stored unencrypted in localStorage
- **File:** `src/supabase.ts:167`, `src/App.tsx:84`
- **Detail:** Supabase JWT tokens and full CV data (name, email, phone, work history) in `localStorage` unencrypted
- **Impact:** If XSS is found, all data can be exfiltrated. Any JS on the same origin can read it
- **Fix:** Token storage is standard for SPAs (acceptable risk). CV data could use session-only storage or encryption at rest

### 3.4 🟡 No input length limits on any form fields
- **File:** `src/App.tsx:1426-1886`
- **Detail:** All text inputs and textareas lack `maxLength` attributes
- **Impact:** Attacker can submit arbitrarily large payloads, causing storage abuse
- **Fix:** Add `maxLength` to all fields

### 3.5 🟡 `window.location.href` from API response — no URL validation
- **File:** `src/App.tsx:1028,1096`
- **Detail:** Stripe redirect URLs from API are used directly in `window.location.href` without validation
- **Impact:** If backend API is compromised, attacker can redirect to arbitrary URL with auth token in headers
- **Fix:** Validate URL starts with `https://checkout.stripe.com/` or `https://billing.stripe.com/` before navigating

### 3.6 🟡 Supabase stub exposes personal email
- **File:** `src/supabase.ts:26`
- **Detail:** If Supabase env vars are missing, stub auto-authenticates using `rjcosta@gmail.com`
- **Impact:** If production env vars are misconfigured, anyone using the app sees your email as logged-in user
- **Fix:** Crash on startup in production if env vars missing. Use generic email in stub

### 3.7 🟡 Missing config vars exposed in UI
- **File:** `src/App.tsx:1128-1130`
- **Detail:** Shows which environment variables are missing to all users
- **Impact:** Information leakage — aids recon for attackers
- **Fix:** Only show in dev mode or admin panel

### 3.8 🟡 Supabase client exposed on window
- **File:** `src/supabase.ts:180`
- **Detail:** `(window as any).__SUPABASE_CLIENT__ = client`
- **Impact:** Any script on the page has direct access to Supabase client
- **Fix:** Remove this global exposure

### 3.9 🔵 CSP allows `https:` images from any domain
- **File:** `vercel.json:14`
- **Detail:** `img-src 'self' data: https:` — allows image loading from any HTTPS domain
- **Impact:** Web beacons / data exfiltration via CSS image requests are possible
- **Fix:** Restrict `img-src` to known domains

### 3.10 🔵 No CSP violation reporting
- **File:** `vercel.json:14`
- **Detail:** No `report-uri` or `report-to` directive
- **Impact:** CSP bypasses go undetected
- **Fix:** Add `report-uri /api/csp-violation`

### 3.11 🔵 URL fields lack validation (LinkedIn, portfolio, links)
- **File:** `src/App.tsx:1489,1517,1561`
- **Detail:** Accept any string including `javascript:` URIs
- **Impact:** Could be used in DOC export to create dangerous links
- **Fix:** Validate URL format or sanitize output

### 3.12 🔵 Auth error messages shown to users
- **File:** `src/components/AuthModal.tsx:82`
- **Detail:** `setError(err.message)` — raw Supabase auth errors visible in UI
- **Impact:** Could leak configuration details in edge cases
- **Fix:** Map to generic messages

### 3.13 🔵 Hardcoded OAuth redirect URLs (production only)
- **File:** `src/components/AuthModal.tsx:62,95`
- **Detail:** `redirectTo: 'https://merit-cv.vercel.app'` — hardcoded production URL
- **Impact:** Won't work in local dev with different origin
- **Fix:** Derive from `window.location.origin`

---

## 4. Infrastructure & Dependencies

### 4.1 🟠 22 HIGH severity transitive vulnerabilities via `vercel`
- **Detail:** `npm audit` reports 22 HIGH, 7 MODERATE, 1 LOW. All transitive via `vercel` package
- **Key packages:** `path-to-regexp` (3 ReDoS), `minimatch` (3 ReDoS), `undici` (7 advisories), `tar` (3 symlink attacks)
- **Mitigation:** Requires `npm audit fix --force` which downgrades `vercel` from `54.6.1` to `50.41.0` (may be breaking)
- **Note:** These are in the `vercel` CLI package, not production runtime — risk is to CI/CD pipeline, not deployed app

### 4.2 🟡 Supabase stub bypass could activate in production
- **File:** `src/supabase.ts:18-153`
- **Detail:** If `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` are ever blank in Vercel, the app silently falls back to fake auth (auto-login as `rjcosta@gmail.com`)
- **Impact:** Complete auth bypass with zero alerting
- **Fix:** Crash on startup in production if env vars missing

### 4.3 🟡 `.env.production` tracked in git with live keys
- **File:** `.env.production` (tracked)
- **Detail:** Contains live `VITE_SUPABASE_ANON_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`, live Price IDs
- **Impact:** Anyone with repo access has live production keys. Anon key allows database read access; Price IDs can be used in checkout
- **Fix:** Add to `.gitignore`, purge from history with `git filter-repo`

### 4.4 🟡 CSP is permissive + COEP conflicts with Stripe.js
- **File:** `vercel.json`
- **Detail:** `'unsafe-inline'` + `'unsafe-eval'` in script-src. `Cross-Origin-Embedder-Policy: require-corp` may block Stripe.js
- **Impact:** Stripe payment UI may break due to COEP. CSP doesn't protect against XSS
- **Fix:** Tighten CSP, resolve COEP/Stripe conflict

### 4.5 🟡 `loadEnv` with empty prefix loads ALL env vars into build
- **File:** `vite.config.ts:7`
- **Detail:** `loadEnv(mode, '.', '')` — empty prefix means all `.env` vars (including `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`) are loaded into Vite config context
- **Impact:** If any build plugin accesses `process.env`, secrets could leak
- **Fix:** Change to `loadEnv(mode, '.', 'VITE_')`

### 4.6 🔵 `VERCEL_OIDC_TOKEN` JWT on disk in `.env.vercel`
- **File:** `.env.vercel` (gitignored)
- **Detail:** JSON Web Token granting OIDC-based deployment access
- **Impact:** Token on disk can be used to deploy code as authorised principal
- **Fix:** Keep in secure env var manager, not file

### 4.7 🔵 `.env.local.template` uses wrong prefix
- **File:** `.env.local.template`
- **Detail:** Uses `NEXT_PUBLIC_SUPABASE_URL` (Next.js) instead of `VITE_SUPABASE_URL` (Vite)
- **Impact:** Template is misleading — new devs who copy it will have broken env vars
- **Fix:** Correct prefix to `VITE_`

### 4.8 🔵 `SECURITY_ASSESSMENT.md` tracked in git
- **Detail:** Complete vulnerability roadmap in git history
- **Impact:** Attacker with repo access has full attack plan
- **Fix:** Move to `.opencode/` or add to `.gitignore`

---

## 5. Previously Fixed

### ✅ Admin email backdoor — **FIXED** (commit `0b7cebf`)
- **File:** `src/App.tsx:490`
- **What was done:** Removed hardcoded `if (user.email === 'rjcosta@gmail.com') { setIsPro(true); return; }` block
- **Pro status now determined solely by DB `users.is_pro` field**

### ✅ Secrets removed from `.env` — **FIXED** (commit `0b7cebf`)
- `.env` now contains only public `VITE_` vars
- Secrets moved to `.env.local` (gitignored)

### ✅ HSTS, COEP, COOP headers — **FIXED** (commit `d23a809`)
- Security headers configured in `vercel.json`

### ✅ Webhook idempotency — **FIXED** (commit `414e907`)
- Dedup via `webhook_events` table with UNIQUE on `event_id`

---

## 6. Risk Summary

| Severity | Count | Key Issues |
|----------|-------|-----------|
| 🔴 **CRITICAL** | 1 | `SECURITY DEFINER` on `user_stats` view |
| 🟠 **HIGH** | 5 | No price whitelist, no rate limiting, missing import, DOC XSS, CSP bypass |
| 🟡 **MEDIUM** | 15 | Error leakage, permissive RLS, no CORS, webhook issues, localStorage PII, Supabase stub, .env.production tracked, COEP conflict, etc. |
| 🔵 **LOW** | 12 | Unused indexes, binding 0.0.0.0, URL validation, wrong template prefix, etc. |
| ✅ **PASS** | 5 | Admin backdoor fixed, .env cleaned, HSTS/headers set, webhook dedup, Stripe signature verification |

---

## 7. Priority Fix Recommendations

### Immediate (before marketing launch)
1. **🟠 Fix Price ID whitelist** — `api/app.ts:200`
2. **🟠 Fix `server.ts` missing import** — `server.ts:15`
3. **🟠 Fix DOC export HTML injection** — `src/App.tsx:969-975`

### Today
4. **🟡 Add rate limiting** — `api/app.ts` (use Vercel Edge or Supabase-based)
5. **🟡 Sanitise error messages** — `api/app.ts:222-223,265-266`
6. **🟡 Tighten CSP / fix COEP** — `vercel.json`
7. **🟡 Add startup validation for webhook secret** — `api/app.ts`

### This week
8. **🟡 Remove `.env.production` from git** — `.gitignore` + `git filter-repo`
9. **🟡 Fix Supabase stub** — crash in production if env vars missing
10. **🟡 Fix `loadEnv` prefix** — `vite.config.ts:7`
11. **🔴 Fix `SECURITY DEFINER` on `user_stats`** — Supabase migration
12. **🟡 Consolidate RLS policies** — Supabase migration

### This month
13. **🟠 Run `npm audit fix --force`** — fix transitives via `vercel` downgrade
14. **🟡 Validate Stripe redirect URLs client-side** — `src/App.tsx:1028,1096`
15. **🟡 Add input length limits** — all form fields
16. **🟡 Restrict `error_logs` INSERT to authenticated** — Supabase migration
17. **🟡 Remove window.__SUPABASE_CLIENT__** — `src/supabase.ts:180`
