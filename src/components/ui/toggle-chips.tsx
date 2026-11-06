"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/** Multi-select as toggleable chips (keyboard + screen-reader friendly). */
export function ToggleChips({
  options,
  value,
  onChange,
  highlight = [],
  label,
  emptyText = "None defined yet.",
}: {
  options: { id: string; name: string }[];
  value: string[];
  onChange: (next: string[]) => void;
  highlight?: string[];
  label: string;
  emptyText?: React.ReactNode;
}) {
  if (options.length === 0) return <p className="text-xs text-muted-foreground">{emptyText}</p>;
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value.includes(o.id);
        const hl = highlight.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((v) => v !== o.id) : [...value, o.id])}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-md border px-2.5 text-xs transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
              on ? "border-primary/60 bg-primary/15 text-foreground" : "border-border bg-background/40 text-muted-foreground hover:text-foreground",
              hl && !on && "border-dashed border-primary/50",
            )}
          >
            {on && <Check className="size-3 text-primary" />}
            {o.name}
            {hl && <span className="text-[10px] text-primary/80">req</span>}
          </button>
        );
      })}
    </div>
  );
}
