"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ALL = "__all";
export type FilterDef = { key: string; label: string; options: { value: string; label: string }[] };

export function AnalyticsFilters({ filters }: { filters: FilterDef[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (!value || value === ALL) next.delete(key);
    else next.set(key, value);
    start(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };
  const active = [...params.keys()].length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2" role="search" aria-label="Analytics filters">
      {filters.map((f) => (
        <Select key={f.key} value={params.get(f.key) ?? ALL} onValueChange={(v) => set(f.key, v)}>
          <SelectTrigger aria-label={f.label} className="h-8 w-auto min-w-28 bg-card text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{`All ${f.label.toLowerCase()}`}</SelectItem>
            {f.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      ))}
      <Input type="month" aria-label="Month" className="num h-8 w-auto bg-card text-xs" value={params.get("month") ?? ""} onChange={(e) => set("month", e.target.value)} />
      {active && <Button variant="ghost" size="sm" onClick={() => start(() => router.replace(pathname, { scroll: false }))}><X /> Clear</Button>}
      {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Loading" />}
    </div>
  );
}
