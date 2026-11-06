import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { ChartFrame, EmptyChart } from "@/components/charts/chart-frame";
import { EquityChart } from "@/components/charts/equity-chart";
import { PageHeader } from "@/components/layout/page-header";
import { StatTile } from "@/components/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAccountContext, getProfile } from "@/features/accounts/queries";
import { BreakdownTable } from "@/features/analytics/components/breakdown-table";
import { getEnrichedTrades } from "@/features/analytics/queries";
import { getReferenceLists } from "@/features/settings/queries";
import { DeleteStrategyButton } from "@/features/strategies/components/delete-strategy-button";
import { adherenceBreakdown, groupSummaries, rCurve, summarize } from "@/lib/analytics/metrics";
import { formatPct, formatR, formatRatio, toneClass } from "@/lib/format";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Strategy" };

function Text({ title, children }: { title: string; children: string | null }) {
  return (
    <div>
      <p className="mb-1 text-[11px] text-muted-foreground">{title}</p>
      <p className="text-sm whitespace-pre-wrap">{children || <span className="text-muted-foreground">—</span>}</p>
    </div>
  );
}

export default async function StrategyPage({ params }: PageProps<"/strategies/[strategyId]">) {
  const { strategyId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(strategyId)) notFound();
  const [lists, { accounts, active }, profile] = await Promise.all([getReferenceLists(), getAccountContext(), getProfile()]);
  const st = lists.strategies.find((s) => s.id === strategyId);
  if (!st) notFound();
  const band = profile.breakeven_band_r;
  const scope = active ? [active] : accounts;
  const currencies = [...new Set(scope.map((a) => a.currency))];
  const currency = currencies.length === 1 ? currencies[0] : null;
  const trades = (await getEnrichedTrades(scope.map((a) => a.id))).filter((t) => t.strategy_id === st.id);
  const s = summarize(trades, band);
  const rules = lists.rules.filter((r) => r.strategy_id === st.id);
  const required = lists.strategyConfluences.filter((c) => c.strategy_id === st.id).map((c) => c.confluence_id);
  const supabase = await createClient();
  const sessionIds = (await supabase.from("strategy_sessions").select("session_id").eq("strategy_id", st.id)).data?.map((x) => x.session_id) ?? [];
  const ids = new Set(trades.map((t) => t.id));
  const checks = rules.length ? (await fetchAll((f, t) => supabase.from("trade_rule_checks").select("trade_id,rule_id,followed").in("rule_id", rules.map((r) => r.id)).range(f, t))).filter((c) => ids.has(c.trade_id)) : [];
  const name = (list: { id: string; name: string }[]) => (id: string) => list.find((x) => x.id === id)?.name ?? "?";
  // Deleting affects trades in every account, not just the selected one.
  const allTradeCount = (await fetchAll((f, t) => supabase.from("trades").select("id").eq("strategy_id", st.id).range(f, t))).length;

  // Did the trade have every required confluence?
  const withAll = trades.filter((t) => required.length > 0 && required.every((c) => t.confluence_ids.includes(c)));
  const missing = trades.filter((t) => required.length > 0 && !required.every((c) => t.confluence_ids.includes(c)));
  const adherence = adherenceBreakdown(trades, band);
  const curve = [{ index: 0, date: "", value: 0, change: 0 }, ...rCurve(trades).map((p) => ({ index: p.index, date: p.date, value: p.totalR, change: p.r }))];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={st.name}
        description={`Performance ${active ? `in ${active.name}` : "across all accounts"}`}
        actions={
          <>
            <Button asChild size="sm"><Link href={`/strategies/${st.id}/edit`}><Pencil /> Edit</Link></Button>
            <DeleteStrategyButton id={st.id} name={st.name} tradeCount={allTradeCount} />
          </>
        }
      />
      <div className="flex flex-wrap gap-1.5">
        {!st.is_active && <Badge variant="outline">Inactive</Badge>}
        {sessionIds.map((id) => <Badge key={id} variant="secondary">{name(lists.sessions)(id)}</Badge>)}
        {required.map((id) => <Badge key={id} variant="default">{name(lists.confluences)(id)}</Badge>)}
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-6" aria-label="Strategy performance" data-testid="strategy-kpis">
        <StatTile label="Trades" value={s.totalTrades} />
        <StatTile label="Win rate" value={formatPct(s.winRate, { digits: 1 })} />
        <StatTile label="Total R" value={formatR(s.totalR)} tone={toneClass(s.totalR)} />
        <StatTile label="Average R" value={formatR(s.avgR)} tone={toneClass(s.avgR)} />
        <StatTile label="Profit factor" value={formatRatio(s.profitFactor)} />
        <StatTile label="Rule adherence" value={formatPct(adherence.adherenceRate, { digits: 0 })} />
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartFrame className="xl:col-span-2" title="Cumulative R" note="Every closed trade of this strategy, in order"
          table={{ head: ["Trade", "Date", "Cumulative R"], rows: curve.slice(1).map((p) => [p.index, p.date, formatR(p.value)]) }}>
          {curve.length > 1 ? <EquityChart data={curve} unit="r" baseline={0} /> : <EmptyChart>No closed trades with this strategy yet.</EmptyChart>}
        </ChartFrame>
        <Card>
          <CardHeader><CardTitle>Playbook</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Text title="Description">{st.description}</Text>
            <Text title="Entry conditions">{st.entry_conditions}</Text>
            <Text title="Exit / management">{st.exit_rules}</Text>
            <Text title="Notes">{st.notes}</Text>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4" aria-label="Rules" data-testid="strategy-rules">
          <h2 className="text-sm font-semibold">Rule checklist</h2>
          {rules.length === 0 ? <p className="text-sm text-muted-foreground">No rules yet — add them to get a checklist when trading.</p> : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {rules.map((r) => {
                const cs = checks.filter((c) => c.rule_id === r.id);
                const broken = cs.filter((c) => !c.followed).length;
                return (
                  <li key={r.id} className="flex justify-between gap-3">
                    <span>{r.rule_text}</span>
                    <span className={cn("num shrink-0 text-xs", broken ? "text-loss" : "text-muted-foreground")}>{cs.length ? `followed ${cs.length - broken}/${cs.length}` : "not checked yet"}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <section className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4" aria-label="Required confluences" data-testid="strategy-confluences">
          <h2 className="text-sm font-semibold">Required confluences present?</h2>
          {required.length === 0 ? <p className="text-sm text-muted-foreground">No required confluences set.</p> : (
            <table className="w-full text-sm">
              <thead><tr className="text-[11px] text-muted-foreground"><th className="py-1 text-left font-medium" /><th className="text-right font-medium">Trades</th><th className="text-right font-medium">Win rate</th><th className="text-right font-medium">Avg R</th></tr></thead>
              <tbody>
                {([["All present", summarize(withAll, band)], ["Some missing", summarize(missing, band)]] as const).map(([l, x]) => (
                  <tr key={l} className="border-t border-border/60"><td className="py-1.5">{l}</td><td className="num text-right">{x.totalTrades}</td><td className="num text-right">{formatPct(x.winRate, { digits: 0 })}</td><td className={cn("num text-right", toneClass(x.avgR))}>{formatR(x.avgR)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <BreakdownTable title="By instrument" rows={groupSummaries(trades, (t) => t.instrument_id, (id) => trades.find((t) => t.instrument_id === id)?.symbol ?? "?", band)} currency={currency} />
        <BreakdownTable title="By session" rows={groupSummaries(trades, (t) => t.session_id, name(lists.sessions), band)} currency={currency} />
      </div>
    </div>
  );
}
