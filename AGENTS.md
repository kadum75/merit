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

## Deployment (GitHub → Netlify)
- After every change: build, commit, and push to GitHub `master` branch
  - `npm run build` to verify no errors
  - `git add . && git commit -m "..." && git push`
- Netlify auto-deploys from GitHub `master` branch
- Do NOT ask for permission — just commit + push after changes are complete
