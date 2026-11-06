import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { AccountSelector } from "./account-selector";
import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";

async function CurrentUser() {
  const user = await requireUser();
  return <UserMenu email={user.email} />;
}

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 lg:px-6">
      <MobileNav />
      <AccountSelector />
      <div className="ml-auto flex items-center gap-2">
        <Button asChild size="sm">
          <Link href="/trades/new">
            <Plus />
            <span className="hidden sm:inline">New trade</span>
          </Link>
        </Button>
        <Suspense fallback={<Skeleton className="size-8 rounded-full" />}>
          <CurrentUser />
        </Suspense>
      </div>
    </header>
  );
}
