import type { Metadata } from "next";
import { LayoutDashboard } from "lucide-react";

import { ComingSoon } from "@/components/layout/coming-soon";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Dashboard" };

const KPIS = ["Net P&L", "Win rate", "Profit factor", "Average R", "Total trades", "Max drawdown", "Balance", "Return"];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard" description="Performance overview for the selected account." />

      <section aria-label="Key metrics" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {KPIS.map((label) => (
          <div key={label} className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="num mt-1.5 text-lg text-muted-foreground/60">—</p>
          </div>
        ))}
      </section>

      <ComingSoon
        icon={LayoutDashboard}
        phase={5}
        title="Charts and live metrics"
        items={["Equity curve", "Monthly performance", "Win/loss distribution", "Daily performance", "Recent trades", "Account performance"]}
      />
    </div>
  );
}
