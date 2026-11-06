import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Copy, ListOrdered, Pencil, Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAccountContext } from "@/features/accounts/queries";
import { listInstruments } from "@/features/instruments/queries";
import { getReferenceLists } from "@/features/settings/queries";
import { DeleteTradeButton } from "@/features/trades/components/delete-trade-button";
import { DirectionBadge, OutcomeBadge } from "@/features/trades/components/trade-badges";
import { TradeFilters } from "@/features/trades/components/trade-filters";
import { listTrades, type TradeListParams } from "@/features/trades/queries";
import { formatMoney, formatR, toneClass } from "@/lib/format";
import { formatDay } from "@/lib/time";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Trades" };

const one = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : undefined);
const date = (v: string | undefined) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
const uuid = (v: string | undefined) => (v && /^[0-9a-f-]{36}$/i.test(v) ? v : undefined);

export default async function TradesPage({ searchParams }: PageProps<"/trades">) {
  const sp = await searchParams;
  const { active, accounts } = await getAccountContext();
  const params: TradeListParams = {
    accountId: active?.id,
    instrumentId: uuid(one(sp.instrument)),
    strategyId: uuid(one(sp.strategy)),
    direction: one(sp.direction) === "buy" || one(sp.direction) === "sell" ? (one(sp.direction) as "buy" | "sell") : undefined,
    outcome: ["win", "loss", "breakeven", "open"].includes(one(sp.outcome) ?? "") ? (one(sp.outcome) as TradeListParams["outcome"]) : undefined,
    from: date(one(sp.from)),
    to: date(one(sp.to)),
    sort: one(sp.sort),
    dir: one(sp.dir) === "asc" ? "asc" : "desc",
    page: Number(one(sp.page) ?? 1) || 1,
  };
  const [{ rows, hasNext }, instruments, lists] = await Promise.all([listTrades(params), listInstruments(), getReferenceLists()]);
  const page = params.page ?? 1;
  const showAccount = !active && accounts.length > 1;

  const href = (patch: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    Object.entries(sp).forEach(([k, v]) => typeof v === "string" && v && q.set(k, v));
    Object.entries(patch).forEach(([k, v]) => (v ? q.set(k, v) : q.delete(k)));
    return `/trades${q.size ? `?${q}` : ""}`;
  };
  const sortHead = (key: string, label: string, className?: string) => {
    const current = (params.sort ?? "trade_date") === key;
    const nextDir = current && params.dir === "desc" ? "asc" : "desc";
    return (
      <TableHead className={className} aria-sort={current ? (params.dir === "asc" ? "ascending" : "descending") : undefined}>
        <Link href={href({ sort: key, dir: nextDir, page: undefined })} className={cn("inline-flex items-center gap-1 hover:text-foreground", current && "text-foreground")}>
          {label}
          {current && (params.dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
        </Link>
      </TableHead>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Trades"
        description={active ? `Trades in ${active.name}` : "Trades across all accounts"}
        actions={<Button asChild size="sm"><Link href="/trades/new"><Plus /> New trade</Link></Button>}
      />
      <TradeFilters
        instruments={instruments.map((i) => ({ value: i.id, label: i.symbol }))}
        strategies={lists.strategies.map((s) => ({ value: s.id, label: s.name }))}
      />

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card/40 px-6 py-14 text-center">
          <ListOrdered className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{page > 1 ? "No more trades." : "No trades match. Record one, or clear the filters."}</p>
          <Button asChild size="sm"><Link href="/trades/new"><Plus /> New trade</Link></Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {sortHead("trade_date", "Date")}
              {sortHead("symbol", "Instrument")}
              <TableHead>Dir</TableHead>
              {showAccount && <TableHead>Account</TableHead>}
              <TableHead>Session</TableHead>
              <TableHead>Strategy</TableHead>
              {sortHead("grade_rank", "Grade")}
              {sortHead("risk_amount", "Risk", "text-right")}
              {sortHead("net_pnl", "Net P&L", "text-right")}
              {sortHead("r_multiple", "R", "text-right")}
              <TableHead>Outcome</TableHead>
              <TableHead className="w-28"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((t) => (
              <TableRow key={t.id} data-testid="trade-row">
                <TableCell className="num text-xs">{formatDay(t.trade_date, "dd MMM yy")}</TableCell>
                <TableCell><Link href={`/trades/${t.id}`} className="num font-medium hover:text-primary hover:underline">{t.symbol}</Link></TableCell>
                <TableCell><DirectionBadge direction={t.direction} /></TableCell>
                {showAccount && <TableCell className="max-w-36 truncate text-xs text-muted-foreground">{t.account_name}</TableCell>}
                <TableCell className="text-xs">{t.session_name ?? "—"}</TableCell>
                <TableCell className="max-w-40 truncate text-xs">{t.strategy_name ?? "—"}</TableCell>
                <TableCell className="num text-xs">{t.grade_label ?? "—"}</TableCell>
                <TableCell className="num text-right text-xs">{formatMoney(t.risk_amount, t.currency)}</TableCell>
                <TableCell className={cn("num text-right", toneClass(t.net_pnl))}>{formatMoney(t.net_pnl, t.currency, { signed: true })}</TableCell>
                <TableCell className={cn("num text-right", toneClass(t.r_multiple))}>{formatR(t.r_multiple)}</TableCell>
                <TableCell><OutcomeBadge outcome={t.outcome} /></TableCell>
                <TableCell>
                  <div className="flex justify-end gap-0.5">
                    <Button asChild variant="ghost" size="icon-sm"><Link href={`/trades/${t.id}/edit`} aria-label={`Edit ${t.symbol} ${t.trade_date}`}><Pencil /></Link></Button>
                    <Button asChild variant="ghost" size="icon-sm"><Link href={`/trades/new?duplicate=${t.id}`} aria-label={`Duplicate ${t.symbol} ${t.trade_date}`}><Copy /></Link></Button>
                    <DeleteTradeButton compact tradeId={t.id} label={`${t.symbol} ${t.direction.toUpperCase()} on ${t.trade_date}`} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {(page > 1 || hasNext) && (
        <nav className="flex items-center justify-end gap-2" aria-label="Pagination">
          <span className="text-xs text-muted-foreground">Page {page}</span>
          <Button asChild={page > 1} variant="outline" size="sm" disabled={page <= 1}>
            {page > 1 ? <Link href={href({ page: String(page - 1) })}><ChevronLeft /> Previous</Link> : <span><ChevronLeft /> Previous</span>}
          </Button>
          <Button asChild={hasNext} variant="outline" size="sm" disabled={!hasNext}>
            {hasNext ? <Link href={href({ page: String(page + 1) })}>Next <ChevronRight /></Link> : <span>Next <ChevronRight /></span>}
          </Button>
        </nav>
      )}
    </div>
  );
}
