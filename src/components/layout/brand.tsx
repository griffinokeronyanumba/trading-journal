import Link from "next/link";
import { CandlestickChart } from "lucide-react";

export function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 rounded-md px-2 focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none">
      <span className="flex size-7 items-center justify-center rounded-md border border-sidebar-border bg-background">
        <CandlestickChart className="size-4 text-primary" />
      </span>
      <span className="text-sm font-semibold tracking-tight">Trading Journal</span>
    </Link>
  );
}
