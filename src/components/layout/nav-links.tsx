"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { isActive, NAV_GROUPS } from "./nav-items";

/** Highlights the current page. The URL is only known at request time, so the
 *  links first render without a highlight and the active state streams in. */
export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Suspense fallback={<NavLinksView pathname="" onNavigate={onNavigate} />}>
      <ActiveNavLinks onNavigate={onNavigate} />
    </Suspense>
  );
}

function ActiveNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return <NavLinksView pathname={usePathname()} onNavigate={onNavigate} />;
}

function NavLinksView({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-6 px-3" aria-label="Main">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-0.5">
          <p className="px-2 pb-1.5 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
            {group.label}
          </p>
          {group.items.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex h-8 items-center gap-2.5 rounded-md px-2 text-sm transition-colors",
                  "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  "focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none",
                  active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                )}
              >
                {active && <span aria-hidden className="absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full bg-primary" />}
                <Icon className={cn("size-4", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                {label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
