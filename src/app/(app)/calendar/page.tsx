import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";

import { ComingSoon } from "@/components/layout/coming-soon";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Calendar" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Calendar" description="Daily P&L, trade count, win rate and R at a glance." />
      <ComingSoon icon={CalendarDays} phase={6} title="Monthly trading calendar" items={["Daily P&L", "Trades per day", "Daily win rate", "Daily R", "Click-through to trades"]} />
    </div>
  );
}
