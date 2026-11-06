# Phase 5 — Dashboard & analytics

**Completed:** 6 Nov 2026

## What was built

### Dashboard (`/dashboard`) — follows the account selector
- **KPIs:** net P&L, current balance, total return %, max drawdown (money and %), profit factor, total / winning / losing trades, win rate, average R.
- **Charts:** equity curve, win/loss distribution (R histogram), monthly performance, daily performance (last 30 trading days). Hover any chart for exact values; every chart has a **"Show data"** table.
- **Recent trades** (last 8) and **account performance** table (balance, return, win rate, max drawdown, trades, limit-breach badges).
- **All accounts view never mixes currencies:** money figures are shown per currency (one line each); when accounts use different currencies, the equity curve, monthly/daily bars and profit factor switch to **R**, which is currency-neutral.

### Analytics (`/analytics`)
- **Filters:** account, instrument, strategy, session, weekday, direction, grade, month — combinable, kept in the URL (bookmarkable).
- **Summary:** trades, win rate, total R, average R, average winner, average loser, profit factor, net P&L.
- **Insights:** plain-language findings — most/least profitable instrument, session and strategy; buy vs sell; whether better-graded trades really earn more; most frequent and most expensive mistake; rule adherence vs results. (Groups need ≥ 3 trades before they're called out.)
- **Breakdowns** with trades, win rate, avg R, total R bar, net P&L and profit factor: by instrument, session, strategy, buy vs sell, grade (in your scale order), setup, weekday, month and confluence.
- **Risk-to-reward:** average planned R:R vs average realised winner/loser and expectancy.
- **Recurring mistakes:** how often each happens, % of trades, win rate and total R cost.
- **Trading rule adherence:** followed vs broken vs not recorded, plus the most-broken checklist rules.

### Also
- A friendly **error screen** for any page that fails to load (instead of a blank page).
- Chart colours validated for the dark theme (contrast, colour-blind separation). Gains/losses are shown by **position (above/below zero) and +/− signs**, never by colour alone.
- Screenshot compression now runs fully self-hosted (no external CDN).

## Verification performed
| Check | Result |
|---|---|
| Unit tests | ✅ 67/67 (adds monthly/daily series, R histogram, mistake impact, adherence, per-currency pooling, insights) |
| Browser end-to-end on a hand-checked dataset | ✅ 39/39 — every KPI matches the hand calculation (e.g. balance $10,205.00, max DD $295.00 · 2.89%, PF 1.68, win rate 40.0%, avg R +0.34R); all-accounts view keeps USD and EUR separate (PF in R = 2.35); breakdown ordering; insights; mistakes; adherence 50%; every filter; other user sees nothing; mobile |
| Regression: Phases 1–4 | ✅ 20 + 32 + 52 + 25 |
| Typecheck · lint · build | ✅ |
