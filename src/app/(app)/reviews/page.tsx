import type { Metadata } from "next";
import Link from "next/link";
import { NotebookPen } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { getAccountContext, getProfile } from "@/features/accounts/queries";
import { getEnrichedTrades } from "@/features/analytics/queries";
import { summarize } from "@/lib/analytics/metrics";
import { formatR, toneClass } from "@/lib/format";
import { periodBounds, periodLabel } from "@/lib/periods";
import { createClient } from "@/lib/supabase/server";
import { todayInTz } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { ReviewPeriod } from "@/types/database";

export const metadata: Metadata = { title: "Reviews" };
const TABS: { value: ReviewPeriod; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export default async function ReviewsPage({ searchParams }: PageProps<"/reviews">) {
  const sp = await searchParams;
  const type = (TABS.find((t) => t.value === sp.type)?.value ?? "daily") as ReviewPeriod;
  const [{ accounts, active }, profile] = await Promise.all([getAccountContext(), getProfile()]);
  const today = todayInTz(profile.timezone);
  const current = periodBounds(type, today).start;

  const supabase = await createClient();
  let q = supabase.from("reviews").select("*").eq("period", type).order("period_start", { ascending: false }).limit(100);
  q = active ? q.eq("account_id", active.id) : q.is("account_id", null);
  const { data: reviews, error } = await q;
  if (error) throw new Error(error.message);
  const trades = await getEnrichedTrades((active ? [active] : accounts).map((a) => a.id));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reviews"
        description={`Reflections for ${active ? active.name : "all accounts"}. Reviews belong to the account selected in the top bar.`}
        actions={<Button asChild size="sm"><Link href={`/reviews/${type}/${current}`}><NotebookPen /> {type === "daily" ? "Today's review" : type === "weekly" ? "This week's review" : "This month's review"}</Link></Button>}
      />
      <nav className="flex gap-1 rounded-md border border-border bg-card p-1 self-start" aria-label="Review type">
        {TABS.map((t) => (
          <Link key={t.value} href={`/reviews?type=${t.value}`} aria-current={type === t.value ? "page" : undefined}
            className={cn("rounded px-3 py-1.5 text-sm transition-colors", type === t.value ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground")}>
            {t.label}
          </Link>
        ))}
      </nav>
      {(reviews ?? []).length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card/40 px-6 py-14 text-center">
          <NotebookPen className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No {type} reviews yet.</p>
          <Button asChild size="sm"><Link href={`/reviews/${type}/${current}`}>Write one now</Link></Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {reviews!.map((r) => {
            const s = summarize(trades.filter((t) => t.trade_date >= r.period_start && t.trade_date <= r.period_end), profile.breakeven_band_r);
            const snippet = r.went_well ?? r.summary ?? r.lessons ?? r.objectives ?? r.improvement_areas ?? "";
            return (
              <li key={r.id}>
                <Link href={`/reviews/${r.period}/${r.period_start}`} data-testid="review-item"
                  className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary/50">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{periodLabel(r.period, r.period_start)}</p>
                    <p className="truncate text-xs text-muted-foreground">{snippet || "No notes"}</p>
                  </div>
                  <span className="num text-xs text-muted-foreground">{s.totalTrades} trades</span>
                  <span className={cn("num w-16 text-right text-sm", toneClass(s.totalR))}>{formatR(s.totalR, 1)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
