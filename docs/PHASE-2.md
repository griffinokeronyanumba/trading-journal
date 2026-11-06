# Phase 2 — Database architecture & account management

**Completed:** 6 Nov 2026

## What was built

### Database (`supabase/migrations/`)
- **0001_core_schema.sql** — all 20 tables for the whole app (profiles, accounts, instruments, sessions, grades, strategies, setups, confluences, mistakes, strategy rules, trades, trade tags/rule checks, screenshots, reviews), enums, constraints, indexes, `updated_at` triggers.
  - **Financial columns computed by the database** so they can never be wrong or stale: `net_pnl = gross_pnl − fees`, `r_multiple = net_pnl ÷ risk_amount`, `planned_rr`, `potential_reward`.
  - **Composite foreign keys** `(id, user_id)` on every relationship: a trade can never point to someone else's account, instrument, strategy, etc.
  - Screenshot paths must start with `{your user id}/{trade id}/`.
  - An instrument that has trades can't be deleted (archive it instead).
  - **Defaults created for every user**, including you (your user already exists, so the migration backfills): XAUUSD, NAS100, US30, EURUSD, GBPUSD; sessions Asia 03:00–11:00, London 10:00–19:00, New York 15:00–23:00 (Nairobi time, editable); grades A+/A/B/C with your descriptions; 8 starter mistake tags (rename/delete freely).
- **0002_row_level_security.sql** — RLS on every table; the anonymous role has no access at all; signed-in users only see/change their own rows.

### App
- **Accounts page:** create, edit, archive/restore, delete (with a warning that states how many trades will be deleted). Validation on every field.
- **Account cards:** current balance (starting balance + net P&L), net P&L and return %, trade count, win rate, risk per trade, daily loss limit (% and money), static drawdown floor, room left to the floor, and warnings when the max drawdown or the daily loss limit has been breached.
- **Account selector** in the top bar now works: pick one account or "All accounts". The choice is remembered (secure cookie) across pages and visits. Archived accounts are hidden from it.
- **Settings → Profile & preferences:** display name, timezone (default Africa/Nairobi), default currency for new accounts, break-even band (default ±0.1R).
- **Statistics engine** (`src/lib/analytics/metrics.ts`): win rate, profit factor, average R, expectancy, equity curve, max drawdown, static drawdown floor, daily-loss breaches, grouping for breakdowns. Used by every page from now on.

## Decisions made in this phase
- **R, outcome and net P&L live in the database** (generated columns) or are derived on read — never typed in twice.
- **Outcome is derived, not stored**: from R using your break-even band; you can still override it per trade. Changing the band in Settings re-classifies all trades instantly.
- **Win rate excludes break-even trades** (wins ÷ (wins + losses)). Break-evens are shown separately.
- **Session times updated** from the blueprint draft to match real market hours in Nairobi time (Asia 03–11, London 10–19, New York 15–23). Editable in Phase 3.
- **Supabase is only called at request time** (`await connection()` in the server client) so Next.js never tries to pre-render user data.
- **Supabase returns max 1,000 rows per request**, so all trade loading pages through results automatically.

## Verification performed
| Check | Result |
|---|---|
| Migrations applied to a real PostgreSQL 16 database | ✅ |
| Database security & integrity tests (two users) | ✅ 18/18 — own-data only, no spoofed owners, no cross-user links, generated P&L/R correct, screenshot path rule, instrument delete protection, anonymous blocked |
| Unit tests | ✅ 36/36 (statistics hand-checked: balance, win rate, profit factor, avg R, drawdown, static floor, daily limit) |
| Typecheck · lint · production build | ✅ |
| Phase 1 regression (login, navigation, mobile) | ✅ 20/20, 4 consecutive runs |
| Browser end-to-end (real database through a local Supabase stand-in) | ✅ 32/32 — validation, create/edit/archive/restore/delete, EUR formatting, duplicate names, balances & limits from real trades, selector persistence, settings, second user isolation, mobile |
