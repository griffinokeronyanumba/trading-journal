"use client";

/** Shared tooltip box for Recharts (text in text tokens, never series colours). */
export function TooltipBox({ title, rows }: { title: string; rows: [string, string, string?][] }) {
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-lg shadow-black/40">
      <p className="mb-1 font-medium text-foreground">{title}</p>
      {rows.map(([label, value, tone]) => (
        <p key={label} className="flex justify-between gap-4 text-muted-foreground">
          <span>{label}</span>
          <span className={`num ${tone ?? "text-foreground"}`}>{value}</span>
        </p>
      ))}
    </div>
  );
}
