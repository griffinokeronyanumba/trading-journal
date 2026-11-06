import { Badge } from "@/components/ui/badge";
import type { AccountStatus } from "@/lib/analytics/metrics";
import { formatMoney, formatPct, toneClass } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TradingAccount } from "@/types/database";
import { accountTypeLabel } from "../constants";
import { AccountMenu } from "./account-menu";

function Stat({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={cn("num text-sm", className)}>{children}</span>
    </div>
  );
}

export function AccountCard({
  account,
  status,
  tradeCount,
  recordedCount,
  winRate,
}: {
  account: TradingAccount;
  status: AccountStatus;
  /** Closed trades (with a result). */
  tradeCount: number;
  /** All trades including ones without a result yet. */
  recordedCount: number;
  winRate: number | null;
}) {
  const c = account.currency;
  return (
    <article
      className={cn("flex flex-col gap-4 rounded-lg border border-border bg-card p-5", account.is_archived && "opacity-60")}
      aria-label={account.name}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h2 className="truncate text-sm font-semibold">{account.name}</h2>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline">{accountTypeLabel(account.account_type)}</Badge>
            <Badge variant="secondary" className="num">{c}</Badge>
            {account.is_archived && <Badge variant="warning">Archived</Badge>}
            {status.drawdownBreached && <Badge variant="loss">Max drawdown breached</Badge>}
          </div>
        </div>
        <AccountMenu account={account} tradeCount={recordedCount} />
      </header>

      <div className="flex items-end justify-between gap-4 border-y border-border/70 py-3">
        <div>
          <p className="text-[11px] text-muted-foreground">Current balance</p>
          <p className="num text-xl font-medium">{formatMoney(status.currentBalance, c)}</p>
        </div>
        <div className="text-right">
          <p className={cn("num text-sm", toneClass(status.netPnl))}>{formatMoney(status.netPnl, c, { signed: true })}</p>
          <p className={cn("num text-xs", toneClass(status.returnPct))}>{formatPct(status.returnPct, { signed: true })}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Starting">{formatMoney(account.starting_balance, c)}</Stat>
        <Stat label="Trades">{tradeCount}</Stat>
        <Stat label="Win rate">{formatPct(winRate, { digits: 1 })}</Stat>
        <Stat label="Risk / trade">{formatPct(account.risk_per_trade_pct, { digits: 2 })}</Stat>
        <Stat label="Daily limit">
          {status.dailyLossLimit != null ? `${formatPct(account.daily_loss_limit_pct)} · ${formatMoney(status.dailyLossLimit, c)}` : "—"}
        </Stat>
        <Stat label="DD floor" className={status.drawdownBreached ? "text-loss" : undefined}>
          {status.drawdownFloor != null ? formatMoney(status.drawdownFloor, c) : "—"}
        </Stat>
      </div>

      {(status.dailyLimitBreaches.length > 0 || status.drawdownRoom != null) && (
        <footer className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {status.drawdownRoom != null && (
            <span>
              Room to DD floor:{" "}
              <span className={cn("num", status.drawdownRoom <= 0 ? "text-loss" : "text-foreground")}>{formatMoney(status.drawdownRoom, c)}</span>
            </span>
          )}
          {status.dailyLimitBreaches.length > 0 && (
            <span className="text-warning">
              Daily limit breached on {status.dailyLimitBreaches.length} day{status.dailyLimitBreaches.length === 1 ? "" : "s"}
            </span>
          )}
        </footer>
      )}
    </article>
  );
}
