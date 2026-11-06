import { Brand } from "./brand";
import { NavLinks } from "./nav-links";

/** Fixed left navigation, desktop only (≥ lg). Mobile uses MobileNav. */
export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-14 items-center px-3">
        <Brand />
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <NavLinks />
      </div>
      <div className="border-t border-sidebar-border px-5 py-3 text-[11px] text-muted-foreground/70">
        <span className="num">v0.3</span> · Phase 3
      </div>
    </aside>
  );
}
