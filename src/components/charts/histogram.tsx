"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { TooltipBox } from "./tooltip";

export type Bucket = { label: string; from: number; to: number; count: number };

/** Distribution of trade results in R. Losing buckets left of 0, winning right. */
export function RHistogram({ data }: { data: Bucket[] }) {
  return (
    <div className="h-56 w-full" data-testid="r-histogram">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap={2}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis dataKey="from" tickFormatter={(v: number) => `${v}R`} tick={{ fill: "var(--chart-axis)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "var(--chart-grid)" }} interval={1} />
          <YAxis allowDecimals={false} tick={{ fill: "var(--chart-axis)", fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
          <Tooltip
            cursor={{ fill: "var(--accent)", opacity: 0.35 }}
            content={({ active, payload }) => {
              const d = payload?.[0]?.payload as Bucket | undefined;
              if (!active || !d) return null;
              return <TooltipBox title={d.label} rows={[["Trades", String(d.count)]]} />;
            }}
          />
          <Bar dataKey="count" radius={[3, 3, 0, 0]} isAnimationActive={false}>
            {data.map((d) => <Cell key={d.label} fill={d.from >= 0 ? "var(--chart-pos)" : "var(--chart-neg)"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
