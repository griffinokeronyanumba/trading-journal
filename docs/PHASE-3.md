# Phase 3 — Instrument management & trade entry

**Completed:** 6 Nov 2026

## What was built

### Database — `supabase/migrations/0003_trades_view_and_save.sql`
- **`trades_enriched` view** — each trade with its account, currency, symbol, strategy, setup, session, grade, derived outcome, weekday, month and tag lists. Runs with your permissions, so Row Level Security still applies.
- **`save_trade()` function** — saves a trade *and* its confluences, mistakes and rule checks in one transaction. If anything is invalid, nothing is saved (no half-saved trades).

### Instruments page
- List with category, quote currency, tick size/value, whether automatic P&L is enabled, and trade count.
- Add / edit custom instruments (any symbol, any category), with an **optional** contract specification.
- Deactivate (hides from new trades) or delete. Instruments that have trades can't be deleted — the app explains why.

### Settings
- **Trading sessions:** edit names and start/end times, add new ones (midnight-crossing supported), switch on/off.
- **Trade grades:** add, rename, describe, reorder, delete — the scale is fully configurable.
- **Mistake tags, confluences, setup types:** add, rename, delete.

### Trade entry (`/trades/new`, `/trades/[id]/edit`)
- All requested fields: trade info, strategy info, financials, plus MFE/MAE, mistakes and notes.
- **Live summary** while you type: planned R:R, potential reward, gross/net P&L, R, outcome.
- **Smart defaults:** the active account; risk % from the account; planned risk = risk % × starting balance; trade date and **session suggested from entry time**.
- **Automatic P&L** only when the instrument has tick size + tick value **and** its currency matches the account — otherwise manual. The server recomputes "calculated" P&L itself (never trusts the browser). Also: "use X to risk $Y" position-size helper.
- Warnings when the stop-loss/take-profit are on the wrong side of entry.
- Strategy **rule checklist** (ticked = followed) and **required confluences** highlighted — these come alive once you create strategies in Phase 6.
- Fast backtesting: **Save & add another** (keeps account, instrument, direction, strategy, risk), **Duplicate** a trade, **Ctrl/⌘ + Enter** to save.

### Trades list & detail
- Table with filters (instrument, strategy, direction, outcome, date range), sortable columns, paging (50 per page), edit / duplicate / delete per row.
- Trade detail page with the result, execution, financials, strategy checklist, confluences, mistakes and notes.

## Decisions
- Times are entered in your profile timezone and stored in UTC.
- Outcome override is available per trade; otherwise it's automatic.
- A trade with an exit price must have a P&L (open trades: leave exit empty).

## Verification performed
| Check | Result |
|---|---|
| Database tests (trade view, atomic save, RLS on view & function) | ✅ 16/16 (+ Phase 2's 18/18) |
| Unit tests | ✅ 59/59 (contract-spec P&L for gold & EURUSD, risk/size, R, R:R, warnings, session overlap & midnight, Nairobi/London timezones, form validation) |
| Typecheck · lint · production build | ✅ |
| Browser end-to-end | ✅ 52/52 (two consecutive runs) — instruments, settings lists, trade form maths, auto session, calculated P&L, checklist, save & add another, duplicate, Ctrl+Enter, filters, sorting, edit, delete, balances, second-user 404s, mobile |
| Regression: Phase 1 (20/20) and Phase 2 (32/32) | ✅ |
