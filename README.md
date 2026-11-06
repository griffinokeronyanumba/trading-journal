# Trading Journal

A private trading journal and backtesting analytics app.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui (Radix) · Supabase (Auth, Postgres, Storage) · Recharts · Vitest · Vercel

## Status

| Phase | Scope | Status |
|---|---|---|
| 1 | Foundation, navigation, login | ✅ Done — see [docs/PHASE-1.md](docs/PHASE-1.md) |
| 2 | Database & accounts | ✅ Done — see [docs/PHASE-2.md](docs/PHASE-2.md) |
| 3 | Instruments & trade entry | ✅ Done — see [docs/PHASE-3.md](docs/PHASE-3.md) |
| 4 | Screenshots & trade detail | ✅ Done — see [docs/PHASE-4.md](docs/PHASE-4.md) |
| 5 | Dashboard & analytics | ✅ Done — see [docs/PHASE-5.md](docs/PHASE-5.md) |
| 6 | Calendar, strategies, reviews | ✅ Done — see [docs/PHASE-6.md](docs/PHASE-6.md) |
| 7 | Testing, hardening, deployment | ⏳ Next |

Full architecture and decisions: [docs/BLUEPRINT.md](docs/BLUEPRINT.md)

## Run locally

Requires Node.js 20.9+ (22 LTS recommended).

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase URL + publishable key
npm run dev                  # http://localhost:3000
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest) |
| `npm run check` | All of the above — run before every commit |

## Project layout

```
src/
  app/(auth)/login        sign-in page (registration is closed)
  app/(app)/...           every signed-in page, sharing the sidebar/topbar layout
  components/ui           shadcn/ui primitives (restyled for the dark theme)
  components/layout       sidebar, topbar, account selector, page header
  features/<feature>      server actions, schemas, queries and components per feature
  lib/supabase            browser/server/proxy Supabase clients
  lib/auth.ts             requireUser() server-side guard
  proxy.ts                session refresh + route protection (Next 16's "middleware")
supabase/migrations       numbered SQL migrations (from Phase 2)
docs/                     blueprint and per-phase notes
```
