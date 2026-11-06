import { cn } from "@/lib/utils";

/** A single headline number. `lines` lets money values show one line per currency. */
export function StatTile({ label, value, lines, tone, hint }: {
  label: string;
  value?: React.ReactNode;
  lines?: { value: React.ReactNode; tone?: string }[];
  tone?: string;
  hint?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-lg border border-border bg-card px-4 py-3" title={hint}>
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      {lines ? (
        <div className="flex flex-col">
          {lines.map((l, i) => <span key={i} className={cn("num truncate text-base", l.tone)}>{l.value}</span>)}
        </div>
      ) : (
        <p className={cn("num truncate text-lg", tone)}>{value}</p>
      )}
    </div>
  );
}
