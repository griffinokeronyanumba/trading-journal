# Database migrations

Numbered SQL files, applied **in order** through the Supabase Dashboard → SQL Editor
(we're using hosted Supabase only, no CLI yet).

Rules:
- Never edit a migration that has already been run — add a new numbered file instead.
- Every new table must `enable row level security` and get an ownership policy in the same file.

The first migrations arrive in Phase 2.
