import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ChevronLeft, ChevronRight, NotebookPen, Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { StatTile } from "@/components/stat-tile";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAccountContext, getProfile } from "@/features/accounts/queries";
import { getEnrichedTrades } from "@/features/analytics/queries";
import { DirectionBadge, OutcomeBadge } from "@/features/trades/components/trade-badges";
import { summarize } from "@/lib/analytics/metrics";
import { formatMoney, formatPct, formatR, toneClass } from "@/lib/format";
import { isDay, monthGrid, parseDay, shiftMonth } from "@/lib/periods";
import { formatDay, todayInTz } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { TradeEnriched } from "@/types/database";

export const metadata: Metadata = { title: "Calendar" };

const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const sp = await searchParams;
  const [{ accounts, active }, profile] = await Promise.all([getAccountContext(), getProfile()]);
  const today = todayInTz(profile.timezone);
  const month = typeof sp.month === "string" && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : today.slice(0, 7);
  const selected = isDay(sp.day) ? sp.day : null;
  const band = profile.breakeven_band_r;

  const scope = active ? [active] : accounts;
  const currencies = [...new Set(scope.map((a) => a.currency))];
  const currency = currencies.length === 1 ? currencies[0] : null;
  const dailyLimit = active?.daily_loss_limit_pct != null ? (active.starting_balance * active.daily_loss_limit_pct) / 100 : null;

  const all = await getEnrichedTrades(scope.map((a) => a.id));
  const inMonth = all.filter((t) => t.trade_date.startsWith(month));
  const byDay = new Map<string, TradeEnriched[]>();
  for (const t of inMonth) byDay.set(t.trade_date, [...(byDay.get(t.trade_date) ?? []), t]);

  const value = (s: { netPnl: number; totalR: number }) => (currency ? s.netPnl : s.totalR);
  const fmt = (v: number) => (currency ? formatMoney(v, currency, { signed: true }) : formatR(v));
  /** Short form for narrow phone cells, e.g. "+1.2K" or "+1.0R". */
  const short = (v: number) =>
    currency ? `${v > 0 ? "+" : v < 0 ? "−" : ""}${new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(Math.abs(v))}` : formatR(v, 1);
  const monthSummary = summarize(inMonth, band);
  const days = [...byDay.entries()].map(([d, ts]) => ({ d, s: summarize(ts, band) })).filter((x) => x.s.totalTrades > 0);
  const greenDays = days.filter((x) => value(x.s) > 0).length;
  const redDays = days.filter((x) => value(x.s) < 0).length;
  const weeks = monthGrid(month);
  const href = (q: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    Object.entries({ month, ...q }).forEach(([k, v]) => v && p.set(k, v));
    return `/calendar?${p}`;
  };
  const dayTrades = selected ? [...(byDay.get(selected) ?? all.filter((t) => t.trade_date === selected))] : [];
  const daySummary = summarize(dayTrades, band);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Calendar"
        description={`${active ? active.name : "All accounts"} · ${currency ? `daily P&L in ${currency}` : "daily results in R (mixed currencies)"}`}
        actions={
          <div className="flex items-center gap-1">
            <Button asChild variant="outline" size="icon-sm"><Link href={href({ month: shiftMonth(month, -1) })} aria-label="Previous month" scroll={false}><ChevronLeft /></Link></Button>
            <span className="num min-w-32 text-center text-sm font-medium" data-testid="calendar-month">{formatDay(`${month}-01`, "MMMM yyyy")}</span>
            <Button asChild variant="outline" size="icon-sm"><Link href={href({ month: shiftMonth(month, 1) })} aria-label="Next month" scroll={false}><ChevronRight /></Link></Button>
            <Button asChild variant="ghost" size="sm"><Link href={`/calendar?month=${today.slice(0, 7)}`} scroll={false}>Today</Link></Button>
          </div>
        }
      />

      <section aria-label="Month summary" className="grid grid-cols-2 gap-3 md:grid-cols-6" data-testid="month-summary">
        <StatTile label={currency ? "Net P&L" : "Total R"} value={fmt(value(monthSummary))} tone={toneClass(value(monthSummary))} />
        <StatTile label="Trades" value={monthSummary.totalTrades} />
        <StatTile label="Win rate" value={formatPct(monthSummary.winRate, { digits: 1 })} />
        <StatTile label="Average R" value={formatR(monthSummary.avgR)} tone={toneClass(monthSummary.avgR)} />
        <StatTile label="Green days" value={greenDays} tone={greenDays ? "text-profit" : undefined} />
        <StatTile label="Red days" value={redDays} tone={redDays ? "text-loss" : undefined} />
      </section>

      <div>
        <section className="grid grid-cols-7 gap-1 sm:grid-cols-[repeat(7,minmax(0,1fr))_minmax(0,0.9fr)] sm:gap-1.5" aria-label={`Trading calendar for ${formatDay(`${month}-01`, "MMMM yyyy")}`}>
          {WEEK.map((d) => <div key={d} aria-hidden className="px-1 pb-1 text-[11px] font-medium text-muted-foreground sm:px-2">{d}</div>)}
          <div aria-hidden className="hidden px-2 pb-1 text-[11px] font-medium text-muted-foreground sm:block">Week</div>
          {weeks.map((week) => {
            const wTrades = week.flatMap((d) => (d.inMonth ? byDay.get(d.day) ?? [] : []));
            const ws = summarize(wTrades, band);
            return [
              ...week.map(({ day, inMonth: inside }) => {
                const ts = inside ? byDay.get(day) ?? [] : [];
                const s = summarize(ts, band);
                const v = value(s);
                const has = s.totalTrades > 0 || ts.length > 0;
                const breached = dailyLimit != null && currency && s.netPnl <= -dailyLimit;
                return (
                  <Link
                    key={day}
                    href={href({ day })}
                    scroll={false}
                    aria-current={selected === day ? "date" : undefined}
                    data-testid={`day-${day}`}
                    className={cn(
                      "flex min-h-14 flex-col gap-0.5 rounded-md border p-1 text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring sm:min-h-24 sm:gap-1 sm:p-2",
                      inside ? "border-border bg-card hover:border-primary/50" : "border-transparent bg-card/30 text-muted-foreground",
                      has && s.totalTrades > 0 && (v > 0 ? "border-chart-pos/40 bg-chart-pos/10" : v < 0 ? "border-chart-neg/40 bg-chart-neg/10" : ""),
                      selected === day && "ring-2 ring-primary",
                    )}
                  >
                    <span className={cn("num flex items-center justify-between text-xs", day === today && "font-semibold text-primary")}>
                      <span>{parseDay(day).getDate()}<span className="sr-only"> {formatDay(day, "EEEE MMMM")}{has ? "" : ", no trades"}</span></span>
                      {breached && <AlertTriangle className="size-3.5 text-warning" aria-label="Daily loss limit breached" />}
                    </span>
                    {s.totalTrades > 0 && (
                      <>
                        <span className={cn("num hidden text-sm font-medium sm:block", toneClass(v))}>{fmt(v)}</span>
                        <span className={cn("num text-[10px] font-medium sm:hidden", toneClass(v))}>{short(v)}</span>
                        <span className="num hidden text-[11px] text-muted-foreground sm:block">{s.totalTrades} trade{s.totalTrades === 1 ? "" : "s"} · {formatPct(s.winRate, { digits: 0 })}</span>
                        <span className={cn("num hidden text-[11px] sm:block", toneClass(s.totalR))}>{formatR(s.totalR)}</span>
                      </>
                    )}
                    {ts.length > 0 && s.totalTrades === 0 && <span className="text-[11px] text-muted-foreground">{ts.length} open</span>}
                  </Link>
                );
              }),
              <div key={`w-${week[0].day}`} className="hidden min-h-24 flex-col justify-center gap-0.5 rounded-md border border-dashed border-border px-2 sm:flex" data-testid={`week-${week[0].day}`}>
                {ws.totalTrades > 0 ? (
                  <>
                    <span className={cn("num text-sm", toneClass(value(ws)))}>{fmt(value(ws))}</span>
                    <span className="num text-[11px] text-muted-foreground">{ws.totalTrades} trades · {formatR(ws.totalR)}</span>
                  </>
                ) : <span className="text-[11px] text-muted-foreground">—</span>}
              </div>,
            ];
          })}
        </section>
      </div>

      {selected && (
        <section aria-label={`Trades on ${selected}`} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4" data-testid="day-panel">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">{formatDay(selected, "EEEE d MMMM yyyy")}</h2>
              <p className="num text-xs text-muted-foreground">
                {daySummary.totalTrades} closed trade{daySummary.totalTrades === 1 ? "" : "s"} · {fmt(value(daySummary))} · {formatR(daySummary.totalR)} · win rate {formatPct(daySummary.winRate, { digits: 0 })}
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild size="sm" variant="outline"><Link href={`/reviews/daily/${selected}`}><NotebookPen /> Daily review</Link></Button>
              <Button asChild size="sm" variant="secondary"><Link href={`/trades/new?date=${selected}`}><Plus /> Add trade</Link></Button>
            </div>
          </div>
          {dayTrades.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No trades recorded on this day.</p>
          ) : (
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Instrument</TableHead><TableHead>Dir</TableHead>{!active && <TableHead>Account</TableHead>}<TableHead>Session</TableHead><TableHead>Strategy</TableHead><TableHead className="text-right">Net P&amp;L</TableHead><TableHead className="text-right">R</TableHead><TableHead>Outcome</TableHead></TableRow></TableHeader>
              <TableBody>
                {dayTrades.map((t) => (
                  <TableRow key={t.id} data-testid="day-trade">
                    <TableCell><Link href={`/trades/${t.id}`} className="num hover:text-primary hover:underline">{t.symbol}</Link></TableCell>
                    <TableCell><DirectionBadge direction={t.direction} /></TableCell>
                    {!active && <TableCell className="text-xs text-muted-foreground">{t.account_name}</TableCell>}
                    <TableCell className="text-xs">{t.session_name ?? "—"}</TableCell>
                    <TableCell className="text-xs">{t.strategy_name ?? "—"}</TableCell>
                    <TableCell className={cn("num text-right", toneClass(t.net_pnl))}>{formatMoney(t.net_pnl, t.currency, { signed: true })}</TableCell>
                    <TableCell className={cn("num text-right", toneClass(t.r_multiple))}>{formatR(t.r_multiple)}</TableCell>
                    <TableCell><OutcomeBadge outcome={t.outcome} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      )}
    </div>
  );
}
