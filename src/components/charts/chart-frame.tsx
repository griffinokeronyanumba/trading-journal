import { cn } from "@/lib/utils";

/** Card wrapper for a chart: title, optional note, the plot, and a data table for accessibility. */
export function ChartFrame({
  title,
  note,
  children,
  table,
  className,
  actions,
}: {
  title: string;
  note?: React.ReactNode;
  children: React.ReactNode;
  table?: { head: string[]; rows: (string | number)[][] };
  className?: string;
  actions?: React.ReactNode;
}) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-4", className)} aria-label={title}>
      <header className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {note && <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>}
        </div>
        {actions}
      </header>
      {children}
      {table && table.rows.length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer select-none hover:text-foreground">Show data</summary>
          <div className="mt-2 max-h-56 overflow-auto">
            <table className="w-full">
              <thead><tr>{table.head.map((h) => <th key={h} className="py-1 pr-3 text-left font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {table.rows.map((r, i) => (
                  <tr key={i} className="border-t border-border/50">{r.map((c, j) => <td key={j} className="num py-1 pr-3 text-foreground">{c}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
}

export function EmptyChart({ children = "No closed trades yet." }: { children?: React.ReactNode }) {
  return <div className="flex h-56 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">{children}</div>;
}
