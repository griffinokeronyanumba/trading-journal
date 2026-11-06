/**
 * Public Supabase settings. Both values are safe to expose to the browser:
 * all data protection comes from Row Level Security in the database.
 *
 * Supabase now issues "publishable" keys (sb_publishable_...). Older projects
 * use the legacy "anon" key. Either works; publishable is preferred.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseEnv = { url: url ?? "", key: key ?? "" };

/** False until .env.local (or Vercel env vars) are filled in. */
export const isSupabaseConfigured = Boolean(url && key);
