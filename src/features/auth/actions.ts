"use server";

import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath, signInSchema, type SignInState } from "./schema";

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const raw = {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    next: String(formData.get("next") ?? ""),
  };

  if (!isSupabaseConfigured) {
    return { error: "Supabase is not configured yet. Add your keys to .env.local.", email: raw.email };
  }

  const parsed = signInSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: SignInState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if ((field === "email" || field === "password") && !fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return { fieldErrors, email: raw.email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Network/server problems are not the user's fault — say so.
    if (!error.status || error.status >= 500) {
      return { error: "Couldn't reach the authentication server. Check your connection and try again.", email: raw.email };
    }
    // Deliberately vague: don't reveal whether the email exists.
    return { error: "Incorrect email or password.", email: raw.email };
  }

  redirect(safeNextPath(parsed.data.next));
}

export async function signOut() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
