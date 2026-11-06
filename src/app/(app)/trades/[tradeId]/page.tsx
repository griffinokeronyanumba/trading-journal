import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Copy, Pencil } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProfile } from "@/features/accounts/queries";
import { ScreenshotManager } from "@/features/screenshots/components/screenshot-manager";
import { getScreenshots } from "@/features/screenshots/queries";
import { getReferenceLists } from "@/features/settings/queries";
import { DeleteTradeButton } from "@/features/trades/components/delete-trade-button";
import { DirectionBadge, OutcomeBadge } from "@/features/trades/components/trade-badges";
import { newsLabel } from "@/features/trades/constants";
import { requireUser } from "@/lib/auth";
import { formatMoney, formatNumber, formatR, formatRatio, toneClass } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { formatDay, isoToLocalInput } from "@/lib/time";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Trade" };

function Item({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className={cn("num text-sm", className)}>{children ?? "—"}</dd>
    </div>
  );
}

export default async function TradeDetailPage({ params }: PageProps<"/trades/[tradeId]">) {
  const { tradeId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(tradeId)) notFound();
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: t }, lists, profile, checks, shots] = await Promise.all([
    supabase.from("trades_enriched").select("*").eq("id", tradeId).maybeSingle(),
    getReferenceLists(),
    getProfile(),
    supabase.from("trade_rule_checks").select("rule_id,followed").eq("trade_id", tradeId),
    getScreenshots(tradeId),
  ]);
  if (!t) notFound();
  const c = t.currency;
  const when = (iso: string | null) => (iso ? isoToLocalInput(iso, profile.timezone).replace("T", " ") : null);
  const name = (list: { id: string; name: string }[], ids: string[]) => ids.map((id) => list.find((x) => x.id === id)?.name).filter(Boolean) as string[];
  const title = `${t.symbol} ${t.direction.toUpperCase()} · ${formatDay(t.trade_date, "d MMM yyyy")}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={title}
        description={`${t.account_name}${t.strategy_name ? ` · ${t.strategy_name}` : ""}`}
        actions={
          <>
            <Button asChild variant="outline" size="sm"><Link href={`/trades/new?duplicate=${t.id}`}><Copy /> Duplicate</Link></Button>
            <Button asChild size="sm"><Link href={`/trades/${t.id}/edit`}><Pencil /> Edit</Link></Button>
            <DeleteTradeButton tradeId={t.id} label={title} redirectTo="/trades" />
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <DirectionBadge direction={t.direction} />
        <OutcomeBadge outcome={t.outcome} />
        {t.grade_label && <Badge variant="outline">Grade {t.grade_label}</Badge>}
        {t.session_name && <Badge variant="outline">{t.session_name}</Badge>}
        {t.followed_rules != null && <Badge variant={t.followed_rules ? "profit" : "warning"}>{t.followed_rules ? "Rules followed" : "Rules broken"}</Badge>}
      </div>

      <section aria-label="Result" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Net P&L", formatMoney(t.net_pnl, c, { signed: true }), toneClass(t.net_pnl)],
          ["Result", formatR(t.r_multiple), toneClass(t.r_multiple)],
          ["Planned R:R", t.planned_rr != null ? `1 : ${formatRatio(t.planned_rr)}` : "—", ""],
          ["Planned risk", formatMoney(t.risk_amount, c), ""],
        ].map(([label, value, tone]) => (
          <div key={label} className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn("num mt-1 text-lg", tone)}>{value}</p>
          </div>
        ))}
      </section>

      <ScreenshotManager tradeId={t.id} userId={user.id} shots={shots} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Execution</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Item label="Entry">{formatNumber(t.entry_price, 10)}</Item>
              <Item label="Stop-loss">{t.stop_loss != null ? formatNumber(t.stop_loss, 10) : null}</Item>
              <Item label="Take-profit">{t.take_profit != null ? formatNumber(t.take_profit, 10) : null}</Item>
              <Item label="Exit">{t.exit_price != null ? formatNumber(t.exit_price, 10) : null}</Item>
              <Item label="Position size">{t.position_size != null ? formatNumber(t.position_size, 8) : null}</Item>
              <Item label="Risk %">{t.risk_pct != null ? `${t.risk_pct}%` : null}</Item>
              <Item label="Entry time">{when(t.entry_time)}</Item>
              <Item label="Exit time">{when(t.exit_time)}</Item>
              <Item label="News">{newsLabel(t.news_condition)}</Item>
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Financials</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Item label="Gross P&L" className={toneClass(t.gross_pnl)}>{formatMoney(t.gross_pnl, c, { signed: true })}</Item>
              <Item label="Fees">{formatMoney(t.fees, c)}</Item>
              <Item label="Net P&L" className={toneClass(t.net_pnl)}>{formatMoney(t.net_pnl, c, { signed: true })}</Item>
              <Item label="Potential reward">{formatMoney(t.potential_reward, c)}</Item>
              <Item label="P&L source">{t.pnl_source === "calculated" ? "Calculated" : "Manual"}</Item>
              <Item label="MFE / MAE">{t.mfe_r != null || t.mae_r != null ? `${formatR(t.mfe_r)} / ${t.mae_r != null ? `−${Number(t.mae_r).toFixed(2)}R` : "—"}` : null}</Item>
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Strategy</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Item label="Strategy">{t.strategy_name}</Item>
              <Item label="Setup">{t.setup_name}</Item>
              <Item label="Grade">{t.grade_label}</Item>
            </dl>
            <div>
              <p className="mb-1.5 text-[11px] text-muted-foreground">Confluences</p>
              <div className="flex flex-wrap gap-1.5">{name(lists.confluences, t.confluence_ids).map((n) => <Badge key={n} variant="secondary">{n}</Badge>)}{t.confluence_ids.length === 0 && <span className="text-sm text-muted-foreground">—</span>}</div>
            </div>
            {(checks.data?.length ?? 0) > 0 && (
              <div>
                <p className="mb-1.5 text-[11px] text-muted-foreground">Rule checklist</p>
                <ul className="flex flex-col gap-1 text-sm">
                  {checks.data!.map((rc) => (
                    <li key={rc.rule_id} className={rc.followed ? "text-foreground" : "text-loss"}>
                      {rc.followed ? "✓" : "✗"} {lists.rules.find((r) => r.id === rc.rule_id)?.rule_text ?? "Rule"}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {t.entry_reasoning && <div><p className="mb-1 text-[11px] text-muted-foreground">Entry reasoning</p><p className="text-sm whitespace-pre-wrap">{t.entry_reasoning}</p></div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Review</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <p className="mb-1.5 text-[11px] text-muted-foreground">Mistakes</p>
              <div className="flex flex-wrap gap-1.5">{name(lists.mistakes, t.mistake_ids).map((n) => <Badge key={n} variant="warning">{n}</Badge>)}{t.mistake_ids.length === 0 && <span className="text-sm text-muted-foreground">None recorded</span>}</div>
            </div>
            {t.notes && <div><p className="mb-1 text-[11px] text-muted-foreground">Notes</p><p className="text-sm whitespace-pre-wrap">{t.notes}</p></div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
