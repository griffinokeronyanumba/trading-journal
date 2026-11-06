import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenText, Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAccountContext, getProfile } from "@/features/accounts/queries";
import { getEnrichedTrades } from "@/features/analytics/queries";
import { getReferenceLists } from "@/features/settings/queries";
import { summarize } from "@/lib/analytics/metrics";
import { formatPct, formatR, formatRatio, toneClass } from "@/lib/format";
import { formatDay } from "@/lib/time";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Strategies" };

export default async function StrategiesPage() {
  const [{ accounts, active }, profile, lists] = await Promise.all([getAccountContext(), getProfile(), getReferenceLists()]);
  const trades = await getEnrichedTrades((active ? [active] : accounts).map((a) => a.id));
  const strategies = [...lists.strategies].sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Strategy library"
        description={`Your playbook, with live performance${active ? ` in ${active.name}` : " across all accounts"}.`}
        actions={<Button asChild size="sm"><Link href="/strategies/new"><Plus /> New strategy</Link></Button>}
      />
      {strategies.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card/40 px-6 py-14 text-center">
          <BookOpenText className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Write down your first strategy: its entry conditions, rules and required confluences.</p>
          <Button asChild size="sm"><Link href="/strategies/new"><Plus /> New strategy</Link></Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {strategies.map((st) => {
            const ts = trades.filter((t) => t.strategy_id === st.id);
            const s = summarize(ts, profile.breakeven_band_r);
            const last = ts.at(-1)?.trade_date;
            const rules = lists.rules.filter((r) => r.strategy_id === st.id).length;
            return (
              <Link key={st.id} href={`/strategies/${st.id}`} data-testid="strategy-card"
                className={cn("flex flex-col gap-3 rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/50 focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none", !st.is_active && "opacity-60")}>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-sm font-semibold">{st.name}</h2>
                  {!st.is_active && <Badge variant="outline">Inactive</Badge>}
                </div>
                <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">{st.description ?? "No description yet."}</p>
                <div className="grid grid-cols-4 gap-2 border-t border-border/70 pt-3">
                  {([["Trades", String(s.totalTrades), ""], ["Win rate", formatPct(s.winRate, { digits: 0 }), ""], ["Total R", formatR(s.totalR, 1), toneClass(s.totalR)], ["PF", formatRatio(s.profitFactor), ""]] as const).map(([l, v, tone]) => (
                    <div key={l}><p className="text-[11px] text-muted-foreground">{l}</p><p className={cn("num text-sm", tone)}>{v}</p></div>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">{rules} rule{rules === 1 ? "" : "s"} · {last ? `last traded ${formatDay(last, "d MMM yyyy")}` : "not traded yet"}</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
