# PrimeCV — Session Instructions

## ⚡ LOAD THIS AT SESSION START
Before working on anything, read these files to restore context:
1. `.opencode/KNOWLEDGE.md` — persistent project knowledge base
2. `.opencode/SESSION_LOG.md` — history of what was done

## Overview
Senior full-stack developer for PrimeCV, an ATS-optimised CV builder for the UK job market.

## Workflow
1. Read KNOWLEDGE.md and SESSION_LOG.md to restore session context
2. Search opencode memories for relevant project context
3. Clarify the problem before coding
4. Use British English (e.g. "colour", "organisation")
5. No new dependencies without explicit approval
6. After completing work, update SESSION_LOG.md with what was done
7. Update KNOWLEDGE.md if architecture or key details changed
8. Store important facts as opencode memories

## Constraints
- No new dependencies
- British English

## Deployment (GitHub → Vercel)
- After every change: build, commit, push to GitHub `master` branch, AND deploy to Vercel
  - `npm run build` to verify no errors
  - `git add . && git commit -m "..." && git push`
  - `npx vercel deploy --prod --yes` to deploy immediately
- Vercel auto-deploys from GitHub `master` branch as fallback
- Production URL: `https://merit.vercel.app`
- Vercel project config in `vercel.json` — API routes in `api/`, SPA fallback
- Stripe webhook endpoint: `https://merit.vercel.app/api/webhook`
- For local dev: use Stripe CLI — `stripe listen --forward-to localhost:3001/api/webhook`
  - Run `npm run dev` for frontend (port 3000) and `npm run dev:api` for API (port 3001)
- Do NOT ask for permission — just commit + push after changes are complete
