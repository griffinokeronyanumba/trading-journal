# Phase 6 — Calendar, strategy library & reviews

**Completed:** 6 Nov 2026

## What was built

### Database — `supabase/migrations/0005_strategies_and_reviews.sql`
- `save_strategy()` saves a strategy with its rules, required confluences and preferred sessions in one transaction. **Rules are matched by id**, so renaming or reordering a rule keeps the checklist history on past trades.
- `save_review()` saves a review with its mistakes and best/worst trades. There is exactly one review per account + period + start date; saving again updates it.

### Calendar (`/calendar`)
- Monthly grid (Monday-first) showing **daily P&L, number of trades, daily win rate and daily R**, plus a **weekly total** column and a month summary (net, trades, win rate, average R, green/red days).
- Green/red tint by result, with +/− signs; a ⚠ marker on days that broke the account's daily loss limit.
- **Click a day** to see its trades, jump to that day's **daily review**, or **add a trade** on that date.
- Previous / next month and "Today". Mixed currencies switch the calendar to R. Phones get a compact grid.

### Strategy library (`/strategies`)
- Cards with trades, win rate, total R, profit factor, rule count and last traded date.
- Create / edit: name, description, entry conditions, exit/management rules, notes, **rule checklist** (add, edit, reorder, remove), **required confluences**, **preferred sessions**, active switch.
- Strategy page: KPIs, cumulative R chart, playbook, how often each rule was followed, results **with vs without** all required confluences, breakdowns by instrument and session.
- Deleting a strategy keeps its trades (strategy becomes "not set"); the warning states how many trades across **all** accounts are affected.
- The trade form now shows the chosen strategy's checklist and highlights its required confluences.

### Reviews (`/reviews`)
- **Daily:** what went well, what went wrong, mistakes (pre-selected from that day's tagged trades), lessons learned.
- **Weekly:** performance summary, best trades, worst trades (suggested from the week's R), areas for improvement, plus breakdowns by strategy and instrument.
- **Monthly:** overall performance, strategy effectiveness (with a per-strategy table), recurring mistakes, improvement objectives.
- Every review shows that period's statistics and trades; previous/next period navigation; list per type; delete.
- Reviews belong to the account selected in the top bar ("All accounts" has its own reviews).

## Verification performed
| Check | Result |
|---|---|
| Database tests | ✅ 14/14 new (strategy rules matched by id, links replaced, one review per period, separate per account, other user blocked) — plus 18 + 16 + 9 from earlier phases |
| Unit tests | ✅ 72/72 (adds period bounds, Monday weeks, labels, month grids) |
| Browser end-to-end | ✅ 40/40 — calendar day/week/month totals on the hand-checked data, R mode for mixed currencies, day panel, month navigation, all three review types incl. update/delete and per-account scoping, strategy create/edit/reorder/duplicate-name/delete, trade-form checklist, other user isolation, mobile |
| Regression: Phases 1–5 | ✅ 20 + 32 + 52 + 25 + 39 |
| Typecheck · lint · build | ✅ |

## Bugs found and fixed during verification
- Daily/monthly reviews were silently storing "best/worst trade" suggestions meant only for weekly reviews.
- The strategy delete warning counted only the selected account's trades.
