import type { GroupRow, Summary } from "@/lib/analytics/metrics";
import { formatPct, formatR } from "@/lib/format";

export type Insight = { tone: "good" | "bad" | "info"; text: string };

const MIN = 3; // ignore groups with fewer trades than this

/** Best and worst group among those with enough trades to mean something. */
function best(rows: GroupRow[]) {
  const r = rows.filter((x) => x.key !== "__none__" && x.summary.totalTrades >= MIN);
  if (r.length === 0) return null;
  const sorted = [...r].sort((a, b) => b.summary.totalR - a.summary.totalR);
  return { top: sorted[0], bottom: sorted.length > 1 ? sorted[sorted.length - 1] : null };
}

/** Plain-language findings from the breakdowns. Only states what the numbers show. */
export function buildInsights(input: {
  total: Summary;
  byInstrument: GroupRow[];
  bySession: GroupRow[];
  byStrategy: GroupRow[];
  byDirection: GroupRow[];
  byGrade: GroupRow[];
  mistakes: { name: string; count: number; summary: Summary }[];
  adherence: { followed: Summary; broken: Summary; adherenceRate: number | null };
}): Insight[] {
  const out: Insight[] = [];
  if (input.total.totalTrades < MIN) return [{ tone: "info", text: `Insights appear once there are at least ${MIN} closed trades in this selection.` }];

  const pair = (label: string, rows: GroupRow[]) => {
    const b = best(rows);
    if (!b) return;
    if (b.top.summary.totalR > 0) out.push({ tone: "good", text: `Most profitable ${label}: ${b.top.label} (${formatR(b.top.summary.totalR, 1)} over ${b.top.summary.totalTrades} trades, ${formatPct(b.top.summary.winRate, { digits: 0 })} win rate).` });
    if (b.bottom && b.bottom.summary.totalR < 0) out.push({ tone: "bad", text: `Weakest ${label}: ${b.bottom.label} (${formatR(b.bottom.summary.totalR, 1)} over ${b.bottom.summary.totalTrades} trades).` });
  };
  pair("instrument", input.byInstrument);
  pair("session", input.bySession);
  pair("strategy", input.byStrategy);

  const buy = input.byDirection.find((r) => r.key === "buy")?.summary;
  const sell = input.byDirection.find((r) => r.key === "sell")?.summary;
  if (buy && sell && buy.totalTrades >= MIN && sell.totalTrades >= MIN) {
    const better = buy.totalR >= sell.totalR ? ["Buys", buy, "sells", sell] as const : ["Sells", sell, "buys", buy] as const;
    out.push({ tone: "info", text: `${better[0]} outperform ${better[2]}: ${formatR(better[1].avgR)} vs ${formatR(better[3].avgR)} average per trade.` });
  }

  const graded = input.byGrade.filter((g) => g.key !== "__none__" && g.summary.totalTrades >= MIN);
  if (graded.length >= 2) {
    const first = graded[0], last = graded[graded.length - 1];
    if ((first.summary.avgR ?? 0) > (last.summary.avgR ?? 0))
      out.push({ tone: "good", text: `Execution quality pays: ${first.label} trades average ${formatR(first.summary.avgR)} vs ${formatR(last.summary.avgR)} for ${last.label}.` });
    else out.push({ tone: "info", text: `Your best-graded trades (${first.label}) are not out-earning ${last.label} trades yet — check that grades reflect execution, not outcome.` });
  }

  const m = input.mistakes[0];
  if (m && m.count >= 2) out.push({ tone: "bad", text: `Most frequent mistake: “${m.name}” (${m.count} trades, ${formatR(m.summary.totalR, 1)} in total).` });
  const costly = [...input.mistakes].sort((a, b) => a.summary.totalR - b.summary.totalR)[0];
  if (costly && costly !== m && costly.summary.totalR < 0) out.push({ tone: "bad", text: `Most expensive mistake: “${costly.name}” (${formatR(costly.summary.totalR, 1)}).` });

  const { followed, broken, adherenceRate } = input.adherence;
  if (followed.totalTrades >= MIN && broken.totalTrades >= 1)
    out.push({ tone: (followed.avgR ?? 0) >= (broken.avgR ?? 0) ? "good" : "info", text: `Rule adherence ${formatPct(adherenceRate, { digits: 0 })}. Trades that followed the rules average ${formatR(followed.avgR)} vs ${formatR(broken.avgR)} when rules were broken.` });

  return out.length ? out : [{ tone: "info", text: "No standout patterns yet — keep logging trades." }];
}
