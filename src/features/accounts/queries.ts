import "server-only";

import { getActiveAccountId } from "@/lib/active-account";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Profile, TradingAccount } from "@/types/database";

export async function listAccounts(opts: { includeArchived?: boolean } = {}): Promise<TradingAccount[]> {
  await requireUser();
  const supabase = await createClient();
  let query = supabase.from("trading_accounts").select("*").order("is_archived").order("created_at");
  if (!opts.includeArchived) query = query.eq("is_archived", false);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function getProfile(): Promise<Profile> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (error) throw new Error(error.message);
  // Defaults if the profile row is somehow missing (it is created on sign-up).
  return (
    data ?? {
      id: user.id,
      display_name: null,
      timezone: "Africa/Nairobi",
      default_currency: "USD",
      breakeven_band_r: 0.1,
      created_at: "",
      updated_at: "",
    }
  );
}

/** Accounts for the selector + which one is active. Archived accounts are hidden. */
export async function getAccountContext() {
  const accounts = await listAccounts();
  const activeId = await getActiveAccountId(accounts.map((a) => a.id));
  const active = accounts.find((a) => a.id === activeId) ?? null;
  return { accounts, activeId, active };
}
