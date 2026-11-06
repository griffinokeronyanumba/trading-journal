import type { GroupRow } from "@/lib/analytics/metrics";
import { formatMoney, formatPct, formatR, formatRatio, toneClass } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Performance per group, with a centred bar showing total R (gains right, losses left). */
export function BreakdownTable({ title, rows, currency, testId, emptyText = "No data for these filters." }: {
  title: string;
  rows: GroupRow[];
  currency: string | null; // null = mixed currencies → hide money column
  testId?: string;
  emptyText?: string;
}) {
  const max = Math.max(0.0001, ...rows.map((r) => Math.abs(r.summary.totalR)));
  return (
    <section className="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-card p-4" aria-label={title} data-testid={testId}>
      <h2 className="text-sm font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] text-muted-foreground">
                <th className="py-1.5 pr-2 text-left font-medium">{(() => { const t = title.replace(/^By /, ""); return t.charAt(0).toUpperCase() + t.slice(1); })()}</th>
                <th className="px-2 text-right font-medium">Trades</th>
                <th className="px-2 text-right font-medium">Win rate</th>
                <th className="px-2 text-right font-medium">Avg R</th>
                <th className="w-32 px-2 font-medium">Total R</th>
                {currency && <th className="px-2 text-right font-medium">Net P&amp;L</th>}
                <th className="pl-2 text-right font-medium">PF</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const w = (Math.abs(r.summary.totalR) / max) * 50;
                return (
                  <tr key={r.key} className="border-t border-border/60" data-testid="breakdown-row">
                    <td className="max-w-40 truncate py-1.5 pr-2" title={r.label}>{r.label}</td>
                    <td className="num px-2 text-right">{r.summary.totalTrades}</td>
                    <td className="num px-2 text-right">{formatPct(r.summary.winRate, { digits: 0 })}</td>
                    <td className={cn("num px-2 text-right", toneClass(r.summary.avgR))}>{formatR(r.summary.avgR)}</td>
                    <td className="px-2">
                      <div className="flex items-center gap-2">
                        <div className="relative h-2 flex-1 rounded-full bg-muted" aria-hidden>
                          <div className="absolute top-0 left-1/2 h-full w-px bg-border" />
                          <div
                            className={cn("absolute top-0 h-full rounded-full", r.summary.totalR >= 0 ? "bg-chart-pos" : "bg-chart-neg")}
                            style={r.summary.totalR >= 0 ? { left: "50%", width: `${w}%` } : { right: "50%", width: `${w}%` }}
                          />
                        </div>
                        <span className={cn("num w-14 text-right text-xs", toneClass(r.summary.totalR))}>{formatR(r.summary.totalR, 1)}</span>
                      </div>
                    </td>
                    {currency && <td className={cn("num px-2 text-right", toneClass(r.summary.netPnl))}>{formatMoney(r.summary.netPnl, currency, { signed: true })}</td>}
                    <td className="num pl-2 text-right">{formatRatio(r.summary.profitFactor)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
