"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ALL = "__all";
type Opt = { value: string; label: string };

export function TradeFilters({ instruments, strategies }: { instruments: Opt[]; strategies: Opt[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (!value || value === ALL) next.delete(key);
    else next.set(key, value);
    next.delete("page");
    start(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };
  const active = ["instrument", "strategy", "direction", "outcome", "from", "to"].some((k) => params.get(k));

  const select = (key: string, label: string, opts: Opt[]) => (
    <Select value={params.get(key) ?? ALL} onValueChange={(v) => set(key, v)}>
      <SelectTrigger aria-label={label} className="h-8 w-auto min-w-32 bg-card text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{`All ${label.toLowerCase()}`}</SelectItem>
        {opts.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  return (
    <div className="flex flex-wrap items-center gap-2" role="search" aria-label="Filter trades">
      {select("instrument", "Instruments", instruments)}
      {select("strategy", "Strategies", strategies)}
      {select("direction", "Directions", [{ value: "buy", label: "Buy" }, { value: "sell", label: "Sell" }])}
      {select("outcome", "Outcomes", [{ value: "win", label: "Win" }, { value: "loss", label: "Loss" }, { value: "breakeven", label: "Break-even" }, { value: "open", label: "Open" }])}
      <Input type="date" aria-label="From date" className="num h-8 w-auto bg-card text-xs" value={params.get("from") ?? ""} onChange={(e) => set("from", e.target.value)} />
      <span className="text-xs text-muted-foreground">to</span>
      <Input type="date" aria-label="To date" className="num h-8 w-auto bg-card text-xs" value={params.get("to") ?? ""} onChange={(e) => set("to", e.target.value)} />
      {active && (
        <Button variant="ghost" size="sm" onClick={() => start(() => router.replace(pathname, { scroll: false }))}>
          <X /> Clear
        </Button>
      )}
      {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Loading" />}
    </div>
  );
}
