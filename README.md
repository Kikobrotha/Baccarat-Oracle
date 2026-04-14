# Baccarat Oracle (Next.js + Vercel Ready)

A full-stack baccarat predictor built with **Next.js App Router**, **TypeScript**, and **Tailwind CSS**.

## Features

- Predictor API (`/api/predict`) with remaining-shoe simulation
- Windsurf simulation API (`/api/windsurf`) with repeat logs, progress, and best recommendation
- Standard and no-commission modes
- Manual card rank tracking and shoe editing
- Confidence meter + EV cards + EV line chart
- Local persistence for history + shoe state via `localStorage`
- Vercel-ready deployment (single Next.js app, no separate backend)

## Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS

## Local Development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Build Check

```bash
npm run build
```

## Vercel Deployment

1. Push this repository to GitHub.
2. In Vercel, create a new project from the repo.
3. Keep defaults (Framework Preset: Next.js).
4. Deploy.

No extra services are required.

## Project Structure

- `app/page.tsx` — Dashboard UI and local state/persistence
- `app/api/predict/route.ts` — Predictor JSON route
- `app/api/windsurf/route.ts` — Multi-pass simulation JSON route
- `components/*` — UI pieces (history, chart, logs, cards, shoe editor)
- `lib/baccarat.ts` — Baccarat rules + shoe helpers
- `lib/simulation.ts` — Monte Carlo simulation orchestration
- `lib/types.ts` — Shared API and domain types
- `public/svg/*` — Generated SVG assets
