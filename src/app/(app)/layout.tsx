import { Suspense } from "react";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";

/** Server-side check before rendering any protected page (proxy.ts is the first check). */
async function AuthGate({ children }: { children: React.ReactNode }) {
  await requireUser();
  return children;
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-7 w-48" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-svh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <Suspense fallback={<PageSkeleton />}>
            <AuthGate>{children}</AuthGate>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
