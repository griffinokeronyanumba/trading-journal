"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatMoney, formatR } from "@/lib/format";
import { TooltipBox } from "./tooltip";

export type SignedDatum = { label: string; value: number; detail?: [string, string][] };

/**
 * Bars that go up for gains and down for losses (sign is encoded by position
 * AND colour, so it never relies on colour alone).
 */
export function SignedBars({ data, unit, currency = "USD", height = 224, testId }: {
  data: SignedDatum[];
  unit: "money" | "r";
  currency?: string;
  height?: number;
  testId?: string;
}) {
  const format = (v: number) => (unit === "money" ? formatMoney(v, currency, { signed: true }) : formatR(v));
  const axisFormat = (v: number) => (unit === "money" ? new Intl.NumberFormat("en-US", { notation: "compact" }).format(v) : `${v}R`);
  return (
    <div className="w-full" style={{ height }} data-testid={testId}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="20%">
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "var(--chart-axis)", fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={8} />
          <YAxis tickFormatter={axisFormat} tick={{ fill: "var(--chart-axis)", fontSize: 11 }} tickLine={false} axisLine={false} width={52} />
          <ReferenceLine y={0} stroke="var(--chart-axis)" />
          <Tooltip
            cursor={{ fill: "var(--accent)", opacity: 0.35 }}
            content={({ active, payload }) => {
              const d = payload?.[0]?.payload as SignedDatum | undefined;
              if (!active || !d) return null;
              return <TooltipBox title={d.label} rows={[["Result", format(d.value), d.value >= 0 ? "text-profit" : "text-loss"], ...(d.detail ?? [])]} />;
            }}
          />
          <Bar dataKey="value" radius={[3, 3, 3, 3]} maxBarSize={36} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.label} fill={d.value >= 0 ? "var(--chart-pos)" : "var(--chart-neg)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
