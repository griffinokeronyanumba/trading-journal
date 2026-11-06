# Phase 7 — Testing, hardening & deployment

**Completed:** 6 Nov 2026

## What was built
- **CSV export** (Trades → Export CSV): every trade with all fields, names for strategy/session/grade/tags, times in your timezone. Text that a spreadsheet could run as a formula is neutralised.
- **CSV import** (Trades → Import) with **migration `0006_import_trades.sql`**: choose a file → every row is checked (instrument, account, session, strategy, grade, tags matched by name; dates, numbers, directions validated) → line-by-line problems are listed → nothing is imported until every row is valid → the import runs as **one transaction** (all or nothing, max 2,000 rows). A downloadable template shows the format; an export re-imports cleanly.
- **Security hardening:** headers that block embedding in other sites (click-jacking), MIME sniffing and referrer leaks; `noindex` + `robots.txt` so search engines skip the app; no `X-Powered-By`.
- **Accessibility:** automated WCAG 2.1 AA scan (axe-core) of all 13 main pages — fixed low-contrast labels and hints, the account selector's accessible name, the calendar's structure, and an unlabelled field. Now **zero serious or critical issues**.
- **Docs:** `docs/DEPLOYMENT.md` (Supabase, GitHub push, Vercel), `docs/USER-GUIDE.md`.

## Final verification (whole application)
| Suite | Result |
|---|---|
| Unit tests (statistics, calculations, timezones, periods, validation, CSV) | ✅ 76/76 |
| Database tests on real PostgreSQL (RLS, integrity, trade view/save, storage, strategies/reviews, import) | ✅ 18 + 16 + 9 + 14 + 5 = 62/62 |
| Browser end-to-end, per phase (fresh database each) | ✅ 20 + 32 + 52 + 25 + 39 + 40 + 38 = **246/246** |
| Phase 7 includes | export contents & escaping, sign-in required for export, template, import validation messages, import values/times/tags, **export → delete → import round trip identical**, security headers, robots.txt, accessibility on 13 pages |
| Typecheck · lint · production build (with and without env vars) | ✅ |
| `npm audit --omit=dev` | ✅ 0 vulnerabilities |

## Issues found and fixed in this phase
- Accessibility: 4 contrast problems, a label/name mismatch, calendar ARIA structure, an unlabelled input.
