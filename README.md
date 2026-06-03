<div align="center">
<img width="1200" height="475" alt="Merit Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Merit — CV Builder for the UK Job Market

ATS-optimised CV builder. Build, customise, and download professional CVs tailored for the UK job market.

Built and maintained with [Opencode](https://opencode.ai), an AI-powered CLI for software engineering.

## Features

- ATS-friendly formatting — passes automated screening systems
- Live preview as you type
- Multiple templates
- Pro features: unlimited downloads, full job description tailoring
- Cloud-synced CVs (sign in to save)
- Export to PDF

## Run Locally

**Prerequisites:** Node.js 18+

1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env` and fill in your Supabase and Stripe keys:
   `cp .env.example .env`
3. Start the dev server:
   `npm run dev`
4. (Optional) Start the API server for Stripe checkout:
   `npm run dev:api`

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS
- Supabase (Auth + Database)
- Stripe (Payments)
- Vercel (Hosting)

## Deployment

The app is deployed on Vercel. Push to the `master` branch to auto-deploy:

`git push origin master`

Production URL: `https://merit-cv.vercel.app`
