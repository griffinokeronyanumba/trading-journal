import type { Metadata } from "next";
import { Suspense } from "react";
import { CandlestickChart, TriangleAlert } from "lucide-react";

import { isSupabaseConfigured } from "@/lib/env";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="relative flex min-h-svh items-center justify-center p-6">
      {/* faint grid, terminal feel */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]"
      />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-card">
            <CandlestickChart className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Trading Journal</h1>
            <p className="text-sm text-muted-foreground">Sign in to your private workspace</p>
          </div>
        </div>

        {!isSupabaseConfigured && (
          <div className="mb-4 flex gap-3 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <p>
              Supabase isn&apos;t connected. Copy <code className="num">.env.example</code> to{" "}
              <code className="num">.env.local</code> and add your project URL and publishable key.
            </p>
          </div>
        )}

        <div className="rounded-lg border border-border bg-card p-6">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Private application · registration is closed
        </p>
      </div>
    </main>
  );
}
