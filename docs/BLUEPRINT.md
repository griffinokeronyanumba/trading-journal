# Trading Journal & Backtesting App — Phase 0 Blueprint

*Status: **APPROVED 6 Nov 2026** (v1.1) · See "Approved decisions" directly below; they override anything later in this document*

## Approved decisions (6 Nov 2026)

| Topic | Decision |
|---|---|
| Recommendations §6 | All accepted |
| Authentication | Login required from Phase 1. **Signup closed** — private app, single owner account |
| UI components | shadcn/ui (Radix) |
| Break-even | Outcome = BREAK-EVEN when **|R| ≤ 0.1** (band configurable in settings) |
| Trading sessions | **Asia, London, New York**, stored in a per-user `trading_sessions` table with **editable start/end times** (interpreted in the profile timezone). Session auto-suggested from entry time |
| Loss limits | Daily loss limit and max drawdown entered as **% of starting balance** (money value derived) |
| Drawdown | **Static** — measured from starting balance (breach when equity ≤ start × (1 − max DD %)). Peak-to-trough drawdown still shown as an analytics metric |
| Trade grades | **A+, A, B, C**, stored in a per-user `trade_grades` table (label, description, sort order) so the scale is configurable later. Grades judge execution against the plan, not profitability |
| Trade structure | One entry, one exit per trade (v1) |
| Timezone | Default **Africa/Nairobi**, changeable in settings |
| R-multiple | **Always** = net P&L ÷ initial planned risk amount. Price-based R is shown only as a reference when risk amount is missing |
| Financials | Planned risk, gross realized P&L, fees, and net P&L (= gross − fees, generated column) stored separately |
| Data | CSV export (Phase 7); CSV import considered (Phase 7, stretch) |
| Analytics | Account-level summaries included |
| Security | Ownership enforced by RLS + composite FKs on trades and screenshots, plus storage path policies |
| Workflow | **Updated 6 Nov:** local git commits per phase, delivered as a zip (with `.git` history) after each phase; the user's latest zip is the master copy. GitHub push + Vercel deployment happen **once, at the end (Phase 7)**. Phase 1 "done" = login works locally. `docs/PHASE-n.md` written after each phase |
| Supabase | Hosted project only (no CLI/Docker for now). Migrations kept in `supabase/migrations/` and run via the SQL editor |

### Schema changes resulting from these decisions
- Enum `trade_session` → replaced by table **`trading_sessions`** (`name`, `start_time time`, `end_time time`, `sort_order`, `is_active`); `trades.session_id` references it. Seeded per user: Asia 02:00–10:00, London 10:00–18:00, New York 15:00–23:00 (Nairobi time, editable).
- Enum `trade_grade` → replaced by table **`trade_grades`** (`label`, `description`, `sort_order`); `trades.grade_id` references it. Seeded A+, A, B, C with your descriptions.
- `trading_accounts`: `daily_loss_limit_pct`, `max_drawdown_pct`; `limit_type` / `drawdown_mode` removed (static only for v1).
- `trades`: `gross_pnl`, `fees`, `net_pnl` (generated), `risk_amount` (planned), `r_multiple` (from net P&L ÷ risk_amount).
- `profiles.timezone default 'Africa/Nairobi'`, `breakeven_band_r default 0.1`.

This document covers the six things you asked for before any code:

1. Recommended system architecture
2. Database schema
3. Application folder structure
4. Development roadmap
5. Potential technical challenges
6. Recommendations for improving the requirements

At the end there is a **"What I need from you"** section: tools to install, accounts to create, and decisions only you can make.

---

## 1. Recommended system architecture

### 1.1 High-level picture

```
 Browser (React client components: forms, charts, image viewer)
        │  ▲
        │  │  HTML streamed from server + small client bundles
        ▼  │
 Next.js 16 App Router  (hosted on Vercel)
 ├── proxy.ts               → refreshes Supabase session cookie, guards routes
 ├── Server Components      → READ data (trades, accounts, analytics) on the server
 ├── Server Actions         → WRITE data (create/edit/delete), validated with Zod
 └── lib/analytics          → pure TypeScript metric functions (unit-tested)
        │
        ▼  @supabase/ssr (cookie-based auth, user's own JWT — never the service key)
 Supabase
 ├── Auth                   → email/password login
 ├── PostgreSQL             → normalized tables, every row owned by a user_id
 │    └── Row Level Security on EVERY table: user_id = auth.uid()
 └── Storage                → private bucket "trade-screenshots", served via signed URLs
```

### 1.2 Key technical decisions and why

| Decision | Choice | Why |
|---|---|---|
| Framework | **Next.js 16, App Router**, TypeScript strict mode | Current Active-LTS major. Server Components keep database queries off the client and make pages fast. |
| Auth integration | **`@supabase/ssr`** with cookies | Supabase's recommended package for the App Router; sessions work in server components, server actions and the proxy. |
| Reads | **Server Components** query Supabase directly | No hand-written API layer to maintain; RLS still applies because queries run as *you*. |
| Writes | **Server Actions** + **Zod** schemas | One validation schema shared by the form (client) and the action (server). Bad data never reaches the database. |
| Security | **RLS on every table + composite foreign keys** | RLS stops you reading others' rows; composite FKs stop a trade ever being linked to an account/instrument owned by someone else. |
| Balances | **Derived, never stored** | Current balance = starting balance + Σ realized P&L. Storing it separately eventually drifts out of sync after edits/deletes. |
| Analytics | **Pure TS functions** in `lib/analytics`, fed by filtered trade rows | A personal journal will hold thousands, not millions, of trades. Pure functions are easy to unit-test (critical — wrong stats are worse than no stats). SQL views can be added later if any page gets slow. |
| Charts | **Recharts** in client components only | Recharts needs the browser; data is prepared on the server and passed in as props. |
| Selected account | **Cookie** (`account_id` or `all`) read on the server | Every page server-renders already filtered; the selection survives refreshes and new tabs. |
| Money & prices | Postgres **`numeric`**, never `float` | Avoids rounding errors in P&L sums. |
| Screenshots | Private bucket, path `{user_id}/{trade_id}/{uuid}.webp`, compressed in the browser before upload | Storage policies can check the first folder = your user id; compression protects the free-tier storage quota. |
| Styling | **Tailwind CSS v4** + a small set of accessible primitives (see §6 / approvals) | Consistent dark terminal look without writing every dropdown, dialog and date picker from scratch. |

### 1.3 How the core calculations will work

All calculations live in one tested module so every page agrees on the numbers.

- **Planned R:R** = |TP − entry| ÷ |entry − SL| (only if SL and TP exist).
- **Result in R** — first available of:
  1. realized P&L ÷ initial risk amount (most accurate, uses money), or
  2. price-based: (exit − entry) ÷ (entry − SL), sign-flipped for SELL trades.
- **Realized P&L** — manual entry always allowed and always wins. Auto-calculation is offered **only** when the instrument has contract specs filled in *and* its quote currency equals the account currency. Otherwise the field stays manual. No universal pip/point assumptions anywhere.
- **Outcome** — derived from R using a configurable break-even band (e.g. |R| < 0.1 = BREAK-EVEN), with a manual override flag.
- **Max drawdown** — largest peak-to-trough drop on the equity curve, in money and %.
- **Profit factor** = gross profit ÷ |gross loss| (shown as "∞" when there are no losses).
- **Combined ("All accounts") view** — currency-neutral metrics (R, win rate, % return, profit factor) are combined; money figures are shown **grouped per currency**, never summed across currencies.

---

## 2. Database schema

Conventions for every table: `id uuid primary key default gen_random_uuid()`, `user_id uuid not null default auth.uid() references auth.users on delete cascade`, `created_at` / `updated_at timestamptz` (with an update trigger). These are omitted below for brevity.

### 2.1 Enums

```sql
account_type   : 'backtest' | 'evaluation' | 'funded' | 'simulated' | 'live' | 'other'
instrument_cat : 'forex' | 'indices' | 'commodities' | 'crypto' | 'stocks' | 'custom'
direction      : 'buy' | 'sell'
trade_session  : 'asia' | 'london' | 'new_york' | 'london_ny_overlap' | 'other'
trade_outcome  : 'win' | 'loss' | 'breakeven'
trade_grade    : 'A+' | 'A' | 'B' | 'C' | 'D'
news_condition : 'none' | 'low_impact' | 'medium_impact' | 'high_impact' | 'during_release'
pnl_source     : 'manual' | 'calculated'
shot_kind      : 'before' | 'after'
limit_type     : 'amount' | 'percent'
drawdown_mode  : 'static' | 'trailing'
review_period  : 'daily' | 'weekly' | 'monthly'
```

### 2.2 Tables

**profiles** — one row per user, created automatically on sign-up (trigger)
`id (= auth.users.id)`, `display_name`, `timezone` (e.g. `Africa/Nairobi`), `default_currency char(3)`, `breakeven_band_r numeric default 0.1`

**trading_accounts**
`name`, `account_type`, `currency char(3)`, `starting_balance numeric(18,2)`, `risk_per_trade_pct numeric(5,2)`,
`daily_loss_limit numeric(18,2)`, `daily_loss_limit_type limit_type`,
`max_drawdown_limit numeric(18,2)`, `max_drawdown_type limit_type`, `max_drawdown_mode drawdown_mode`,
`opened_on date`, `is_archived bool default false`, `notes`
→ `unique (id, user_id)` (enables the composite FK below)

**instruments** — the five defaults are **copied into each user's own list** at sign-up, so you can edit or delete them freely
`symbol` (e.g. XAUUSD), `display_name`, `category instrument_cat`, `quote_currency char(3)`,
optional specs: `contract_size`, `tick_size`, `tick_value`, `pip_size` (all `numeric`, nullable), `notes`, `is_active`
→ `unique (user_id, symbol)`, `unique (id, user_id)`

**strategies**
`name`, `description`, `entry_conditions`, `exit_rules`, `preferred_sessions trade_session[]`, `notes`, `is_active`

**setup_types** — e.g. "Liquidity sweep + FVG", optionally tied to a strategy
`strategy_id → strategies (nullable)`, `name`

**confluences** — your reusable confluence tags
`name` → `unique (user_id, name)`
**strategy_confluences** (`strategy_id`, `confluence_id`) — the *required* confluences of a strategy

**mistake_tags** — reusable mistake labels (e.g. "Moved SL", "Entered early")
`name` → `unique (user_id, name)`

**strategy_rules** — checklist rules per strategy (optional but recommended, see §6)
`strategy_id`, `rule_text`, `sort_order`

**trades** — the heart of the app
| Group | Columns |
|---|---|
| Ownership | `account_id`, `instrument_id`, `strategy_id (nullable)`, `setup_type_id (nullable)` |
| Trade info | `trade_date date`, `direction`, `session`, `entry_price`, `stop_loss`, `take_profit`, `exit_price` (prices `numeric(20,10)`), `entry_time timestamptz`, `exit_time timestamptz` |
| Strategy info | `grade`, `news_condition`, `entry_reasoning text`, `followed_rules bool` |
| Financials | `risk_pct`, `risk_amount`, `position_size (nullable)`, `potential_reward`, `fees numeric default 0`, `pnl numeric(18,2)`, `pnl_source`, `r_multiple numeric(10,4)`, `planned_rr`, `outcome`, `outcome_overridden bool` |
| Optional backtest extras | `mfe_r`, `mae_r` (how far price went for/against you, in R) |
| Other | `notes` |

Integrity rules:
- `foreign key (account_id, user_id) references trading_accounts (id, user_id) on delete cascade`
- `foreign key (instrument_id, user_id) references instruments (id, user_id) on delete restrict` (can't delete an instrument that still has trades — you archive it instead)
- `check` constraints: prices > 0, `exit_time >= entry_time`, risk_pct between 0 and 100
- Indexes: `(user_id, account_id, trade_date)`, `(strategy_id)`, `(instrument_id)`

**trade_confluences** (`trade_id`, `confluence_id`) — which confluences were present
**trade_mistakes** (`trade_id`, `mistake_tag_id`) — which mistakes happened
**trade_rule_checks** (`trade_id`, `rule_id`, `followed bool`) — per-rule adherence

**trade_screenshots**
`trade_id → trades on delete cascade`, `kind shot_kind`, `storage_path`, `caption`, `sort_order`, `width`, `height`, `size_bytes`

**reviews** — one table for all three period types; type-specific fields are nullable
`account_id (nullable = all accounts)`, `period review_period`, `period_start date`, `period_end date`,
`summary`, `went_well`, `went_wrong`, `lessons`, `strategy_effectiveness`, `improvement_areas`, `objectives`
→ `unique (user_id, account_id, period, period_start)`
**review_mistakes** (`review_id`, `mistake_tag_id`)
**review_trades** (`review_id`, `trade_id`, `role 'best'|'worst'`)

### 2.3 Row Level Security pattern

Applied to every table (link tables check ownership through `user_id` too):

```sql
alter table public.trades enable row level security;

create policy "own rows" on public.trades
  for all to authenticated
  using      (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
```

Storage bucket `trade-screenshots` (private):

```sql
create policy "own screenshots" on storage.objects
  for all to authenticated
  using      (bucket_id = 'trade-screenshots'
              and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'trade-screenshots'
              and (storage.foldername(name))[1] = (select auth.uid())::text);
```

Schema changes will be written as **numbered SQL migration files** in the repo (`supabase/migrations/`), so the database is reproducible and version-controlled with the code.

---

## 3. Application folder structure

Feature-based: everything about trades lives together, shared building blocks live in `components/ui` and `lib`.

```
trading-journal/
├── supabase/
│   ├── migrations/              # 0001_init.sql, 0002_rls.sql, 0003_storage.sql …
│   └── seed.sql                 # default instruments, sessions, sample data (dev only)
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── auth/callback/route.ts
│   │   ├── (app)/               # everything behind login
│   │   │   ├── layout.tsx       # sidebar + top bar + account selector
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── trades/
│   │   │   │   ├── page.tsx             # filterable trade table
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [tradeId]/
│   │   │   │       ├── page.tsx         # trade detail + screenshots
│   │   │   │       └── edit/page.tsx
│   │   │   ├── analytics/page.tsx
│   │   │   ├── calendar/page.tsx
│   │   │   ├── strategies/  (page.tsx, [strategyId]/page.tsx)
│   │   │   ├── reviews/     (page.tsx, [period]/[date]/page.tsx)
│   │   │   ├── accounts/    (page.tsx, [accountId]/page.tsx)
│   │   │   ├── instruments/page.tsx
│   │   │   └── settings/page.tsx        # profile, timezone, tags, break-even band
│   │   ├── layout.tsx           # fonts, theme
│   │   └── globals.css          # Tailwind v4 theme tokens (colours, spacing)
│   ├── features/
│   │   ├── accounts/   { actions.ts, queries.ts, schema.ts, components/ }
│   │   ├── instruments/{ … }
│   │   ├── trades/     { … , calc.ts }
│   │   ├── screenshots/{ … }
│   │   ├── strategies/ { … }
│   │   ├── reviews/    { … }
│   │   └── analytics/  { queries.ts, components/ }
│   ├── components/
│   │   ├── ui/                  # buttons, inputs, dialogs, tables, badges
│   │   ├── layout/              # sidebar, topbar, account-selector
│   │   └── charts/              # equity-curve, monthly-bars, distribution …
│   ├── lib/
│   │   ├── supabase/   { client.ts, server.ts, proxy.ts }
│   │   ├── analytics/  { metrics.ts, equity.ts, drawdown.ts, *.test.ts }
│   │   ├── format.ts            # money, R, %, dates in your timezone
│   │   └── utils.ts
│   └── types/
│       └── database.ts          # generated from Supabase — never hand-written
├── proxy.ts                     # session refresh + route protection (Next 16)
├── .env.local                   # Supabase URL + anon key (never committed)
├── .env.example                 # committed template
└── package.json
```

---

## 4. Development roadmap

Your seven phases, kept in order, with one adjustment: **login and a first Vercel deployment move into Phase 1**, because RLS requires a logged-in user and deploying early catches environment problems while the app is still small. Unit tests are written alongside the calculation code from Phase 3 onward rather than all at the end.

Every phase ends with the same **verification pass**: type-check, lint, production build, automated tests, then a manual click-through of every feature in that phase. I fix anything that fails, then report back with a brief and anything you need to do.

| Phase | Scope | Done when |
|---|---|---|
| **1 · Foundation** | Next.js + TypeScript + Tailwind setup, design tokens (dark theme, typography), app shell (sidebar, top bar, account selector placeholder), Supabase client wiring, login/logout, route protection, GitHub repo, first Vercel deploy | You can log in on the live Vercel URL and click through every (empty) page on desktop and mobile |
| **2 · Database & accounts** | Migrations for all tables, enums, RLS, triggers (profile + default instruments on sign-up), generated TS types; account CRUD; working account selector + "All accounts" | You can create/edit/archive accounts; a second test user cannot see your data (RLS tested) |
| **3 · Instruments & trade entry** | Instrument CRUD with optional contract specs; strategy/setup/confluence/mistake tags (basic); full trade form with live auto-calculations; trade list with sorting & filters; edit/delete | You can log a trade in under a minute; R, outcome and balance update correctly; calc tests pass |
| **4 · Screenshots & trade detail** | Storage bucket + policies, compressed multi-upload, before/after sections, lightbox, side-by-side compare, delete (file + row) | Upload/delete works; deleting a trade removes its files; another user cannot open your image URLs |
| **5 · Dashboard & analytics** | KPI cards, equity curve, monthly bars, win/loss distribution, daily performance, recent trades, per-account performance; analytics page with all filters and breakdowns | Every number matches a hand-checked sample dataset |
| **6 · Calendar, strategies, reviews** | Monthly P&L calendar with day drill-down; strategy library with performance per strategy; daily/weekly/monthly reviews linked to trades and mistakes | Calendar totals match analytics; reviews save and reload correctly |
| **7 · Hardening & release** | End-to-end test pass, empty/error/loading states, accessibility & mobile polish, performance check, CSV export, production env review | Clean production deploy; you sign off |

---

## 5. Potential technical challenges

1. **P&L across very different instruments.** A point on NAS100, a pip on EURUSD and a dollar on XAUUSD are worth different amounts depending on broker contract sizes. *Mitigation:* manual P&L is the default; auto-calc only with your own contract specs and matching currency; the app never guesses.
2. **Currency conversion.** If an account is in EUR and you trade a USD-quoted instrument, accurate auto P&L needs an exchange rate at that moment. *Mitigation:* out of scope for v1 — those trades stay manual.
3. **Timezones and sessions.** Backtested trades happen at historical times, often read off a chart set to another timezone. Sessions and the calendar depend on getting this right. *Mitigation:* store a timezone on your profile, store `trade_date` explicitly, and auto-suggest the session from entry time (you can override).
4. **Derived balances after edits.** Editing a trade from three months ago changes every later balance and the whole drawdown history. *Mitigation:* balances and equity curves are always recomputed from trades, never stored.
5. **Correctness of statistics.** Off-by-one errors in drawdown or profit factor are easy to make and hard to spot. *Mitigation:* pure functions with unit tests against hand-calculated examples.
6. **RLS gaps.** A single table without RLS, or a link table without an ownership check, leaks data. *Mitigation:* every migration enables RLS, composite foreign keys, and a Phase 2 test with a second user.
7. **Orphaned screenshot files.** Deleting a database row does not delete the file in Storage. *Mitigation:* server actions delete files first, then rows; a cleanup check in Phase 7.
8. **Free-tier limits.** Supabase's free plan has storage and database size caps, and inactive free projects can be paused. *Mitigation:* browser-side image compression (WebP, max ~1600px) and CSV export for backups. I'll confirm the current limits with you before Phase 4.
9. **Server/client boundary in Next.js.** Charts, forms and the image viewer must be client components; data fetching stays on the server. Mixing these up causes build errors or leaks. *Mitigation:* a consistent pattern in every feature folder.
10. **Form complexity.** The trade form has 30+ fields and live calculations. *Mitigation:* grouped sections, smart defaults (risk % from account, session from time), and keyboard-friendly entry.

---

## 6. Recommendations for improving the requirements

These are suggestions — each needs your yes/no.

1. **Tags instead of free text for mistakes and confluences.** "Recurring mistakes" analytics only works if the same mistake is recorded the same way every time. Free-text notes stay available alongside. *(Already reflected in the schema.)*
2. **Rule checklist per strategy.** Replace the single "rules followed?" yes/no with a checklist of that strategy's rules, so analytics can show *which* rule you break most. The yes/no is then derived automatically.
3. **Fast-entry features for backtesting.** Backtesting means logging many trades in one sitting. Suggested: "duplicate last trade", sticky defaults (account, instrument, strategy), keyboard shortcuts, and **CSV import/export**.
4. **Define break-even precisely.** A configurable band (e.g. within ±0.1R) instead of exactly zero.
5. **Fees/commission field**, so net P&L is honest.
6. **Prop-firm style limits done properly.** Daily loss and max drawdown can be an amount or a %, and drawdown can be static or trailing. The app flags days/accounts that breached a limit.
7. **MFE/MAE in R (optional).** Recording how far price moved for/against you is one of the most useful backtesting fields for refining take-profit and stop placement.
8. **Out of scope for v1, noted for later:** partial closes/scaling out, automatic FX conversion, broker import, live open-trade tracking.
9. **Single-user lockdown.** Since this is personal, once your account exists we disable public sign-ups in Supabase so no one else can register.
10. **Backups.** CSV export of trades plus the migration files in GitHub means you can always rebuild.

---

## What I need from you before Phase 1

### Install on your computer
- **Node.js 22 LTS** (Next.js 16 needs Node 20.9 or newer)
- **Git**
- **VS Code** (or any editor you prefer)

### Create accounts (free tiers are fine)
- **GitHub**
- **Supabase** — create one new project; save the project URL, anon/publishable key and database password somewhere safe
- **Vercel** — sign in with GitHub

### Additional libraries I'd like to use (need your approval)
| Library | Purpose |
|---|---|
| `zod` | Validation shared by forms and server actions |
| `react-hook-form` + `@hookform/resolvers` | Managing the large trade form |
| `shadcn/ui` (built on Radix UI) | Accessible dialogs, dropdowns, popovers, tables — copied into the repo, fully restyled |
| `lucide-react` | Icons |
| `date-fns` + `@date-fns/tz` | Date maths and timezones |
| `sonner` | Toast notifications |
| `browser-image-compression` | Shrinks screenshots before upload |
| `vitest` | Unit tests for the calculations |
| Supabase CLI *(optional)* | Run migrations from the terminal; local database needs Docker. Without it we paste migrations into the Supabase SQL editor |

### Decisions only you can make
1. Which recommendations in §6 do you accept?
2. How should we work on the code? Options: (a) I build in my workspace and push to a GitHub repo you create and connect; (b) you connect a folder on your computer through the Claude desktop app; (c) I send the project as a zip each phase.
3. Supabase CLI + Docker locally, or hosted Supabase only (simpler)?
4. Default trade grades: A+/A/B/C/D — OK, or a different scale?
