"use client";

import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatMoney, formatR } from "@/lib/format";
import { formatDay } from "@/lib/time";
import { TooltipBox } from "./tooltip";

export type EquityDatum = { index: number; date: string; value: number; change: number };

/** Balance (money) or cumulative R over trades. One series, one axis. */
export function EquityChart({ data, unit, currency = "USD", baseline }: { data: EquityDatum[]; unit: "money" | "r"; currency?: string; baseline: number }) {
  const fmt = (v: number) => (unit === "money" ? formatMoney(v, currency) : formatR(v));
  const fmtAxis = (v: number) =>
    unit === "money" ? new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v) : `${v}R`;
  return (
    <div className="h-64 w-full" data-testid="equity-chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="0" vertical={false} />
          <XAxis dataKey="index" tick={{ fill: "var(--chart-axis)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "var(--chart-grid)" }} minTickGap={24} />
          <YAxis tickFormatter={fmtAxis} tick={{ fill: "var(--chart-axis)", fontSize: 11 }} tickLine={false} axisLine={false} width={52} domain={["auto", "auto"]} />
          <ReferenceLine y={baseline} stroke="var(--chart-axis)" strokeDasharray="4 4" strokeOpacity={0.6} />
          <Tooltip
            cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }}
            content={({ active, payload }) => {
              const d = payload?.[0]?.payload as EquityDatum | undefined;
              if (!active || !d) return null;
              return (
                <TooltipBox
                  title={d.index === 0 ? "Start" : `Trade ${d.index} · ${d.date ? formatDay(d.date, "d MMM yyyy") : ""}`}
                  rows={[
                    [unit === "money" ? "Balance" : "Cumulative", fmt(d.value)],
                    ...(d.index ? [["This trade", unit === "money" ? formatMoney(d.change, currency, { signed: true }) : formatR(d.change), d.change >= 0 ? "text-profit" : "text-loss"] as [string, string, string]] : []),
                  ]}
                />
              );
            }}
          />
          <Area type="linear" dataKey="value" stroke="var(--chart-1)" strokeWidth={2} fill="url(#equityFill)" dot={false} activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
