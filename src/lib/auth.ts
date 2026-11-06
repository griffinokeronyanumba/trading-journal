import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type SessionUser = { id: string; email: string };

/**
 * Server-side auth check for protected pages and actions. proxy.ts already
 * redirects signed-out visitors; this is the second line of defence and
 * gives server code the user's id.
 */
export async function requireUser(): Promise<SessionUser> {
  // Read cookies first so this always runs per request, never at build time.
  await cookies();
  if (!isSupabaseConfigured) redirect("/login");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (error || !claims?.sub) redirect("/login");

  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : "" };
}
