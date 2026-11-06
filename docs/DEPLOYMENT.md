# Deployment guide — GitHub, Supabase and Vercel

Do these once, in order. Nothing here needs the command line except steps 2 and 7.

## 1. Supabase (database, login, storage)

1. Open your project at **supabase.com** → **SQL Editor** → **New query**.
2. Run each migration **once, in this order** (paste the whole file, click **Run**):

   | # | File | Adds |
   |---|---|---|
   | 1 | `supabase/migrations/0001_core_schema.sql` | all tables, defaults for your user |
   | 2 | `supabase/migrations/0002_row_level_security.sql` | access rules |
   | 3 | `supabase/migrations/0003_trades_view_and_save.sql` | trade view + atomic save |
   | 4 | `supabase/migrations/0004_screenshot_storage.sql` | private screenshot bucket |
   | 5 | `supabase/migrations/0005_strategies_and_reviews.sql` | strategy & review saves |
   | 6 | `supabase/migrations/0006_import_trades.sql` | CSV import |

   If a file fails, don't run the next one — copy the error message and ask.
3. **Authentication → Users → Add user** (if not done yet): your email + a strong password, tick **Auto Confirm User**.
4. **Authentication → Sign In / Providers**: turn **off** "Allow new users to sign up" (private app).
5. **Project Settings → API Keys**: copy the **publishable** key. **Project Settings → Data API** (or the project home): copy the **Project URL**.

> Changing your password later: Authentication → Users → your user → **Send password recovery** or **Reset password**.

## 2. GitHub (one push of the whole history)

1. On github.com create a **new private repository** named `trading-journal` — leave "Add a README" **unticked**.
2. On your computer, in the `trading-journal` folder (the one with `package.json`):

   ```bash
   git remote add origin https://github.com/<your-username>/trading-journal.git
   git push -u origin main
   ```

   Git will ask you to sign in to GitHub the first time. All phase commits upload together.

`.env.local` is never uploaded (it's in `.gitignore`), so your keys stay on your computer.

## 3. Vercel (hosting)

1. **vercel.com → Add New → Project** → import `trading-journal` from GitHub.
2. Framework: **Next.js** (detected automatically). Leave build settings as they are.
3. **Environment Variables** — add both:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | your Project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | your publishable key |

4. **Deploy.** After 1–2 minutes you get a URL such as `trading-journal-xyz.vercel.app`.
5. Open it, sign in, and check: dashboard loads, add a trade, upload a screenshot.
6. In Supabase → **Authentication → URL Configuration**, set **Site URL** to your Vercel URL (keeps future auth emails pointing at the right place).

Every later `git push` to `main` redeploys automatically.

## 4. Good to know (Supabase free plan)

- Limits: **500 MB** database, **1 GB** file storage. Trades are tiny; compressed screenshots are typically 100–400 KB, so roughly 3,000+ screenshots fit.
- **Free projects pause after 7 days without activity.** If the app shows "Something went wrong loading this page", open the Supabase dashboard and click **Restore project**. Using the journal at least weekly avoids this; the Pro plan never pauses.
- **Backups:** Trades → **Export CSV** regularly. The export re-imports cleanly (Trades → Import). Screenshots are not in the CSV.

## 5. Never

- Never put the **secret / service_role** key in Vercel or `.env.local` — the app doesn't need it.
- Never edit a migration you've already run; future changes come as new numbered files.
