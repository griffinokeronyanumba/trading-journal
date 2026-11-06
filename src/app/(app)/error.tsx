"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Shown when a page fails to load (e.g. the database can't be reached). */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div role="alert" className="flex flex-col items-center gap-4 rounded-lg border border-loss/30 bg-loss/5 px-6 py-14 text-center">
      <AlertTriangle className="size-6 text-loss" />
      <div>
        <h2 className="text-sm font-semibold">Something went wrong loading this page</h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Your data is safe. Check your internet connection and try again. If it keeps happening, the database may be paused or unreachable.
        </p>
        {error.digest && <p className="num mt-2 text-xs text-muted-foreground">Reference: {error.digest}</p>}
      </div>
      <Button size="sm" variant="outline" onClick={reset}><RotateCcw /> Try again</Button>
    </div>
  );
}
