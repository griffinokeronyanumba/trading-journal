import type { Metadata } from "next";
import { AlertTriangle, CheckCircle2, Lightbulb } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { StatTile } from "@/components/stat-tile";
import { getAccountContext, getProfile, listAccounts } from "@/features/accounts/queries";
import { AnalyticsFilters, type FilterDef } from "@/features/analytics/components/analytics-filters";
import { BreakdownTable } from "@/features/analytics/components/breakdown-table";
import { buildInsights } from "@/features/analytics/insights";
import { getEnrichedTrades } from "@/features/analytics/queries";
import { listInstruments } from "@/features/instruments/queries";
import { getReferenceLists } from "@/features/settings/queries";
import { WEEKDAYS } from "@/features/trades/constants";
import { adherenceBreakdown, groupSummaries, mistakeImpact, summarize } from "@/lib/analytics/metrics";
import { formatMoney, formatPct, formatR, formatRatio, toneClass } from "@/lib/format";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { createClient } from "@/lib/supabase/server";
import { formatDay } from "@/lib/time";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };

const one = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : undefined);

export default async function AnalyticsPage({ searchParams }: PageProps<"/analytics">) {
  const sp = await searchParams;
  const [{ accounts, active }, allAccounts, profile, instruments, lists] = await Promise.all([
    getAccountContext(), listAccounts({ includeArchived: true }), getProfile(), listInstruments(), getReferenceLists(),
  ]);
  const band = profile.breakeven_band_r;

  // Account filter: explicit ?account=… wins, otherwise the top-bar selection.
  const accountParam = one(sp.account);
  const scope = accountParam ? allAccounts.filter((a) => a.id === accountParam) : active ? [active] : accounts;
  const all = await getEnrichedTrades(scope.map((a) => a.id));

  const f = {
    instrument: one(sp.instrument), strategy: one(sp.strategy), session: one(sp.session), month: one(sp.month),
    weekday: one(sp.weekday), direction: one(sp.direction), grade: one(sp.grade),
  };
  const trades = all.filter((t) =>
    (!f.instrument || t.instrument_id === f.instrument) &&
    (!f.strategy || t.strategy_id === f.strategy) &&
    (!f.session || t.session_id === f.session) &&
    (!f.month || t.month === f.month) &&
    (!f.weekday || String(t.weekday) === f.weekday) &&
    (!f.direction || t.direction === f.direction) &&
    (!f.grade || t.grade_id === f.grade),
  );

  const currencies = [...new Set(scope.map((a) => a.currency))];
  const currency = currencies.length === 1 ? currencies[0] : null;
  const total = summarize(trades, band);
  const name = (list: { id: string; name: string }[]) => (id: string) => list.find((x) => x.id === id)?.name ?? "Deleted";

  const byInstrument = groupSummaries(trades, (t) => t.instrument_id, (id) => instruments.find((i) => i.id === id)?.symbol ?? "?", band);
  const bySession = groupSummaries(trades, (t) => t.session_id, name(lists.sessions), band);
  const byStrategy = groupSummaries(trades, (t) => t.strategy_id, name(lists.strategies), band);
  const bySetup = groupSummaries(trades, (t) => t.setup_type_id, name(lists.setups), band);
  const byDirection = groupSummaries(trades, (t) => t.direction, (d) => (d === "buy" ? "Buy" : "Sell"), band);
  const byGrade = groupSummaries(trades, (t) => t.grade_id, (id) => lists.grades.find((g) => g.id === id)?.label ?? "?", band)
    .sort((a, b) => (lists.grades.find((g) => g.id === a.key)?.sort_order ?? 99) - (lists.grades.find((g) => g.id === b.key)?.sort_order ?? 99));
  const byWeekday = groupSummaries(trades, (t) => String(t.weekday), (d) => WEEKDAYS[Number(d) - 1], band).sort((a, b) => Number(a.key) - Number(b.key));
  const byMonth = groupSummaries(trades, (t) => t.month, (m) => formatDay(`${m}-01`, "MMM yyyy"), band).sort((a, b) => a.key.localeCompare(b.key));
  const byConfluence = groupSummaries(trades, (t) => t.confluence_ids, name(lists.confluences), band).filter((r) => r.key !== "__none__");

  const mistakes = mistakeImpact(trades, new Map(lists.mistakes.map((m) => [m.id, m.name])), band);
  const adherence = adherenceBreakdown(trades, band);
  const insights = buildInsights({ total, byInstrument, bySession, byStrategy, byDirection, byGrade, mistakes, adherence });

  // Per-rule breakage from the strategy checklists
  const supabase = await createClient();
  const ids = new Set(trades.map((t) => t.id));
  const checks = (await fetchAll((from, to) => supabase.from("trade_rule_checks").select("trade_id,rule_id,followed").range(from, to))).filter((c) => ids.has(c.trade_id));
  const ruleStats = lists.rules
    .map((r) => {
      const cs = checks.filter((c) => c.rule_id === r.id);
      return { id: r.id, text: r.rule_text, strategy: name(lists.strategies)(r.strategy_id), checked: cs.length, broken: cs.filter((c) => !c.followed).length };
    })
    .filter((r) => r.checked > 0)
    .sort((a, b) => b.broken / b.checked - a.broken / a.checked);

  const closedWithRR = trades.filter((t) => t.net_pnl != null && t.planned_rr != null);
  const winners = trades.filter((t) => t.outcome === "win" && t.r_multiple != null);
  const losers = trades.filter((t) => t.outcome === "loss" && t.r_multiple != null);
  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : null);

  const filters: FilterDef[] = [
    { key: "account", label: "Accounts", options: allAccounts.map((a) => ({ value: a.id, label: `${a.name}${a.is_archived ? " (archived)" : ""}` })) },
    { key: "instrument", label: "Instruments", options: instruments.map((i) => ({ value: i.id, label: i.symbol })) },
    { key: "strategy", label: "Strategies", options: lists.strategies.map((s) => ({ value: s.id, label: s.name })) },
    { key: "session", label: "Sessions", options: lists.sessions.map((s) => ({ value: s.id, label: s.name })) },
    { key: "weekday", label: "Weekdays", options: WEEKDAYS.map((d, i) => ({ value: String(i + 1), label: d })) },
    { key: "direction", label: "Directions", options: [{ value: "buy", label: "Buy" }, { value: "sell", label: "Sell" }] },
    { key: "grade", label: "Grades", options: lists.grades.map((g) => ({ value: g.id, label: g.label })) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Analytics"
        description={`${scope.length === 1 ? scope[0].name : `${scope.length} accounts`} · ${total.totalTrades} closed trade${total.totalTrades === 1 ? "" : "s"} in this selection`}
      />
      <AnalyticsFilters filters={filters} />

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8" data-testid="analytics-kpis">
        <StatTile label="Trades" value={total.totalTrades} />
        <StatTile label="Win rate" value={formatPct(total.winRate, { digits: 1 })} />
        <StatTile label="Total R" value={formatR(total.totalR)} tone={toneClass(total.totalR)} />
        <StatTile label="Average R" value={formatR(total.avgR)} tone={toneClass(total.avgR)} />
        <StatTile label="Avg winner" value={formatR(avg(winners.map((t) => t.r_multiple!)))} tone={winners.length ? "text-profit" : undefined} />
        <StatTile label="Avg loser" value={formatR(avg(losers.map((t) => t.r_multiple!)))} tone={losers.length ? "text-loss" : undefined} />
        <StatTile label="Profit factor" value={currency ? formatRatio(total.profitFactor) : "—"} hint={currency ? undefined : "Choose one currency to see money-based profit factor"} />
        <StatTile label="Net P&L" value={currency ? formatMoney(total.netPnl, currency, { signed: true }) : "Mixed currencies"} tone={currency ? toneClass(total.netPnl) : "text-muted-foreground text-sm"} />
      </section>

      <section aria-label="Insights" className="rounded-lg border border-border bg-card p-4" data-testid="insights">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Lightbulb className="size-4 text-warning" /> Insights</h2>
        <ul className="flex flex-col gap-2">
          {insights.map((i) => (
            <li key={i.text} className="flex items-start gap-2 text-sm">
              {i.tone === "good" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-profit" /> : i.tone === "bad" ? <AlertTriangle className="mt-0.5 size-4 shrink-0 text-loss" /> : <Lightbulb className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
              <span>{i.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <BreakdownTable title="By instrument" rows={byInstrument} currency={currency} testId="by-instrument" />
        <BreakdownTable title="By session" rows={bySession} currency={currency} testId="by-session" />
        <BreakdownTable title="By strategy" rows={byStrategy} currency={currency} testId="by-strategy" />
        <BreakdownTable title="Buy vs sell" rows={byDirection} currency={currency} testId="by-direction" />
        <BreakdownTable title="By trade grade" rows={byGrade} currency={currency} testId="by-grade" />
        <BreakdownTable title="By setup" rows={bySetup} currency={currency} testId="by-setup" />
        <BreakdownTable title="By weekday" rows={byWeekday} currency={currency} testId="by-weekday" />
        <BreakdownTable title="By month" rows={byMonth} currency={currency} testId="by-month" />
        <BreakdownTable title="By confluence" rows={byConfluence} currency={currency} testId="by-confluence" emptyText="Tag confluences on trades to see which ones work." />

        <section className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4" aria-label="Risk to reward" data-testid="risk-reward">
          <h2 className="text-sm font-semibold">Risk-to-reward</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div><dt className="text-[11px] text-muted-foreground">Avg planned R:R</dt><dd className="num">{total.avgPlannedRR != null ? `1 : ${formatRatio(total.avgPlannedRR)}` : "—"}</dd></div>
            <div><dt className="text-[11px] text-muted-foreground">Avg realised winner</dt><dd className="num text-profit">{formatR(avg(winners.map((t) => t.r_multiple!)))}</dd></div>
            <div><dt className="text-[11px] text-muted-foreground">Avg realised loser</dt><dd className="num text-loss">{formatR(avg(losers.map((t) => t.r_multiple!)))}</dd></div>
            <div><dt className="text-[11px] text-muted-foreground">Expectancy</dt><dd className={cn("num", toneClass(total.avgR))}>{formatR(total.avgR)} / trade</dd></div>
          </dl>
          <p className="text-xs text-muted-foreground">
            {closedWithRR.length
              ? `Based on ${closedWithRR.length} closed trade${closedWithRR.length === 1 ? "" : "s"} with a stop-loss and take-profit. Winners capturing less than the planned R:R suggests exiting early.`
              : "Add stop-loss and take-profit to trades to see planned vs realised reward."}
          </p>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4" aria-label="Recurring mistakes" data-testid="mistakes">
          <h2 className="text-sm font-semibold">Recurring mistakes</h2>
          {mistakes.length === 0 ? <p className="py-6 text-center text-xs text-muted-foreground">No mistakes tagged in this selection.</p> : (
            <table className="w-full text-sm">
              <thead><tr className="text-[11px] text-muted-foreground"><th className="py-1.5 text-left font-medium">Mistake</th><th className="text-right font-medium">Times</th><th className="text-right font-medium">% of trades</th><th className="text-right font-medium">Win rate</th><th className="text-right font-medium">Total R</th></tr></thead>
              <tbody>
                {mistakes.map((m) => (
                  <tr key={m.id} className="border-t border-border/60" data-testid="mistake-row">
                    <td className="py-1.5">{m.name}</td>
                    <td className="num text-right">{m.count}</td>
                    <td className="num text-right">{formatPct(m.share, { digits: 0 })}</td>
                    <td className="num text-right">{formatPct(m.summary.winRate, { digits: 0 })}</td>
                    <td className={cn("num text-right", toneClass(m.summary.totalR))}>{formatR(m.summary.totalR, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4" aria-label="Trading rule adherence" data-testid="adherence">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">Trading rule adherence</h2>
            <span className="num text-sm">{formatPct(adherence.adherenceRate, { digits: 0 })} <span className="text-xs text-muted-foreground">of recorded trades</span></span>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="text-[11px] text-muted-foreground"><th className="py-1.5 text-left font-medium">Rules</th><th className="text-right font-medium">Trades</th><th className="text-right font-medium">Win rate</th><th className="text-right font-medium">Avg R</th><th className="text-right font-medium">Total R</th></tr></thead>
            <tbody>
              {([["Followed", adherence.followed], ["Broken", adherence.broken], ["Not recorded", adherence.unknown]] as const).map(([label, s]) => (
                <tr key={label} className="border-t border-border/60" data-testid="adherence-row">
                  <td className="py-1.5">{label}</td>
                  <td className="num text-right">{s.totalTrades}</td>
                  <td className="num text-right">{formatPct(s.winRate, { digits: 0 })}</td>
                  <td className={cn("num text-right", toneClass(s.avgR))}>{formatR(s.avgR)}</td>
                  <td className={cn("num text-right", toneClass(s.totalR))}>{formatR(s.totalR, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {ruleStats.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] text-muted-foreground">Most-broken rules</p>
              <ul className="flex flex-col gap-1 text-sm">
                {ruleStats.slice(0, 6).map((r) => (
                  <li key={r.id} className="flex justify-between gap-3" data-testid="rule-row">
                    <span className="truncate">{r.text} <span className="text-xs text-muted-foreground">· {r.strategy}</span></span>
                    <span className="num shrink-0 text-xs">broken {r.broken}/{r.checked}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
