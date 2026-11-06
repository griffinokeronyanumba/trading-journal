import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";

/** Placeholder body for pages built in later phases. */
export function ComingSoon({
  icon: Icon,
  phase,
  title,
  items,
}: {
  icon: LucideIcon;
  phase: number;
  title: string;
  items: string[];
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/40 px-6 py-16 text-center">
      <div className="mb-4 flex size-10 items-center justify-center rounded-lg border border-border bg-card">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <Badge variant="outline" className="mb-3">
        Phase {phase}
      </Badge>
      <h2 className="text-sm font-medium">{title}</h2>
      <ul className="mt-3 flex max-w-md flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {items.map((item) => (
          <li key={item}>· {item}</li>
        ))}
      </ul>
    </div>
  );
}
