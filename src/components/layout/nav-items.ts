import {
  BarChart3,
  BookOpenText,
  CalendarDays,
  Layers,
  LayoutDashboard,
  ListOrdered,
  NotebookPen,
  Settings,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };
export type NavGroup = { label: string; items: NavItem[] };

/** Single source of truth for navigation (sidebar + mobile menu). */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
    ],
  },
  {
    label: "Journal",
    items: [
      { href: "/trades", label: "Trades", icon: ListOrdered },
      { href: "/reviews", label: "Reviews", icon: NotebookPen },
    ],
  },
  {
    label: "Library",
    items: [
      { href: "/strategies", label: "Strategies", icon: BookOpenText },
      { href: "/instruments", label: "Instruments", icon: Layers },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/accounts", label: "Accounts", icon: Wallet },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
