# Phase 4 — Screenshot uploads & trade details

**Completed:** 6 Nov 2026

## What was built

### Database & storage — `supabase/migrations/0004_screenshot_storage.sql`
- Private bucket **`trade-screenshots`** (never public), 5 MB per file, PNG/JPEG/WebP only.
- Storage rules: you can only read and delete files in **your own folder**, and you can only upload into the folder of **a trade you own** (`{your id}/{trade id}/…`).
- The database also checks every screenshot record points inside the owner's folder (from Phase 2).

### Trade detail page — Screenshots section
- **Before** and **After** sections, up to 12 images each.
- **Upload** by clicking, dragging & dropping, or **pasting (Ctrl+V)** — handy for TradingView "copy chart image".
- Images are **compressed in the browser** to WebP, max 1920 px, before upload (keeps you well inside Supabase's free storage).
- **Thumbnail grid**, **full-size viewer** (arrow keys / buttons to move between images), **captions**, **delete** (with confirmation).
- **Compare before / after**: the two side by side (stacked on phones), with thumbnails to pick which before/after image to compare.
- Images are shown through **signed links that expire after 1 hour**.

### Clean-up
- Deleting a screenshot removes the file **and** its record.
- Deleting a trade or an account removes **all** of its screenshot files from storage (no orphaned files using up space).

## Verification performed
| Check | Result |
|---|---|
| Storage security tests | ✅ 9/9 — private bucket, own-folder only, only into own trades, other users can't see/delete, records removed with trade |
| Browser end-to-end | ✅ 25/25 — upload 2 + 1 images, compression to 1920×1080 WebP, non-images rejected, thumbnails & full-size load, viewer navigation & keyboard, captions, compare side-by-side, delete, other user blocked from signing/uploading/deleting/reading via the API, trade & account deletion remove files, mobile |
| Regression: Phases 1–3 browser (20, 32, 52) and database (18, 16) | ✅ all pass |
| Typecheck · lint · build · unit tests | ✅ |
