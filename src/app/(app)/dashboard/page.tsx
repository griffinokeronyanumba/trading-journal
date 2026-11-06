import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Plus, Wallet } from "lucide-react";

import { ChartFrame, EmptyChart } from "@/components/charts/chart-frame";
import { EquityChart } from "@/components/charts/equity-chart";
import { RHistogram } from "@/components/charts/histogram";
import { SignedBars } from "@/components/charts/signed-bars";
import { PageHeader } from "@/components/layout/page-header";
import { StatTile } from "@/components/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAccountContext, getProfile } from "@/features/accounts/queries";
import { getEnrichedTrades } from "@/features/analytics/queries";
import { DirectionBadge, OutcomeBadge } from "@/features/trades/components/trade-badges";
import {
  accountStatus, currencyGroups, dailySeries, equityCurve, maxDrawdown, monthlySeries, rCurve, rHistogram, summarize,
} from "@/lib/analytics/metrics";
import { formatMoney, formatPct, formatR, formatRatio, toneClass } from "@/lib/format";
import { formatDay } from "@/lib/time";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

/** Profit factor from R — used when money can't be pooled across currencies. */
function rProfitFactor(rs: number[]) {
  const win = rs.filter((r) => r > 0).reduce((a, b) => a + b, 0);
  const loss = Math.abs(rs.filter((r) => r < 0).reduce((a, b) => a + b, 0));
  if (!rs.length) return null;
  return loss === 0 ? (win > 0 ? Infinity : null) : Math.round((win / loss) * 100) / 100;
}

export default async function DashboardPage() {
  const [{ accounts, active }, profile] = await Promise.all([getAccountContext(), getProfile()]);
  const band = profile.breakeven_band_r;

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Dashboard" />
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border bg-card/40 px-6 py-16 text-center">
          <Wallet className="size-6 text-muted-foreground" />
          <div>
            <h2 className="text-sm font-medium">Welcome — start by creating a trading account</h2>
            <p className="mt-1 text-sm text-muted-foreground">Then record trades and your statistics appear here.</p>
          </div>
          <Button asChild size="sm"><Link href="/accounts">Create account</Link></Button>
        </div>
      </div>
    );
  }

  const scope = active ? [active] : accounts;
  const trades = await getEnrichedTrades(scope.map((a) => a.id));
  const s = summarize(trades, band);
  const groups = currencyGroups(scope, trades, band);
  const single = groups.length === 1 ? groups[0] : null;
  const pf = single ? s.profitFactor : rProfitFactor(trades.filter((t) => t.net_pnl != null && t.r_multiple != null).map((t) => t.r_multiple!));
  const money = (pick: (g: (typeof groups)[number]) => number, fmt: (v: number, c: string) => string) =>
    groups.map((g) => ({ value: fmt(pick(g), g.currency), tone: toneClass(pick(g)) }));

  // Charts
  const equity = single
    ? single.curve.map((p) => ({ index: p.index, date: p.date, value: p.balance, change: p.pnl }))
    : [{ index: 0, date: "", value: 0, change: 0 }, ...rCurve(trades).map((p) => ({ index: p.index, date: p.date, value: p.totalR, change: p.r }))];
  const monthly = monthlySeries(trades, band);
  const daily = dailySeries(trades, band).slice(-30);
  const fmtVal = (v: number) => (single ? formatMoney(v, single.currency, { signed: true }) : formatR(v));
  const recent = [...trades].sort((a, b) => b.trade_date.localeCompare(a.trade_date) || (b.created_at ?? "").localeCompare(a.created_at ?? "")).slice(0, 8);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description={active ? `${active.name} · ${active.currency}` : `All ${accounts.length} accounts${groups.length > 1 ? " · money shown per currency" : ""}`}
        actions={<Button asChild size="sm"><Link href="/trades/new"><Plus /> New trade</Link></Button>}
      />

      <section aria-label="Key metrics" className="grid grid-cols-2 gap-3 md:grid-cols-5" data-testid="kpis">
        <StatTile label="Net P&L" lines={money((g) => g.summary.netPnl, (v, c) => formatMoney(v, c, { signed: true }))} />
        <StatTile label="Current balance" lines={groups.map((g) => ({ value: formatMoney(g.currentBalance, g.currency) }))} />
        <StatTile label="Total return" lines={money((g) => g.returnPct, (v) => formatPct(v, { signed: true }))} />
        <StatTile label="Max drawdown" lines={groups.map((g) => ({ value: `${formatMoney(g.maxDrawdown.amount, g.currency)} · ${formatPct(g.maxDrawdown.pct)}`, tone: g.maxDrawdown.amount > 0 ? "text-loss" : undefined }))} hint="Largest peak-to-trough fall of the equity curve" />
        <StatTile label="Profit factor" value={formatRatio(pf)} hint={single ? "Gross profit ÷ gross loss" : "Calculated in R because accounts use different currencies"} />
        <StatTile label="Total trades" value={s.totalTrades} />
        <StatTile label="Winning trades" value={s.wins} tone={s.wins ? "text-profit" : undefined} />
        <StatTile label="Losing trades" value={s.losses} tone={s.losses ? "text-loss" : undefined} />
        <StatTile label="Win rate" value={formatPct(s.winRate, { digits: 1 })} hint={`Wins ÷ (wins + losses). ${s.breakevens} break-even trade(s) excluded.`} />
        <StatTile label="Average R" value={formatR(s.avgR)} tone={toneClass(s.avgR)} />
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartFrame
          className="xl:col-span-2"
          title={single ? "Equity curve" : "Cumulative R"}
          note={single ? `Balance after each closed trade, from ${formatMoney(single.startingBalance, single.currency)}` : "Accounts use different currencies, so performance is combined in R"}
          table={{ head: ["Trade", "Date", single ? "Balance" : "Cumulative R"], rows: equity.slice(1).map((p) => [p.index, p.date, single ? formatMoney(p.value, single.currency) : formatR(p.value)]) }}
        >
          {equity.length > 1 ? <EquityChart data={equity} unit={single ? "money" : "r"} currency={single?.currency} baseline={single ? single.startingBalance : 0} /> : <EmptyChart />}
        </ChartFrame>
        <ChartFrame
          title="Win / loss distribution"
          note={`${s.wins} wins · ${s.losses} losses · ${s.breakevens} break-even`}
          table={{ head: ["Result (R)", "Trades"], rows: rHistogram(trades).filter((b) => b.count).map((b) => [b.label, b.count]) }}
        >
          {s.totalTrades ? <RHistogram data={rHistogram(trades)} /> : <EmptyChart />}
        </ChartFrame>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartFrame title="Monthly performance" note={single ? `Net P&L per month (${single.currency})` : "R per month"}
          table={{ head: ["Month", single ? "Net P&L" : "R", "Trades", "Win rate"], rows: monthly.map((m) => [m.key, single ? fmtVal(m.pnl) : formatR(m.r), m.trades, formatPct(m.wins + m.losses ? (m.wins / (m.wins + m.losses)) * 100 : null, { digits: 0 })]) }}>
          {monthly.length ? (
            <SignedBars testId="monthly-chart" data={monthly.map((m) => ({ label: formatDay(`${m.key}-01`, "MMM yy"), value: single ? m.pnl : m.r, detail: [["Trades", String(m.trades)], ["R", formatR(m.r)]] }))} unit={single ? "money" : "r"} currency={single?.currency} />
          ) : <EmptyChart />}
        </ChartFrame>
        <ChartFrame title="Daily performance" note={`Last ${daily.length} trading day${daily.length === 1 ? "" : "s"}`}
          table={{ head: ["Date", single ? "Net P&L" : "R", "Trades"], rows: daily.map((d) => [d.key, single ? fmtVal(d.pnl) : formatR(d.r), d.trades]) }}>
          {daily.length ? (
            <SignedBars testId="daily-chart" data={daily.map((d) => ({ label: formatDay(d.key, "d MMM"), value: single ? d.pnl : d.r, detail: [["Trades", String(d.trades)], ["R", formatR(d.r)]] }))} unit={single ? "money" : "r"} currency={single?.currency} />
          ) : <EmptyChart />}
        </ChartFrame>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="flex min-w-0 flex-col gap-3" aria-label="Recent trades">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent trades</h2>
            <Button asChild variant="ghost" size="sm"><Link href="/trades">All trades <ArrowRight /></Link></Button>
          </div>
          {recent.length ? (
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Date</TableHead><TableHead>Instrument</TableHead><TableHead>Dir</TableHead><TableHead className="text-right">Net P&amp;L</TableHead><TableHead className="text-right">R</TableHead><TableHead>Outcome</TableHead></TableRow></TableHeader>
              <TableBody>
                {recent.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="num text-xs">{formatDay(t.trade_date, "dd MMM")}</TableCell>
                    <TableCell><Link href={`/trades/${t.id}`} className="num hover:text-primary hover:underline">{t.symbol}</Link></TableCell>
                    <TableCell><DirectionBadge direction={t.direction} /></TableCell>
                    <TableCell className={cn("num text-right", toneClass(t.net_pnl))}>{formatMoney(t.net_pnl, t.currency, { signed: true })}</TableCell>
                    <TableCell className={cn("num text-right", toneClass(t.r_multiple))}>{formatR(t.r_multiple)}</TableCell>
                    <TableCell><OutcomeBadge outcome={t.outcome} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : <EmptyChart>No trades yet.</EmptyChart>}
        </section>

        <section className="flex min-w-0 flex-col gap-3" aria-label="Account performance">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Account performance</h2>
            <Button asChild variant="ghost" size="sm"><Link href="/accounts">Accounts <ArrowRight /></Link></Button>
          </div>
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Account</TableHead><TableHead className="text-right">Balance</TableHead><TableHead className="text-right">Return</TableHead><TableHead className="text-right">Win rate</TableHead><TableHead className="text-right">Max DD</TableHead><TableHead className="text-right">Trades</TableHead></TableRow></TableHeader>
            <TableBody>
              {scope.map((a) => {
                const ts = trades.filter((t) => t.account_id === a.id);
                const st = accountStatus(a, ts);
                const sm = summarize(ts, band);
                const dd = maxDrawdown(equityCurve(ts, a.starting_balance));
                return (
                  <TableRow key={a.id} data-testid="account-row">
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="max-w-40 truncate">{a.name}</span>
                        {st.drawdownBreached && <Badge variant="loss">DD breached</Badge>}
                        {st.dailyLimitBreaches.length > 0 && <Badge variant="warning">Daily limit ×{st.dailyLimitBreaches.length}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="num text-right">{formatMoney(st.currentBalance, a.currency)}</TableCell>
                    <TableCell className={cn("num text-right", toneClass(st.returnPct))}>{formatPct(st.returnPct, { signed: true })}</TableCell>
                    <TableCell className="num text-right">{formatPct(sm.winRate, { digits: 1 })}</TableCell>
                    <TableCell className="num text-right">{formatPct(dd.pct)}</TableCell>
                    <TableCell className="num text-right">{sm.totalTrades}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </section>
      </div>
    </div>
  );
}
