import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { StatTile } from "@/components/stat-tile";
import { Button } from "@/components/ui/button";
import { getAccountContext, getProfile } from "@/features/accounts/queries";
import { BreakdownTable } from "@/features/analytics/components/breakdown-table";
import { getEnrichedTrades } from "@/features/analytics/queries";
import { ReviewForm } from "@/features/reviews/components/review-form";
import { getReferenceLists } from "@/features/settings/queries";
import { groupSummaries, mistakeImpact, summarize } from "@/lib/analytics/metrics";
import { formatMoney, formatPct, formatR, toneClass } from "@/lib/format";
import { isDay, periodBounds, periodLabel, shiftPeriod } from "@/lib/periods";
import { createClient } from "@/lib/supabase/server";
import { formatDay } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { ReviewPeriod } from "@/types/database";

export const metadata: Metadata = { title: "Review" };
const PERIODS: ReviewPeriod[] = ["daily", "weekly", "monthly"];

export default async function ReviewPage({ params }: PageProps<"/reviews/[period]/[date]">) {
  const { period: rawPeriod, date } = await params;
  if (!PERIODS.includes(rawPeriod as ReviewPeriod) || !isDay(date)) notFound();
  const period = rawPeriod as ReviewPeriod;
  const { start, end } = periodBounds(period, date);
  if (start !== date) redirect(`/reviews/${period}/${start}`);

  const [{ accounts, active }, profile, lists] = await Promise.all([getAccountContext(), getProfile(), getReferenceLists()]);
  const band = profile.breakeven_band_r;
  const scope = active ? [active] : accounts;
  const currencies = [...new Set(scope.map((a) => a.currency))];
  const currency = currencies.length === 1 ? currencies[0] : null;
  const trades = (await getEnrichedTrades(scope.map((a) => a.id))).filter((t) => t.trade_date >= start && t.trade_date <= end);
  const s = summarize(trades, band);

  const supabase = await createClient();
  let q = supabase.from("reviews").select("*").eq("period", period).eq("period_start", start);
  q = active ? q.eq("account_id", active.id) : q.is("account_id", null);
  const { data: review } = await q.maybeSingle();
  const [rm, rt] = review
    ? await Promise.all([
        supabase.from("review_mistakes").select("mistake_tag_id").eq("review_id", review.id),
        supabase.from("review_trades").select("trade_id,role").eq("review_id", review.id),
      ])
    : [{ data: [] }, { data: [] }];

  const mistakeRows = mistakeImpact(trades, new Map(lists.mistakes.map((m) => [m.id, m.name])), band);
  const suggested = mistakeRows.map((m) => m.id);
  const byR = [...trades].filter((t) => t.r_multiple != null).sort((a, b) => b.r_multiple! - a.r_multiple!);
  const options = trades.map((t) => ({
    id: t.id, label: `${formatDay(t.trade_date, "EEE d MMM")} · ${t.symbol} ${t.direction.toUpperCase()}${t.strategy_name ? ` · ${t.strategy_name}` : ""}`,
    r: t.r_multiple, net: t.net_pnl, currency: t.currency,
  }));
  const value = currency ? s.netPnl : s.totalR;
  const fmt = (x: number) => (currency ? formatMoney(x, currency, { signed: true }) : formatR(x));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${period[0].toUpperCase()}${period.slice(1)} review`}
        description={`${periodLabel(period, start)} · ${active ? active.name : "All accounts"}${review ? " · saved" : " · not written yet"}`}
        actions={
          <div className="flex items-center gap-1">
            <Button asChild variant="outline" size="icon-sm"><Link href={`/reviews/${period}/${shiftPeriod(period, start, -1)}`} aria-label="Previous period"><ChevronLeft /></Link></Button>
            <Button asChild variant="outline" size="icon-sm"><Link href={`/reviews/${period}/${shiftPeriod(period, start, 1)}`} aria-label="Next period"><ChevronRight /></Link></Button>
            <Button asChild variant="ghost" size="sm"><Link href={`/reviews?type=${period}`}>All {period} reviews</Link></Button>
          </div>
        }
      />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-5" aria-label="Period statistics" data-testid="review-stats">
        <StatTile label={currency ? "Net P&L" : "Total R"} value={fmt(value)} tone={toneClass(value)} />
        <StatTile label="Trades" value={s.totalTrades} />
        <StatTile label="Win rate" value={formatPct(s.winRate, { digits: 1 })} />
        <StatTile label="Total R" value={formatR(s.totalR)} tone={toneClass(s.totalR)} />
        <StatTile label="Average R" value={formatR(s.avgR)} tone={toneClass(s.avgR)} />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <ReviewForm
          key={`${period}-${start}-${review?.updated_at ?? "new"}`}
          reviewId={review?.id ?? null}
          mistakes={lists.mistakes}
          trades={options}
          suggestedMistakes={suggested}
          initial={{
            account_id: active?.id ?? null, period, period_start: start, period_end: end,
            summary: review?.summary ?? "", went_well: review?.went_well ?? "", went_wrong: review?.went_wrong ?? "", lessons: review?.lessons ?? "",
            strategy_effectiveness: review?.strategy_effectiveness ?? "", improvement_areas: review?.improvement_areas ?? "", objectives: review?.objectives ?? "",
            mistake_ids: review ? (rm.data ?? []).map((m) => m.mistake_tag_id) : suggested,
            // Best/worst trades are part of the weekly review only.
            best_trade_ids: period !== "weekly" ? [] : review ? (rt.data ?? []).filter((x) => x.role === "best").map((x) => x.trade_id) : byR.filter((t) => t.r_multiple! > 0).slice(0, 2).map((t) => t.id),
            worst_trade_ids: period !== "weekly" ? [] : review ? (rt.data ?? []).filter((x) => x.role === "worst").map((x) => x.trade_id) : byR.filter((t) => t.r_multiple! < 0).slice(-2).map((t) => t.id),
          }}
        />
        <aside className="flex flex-col gap-4">
          <section className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4" aria-label="Trades in period" data-testid="review-trades">
            <h2 className="text-sm font-semibold">Trades ({trades.length})</h2>
            {trades.length === 0 ? <p className="text-xs text-muted-foreground">No trades in this period.</p> : (
              <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto text-sm">
                {trades.map((t) => (
                  <li key={t.id} className="flex justify-between gap-2">
                    <Link href={`/trades/${t.id}`} className="truncate hover:text-primary hover:underline">{formatDay(t.trade_date, "d MMM")} · {t.symbol} {t.direction.toUpperCase()}</Link>
                    <span className={cn("num shrink-0 text-xs", toneClass(t.r_multiple ?? t.net_pnl))}>{t.r_multiple != null ? formatR(t.r_multiple) : "open"}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {mistakeRows.length > 0 && (
            <section className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4" aria-label="Mistakes in period">
              <h2 className="text-sm font-semibold">Mistakes tagged on trades</h2>
              {mistakeRows.map((m) => (
                <p key={m.id} className="flex justify-between text-sm"><span>{m.name}</span><span className="num text-xs text-muted-foreground">{m.count}× · <span className={toneClass(m.summary.totalR)}>{formatR(m.summary.totalR, 1)}</span></span></p>
              ))}
            </section>
          )}
        </aside>
      </div>

      {period !== "daily" && trades.length > 0 && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <BreakdownTable title="By strategy" rows={groupSummaries(trades, (t) => t.strategy_id, (id) => lists.strategies.find((x) => x.id === id)?.name ?? "?", band)} currency={currency} testId="review-by-strategy" />
          <BreakdownTable title="By instrument" rows={groupSummaries(trades, (t) => t.instrument_id, (id) => trades.find((t) => t.instrument_id === id)?.symbol ?? "?", band)} currency={currency} />
        </div>
      )}
    </div>
  );
}
