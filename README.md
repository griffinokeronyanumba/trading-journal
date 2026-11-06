# Trading Journal

A private trading journal and backtesting analytics app.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui (Radix) · Supabase (Auth, Postgres, Storage) · Recharts · Vitest · Vercel

## Status: v1.0 — all 7 phases complete

| Phase | Scope | Notes |
|---|---|---|
| 1 | Foundation, navigation, login | [PHASE-1](docs/PHASE-1.md) |
| 2 | Database & accounts | [PHASE-2](docs/PHASE-2.md) |
| 3 | Instruments & trade entry | [PHASE-3](docs/PHASE-3.md) |
| 4 | Screenshots & trade detail | [PHASE-4](docs/PHASE-4.md) |
| 5 | Dashboard & analytics | [PHASE-5](docs/PHASE-5.md) |
| 6 | Calendar, strategies, reviews | [PHASE-6](docs/PHASE-6.md) |
| 7 | CSV, hardening, deployment | [PHASE-7](docs/PHASE-7.md) |

- **Deploying:** [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- **Using it:** [docs/USER-GUIDE.md](docs/USER-GUIDE.md)
- **Architecture & decisions:** [docs/BLUEPRINT.md](docs/BLUEPRINT.md)

## Run locally

Requires Node.js 20.9+ (22 LTS recommended).

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL + publishable key
npm run dev                  # http://localhost:3000
```

Database: run the files in `supabase/migrations/` in order in the Supabase SQL Editor (see DEPLOYMENT.md).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run typecheck` · `npm run lint` · `npm test` | TypeScript · ESLint · unit tests |
| `npm run check` | All of the above + build — run before every commit |

## Project layout

```
src/
  app/(auth)/login          sign-in (registration closed)
  app/(app)/...             dashboard, trades, analytics, calendar, strategies, reviews, accounts, instruments, settings
  app/api/export/...        CSV export + import template
  components/ui             shadcn/ui primitives (dark theme)
  components/charts         Recharts components (validated palette)
  features/<feature>        server actions, schemas, queries, components per feature
  lib/analytics             statistics engine (pure, unit-tested)
  lib/supabase              browser/server/proxy clients
  proxy.ts                  session refresh + route protection
supabase/migrations         0001 … 0006, run in order
docs/                       blueprint, per-phase notes, deployment, user guide
```
