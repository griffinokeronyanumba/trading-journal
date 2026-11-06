# Phase 1 — Foundation, structure & navigation

**Completed:** 6 Nov 2026

## What was built

- **Project scaffold:** Next.js 16.4 (App Router, Turbopack, Cache Components / Partial Prerendering), React 19.3, TypeScript strict, Tailwind CSS v4, ESLint, Vitest.
- **Libraries installed (all approved):** `@supabase/ssr`, `@supabase/supabase-js`, `zod`, `react-hook-form`, `@hookform/resolvers`, `radix-ui` + shadcn/ui helpers (`class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`), `lucide-react`, `date-fns`, `@date-fns/tz`, `sonner`, `recharts`, `browser-image-compression`, `geist` (fonts), `server-only`.
- **Design system:** dark terminal palette in `src/app/globals.css` (surfaces, restrained cyan accent, `profit` / `loss` / `breakeven` / `warning` colours, chart colours), Geist Sans + Geist Mono, a `num` utility for tabular numbers.
- **UI primitives** (shadcn/ui style on Radix): Button, Input, Label, Card, Badge, Separator, Skeleton, DropdownMenu, Sheet, Tooltip, Toaster.
- **App shell:** desktop sidebar with grouped navigation and active-link indicator; sticky top bar with account selector (placeholder until Phase 2), "New trade" button and user menu; slide-in mobile navigation.
- **Pages (placeholders showing what arrives in which phase):** Dashboard, Analytics, Calendar, Trades, New trade, Reviews, Strategies, Instruments, Accounts, Settings, 404.
- **Authentication:** email + password sign-in via Supabase (server action + Zod validation), sign-out, no sign-up page. Signed-out visitors are redirected to `/login?next=…` and returned to the page they wanted after signing in. Redirect targets are checked to block open-redirect attacks.
- **Route protection in two layers:** `src/proxy.ts` (runs before every request, refreshes the session) and `requireUser()` on the server inside the protected layout.

## Technical decisions

- **`proxy.ts`, not `middleware.ts`:** Next.js 16 renamed middleware to proxy.
- **`getClaims()` for auth checks:** validates the JWT instead of trusting the cookie blindly.
- **Cache Components kept on:** the page shell (sidebar, headers) is prerendered and instant; user-specific parts stream in. The auth check reads cookies first so it always runs per request.
- **shadcn/ui components written into the repo by hand:** the shadcn registry website wasn't reachable from the build environment. The code is the same standard pattern; `components.json` is included so `npx shadcn add <component>` works on your machine.
- **Fonts from the `geist` npm package** rather than Google Fonts, so builds don't depend on a network call.

## Verification performed

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ no errors |
| `npm run lint` | ✅ no warnings |
| `npm test` | ✅ 12/12 (sign-in validation, open-redirect protection) |
| `npm run build` | ✅ 15 routes; protected pages partially prerendered |
| `npm audit --omit=dev` | ✅ 0 vulnerabilities in production dependencies |
| Browser end-to-end test against a local Supabase-auth stand-in | ✅ 20/20 |

End-to-end checks covered: redirect when signed out (with `next`), empty-form validation, wrong-password message, email preserved after an error, successful sign-in returning to the requested page, `/login` bouncing signed-in users to the dashboard, every nav link rendering with the correct active state, page titles, account selector menu, 404 page, mobile layout (sidebar hidden, slide-in menu navigates and closes), sign-out, and re-protection after sign-out. No console errors.

## Not yet verified (needs your Supabase project)

Sign-in against your real Supabase project and the Vercel deployment. Steps are in the Phase 1 hand-over message and repeated in the README.
