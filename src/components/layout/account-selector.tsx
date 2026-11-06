"use client";

import { ChevronsUpDown, Layers3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type AccountOption = { id: string; name: string; currency: string };

/**
 * Switches the active trading account for every page.
 * Phase 1: renders with no accounts. Phase 2 passes real accounts and
 * persists the selection in a cookie.
 */
export function AccountSelector({
  accounts = [],
  selectedId = "all",
}: {
  accounts?: AccountOption[];
  selectedId?: string;
}) {
  const selected = accounts.find((a) => a.id === selectedId);
  const label = selected ? selected.name : "All accounts";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 max-w-56 justify-between gap-2 bg-card font-normal">
          <Layers3 className="text-muted-foreground" />
          <span className="truncate">{label}</span>
          {selected && <span className="num text-xs text-muted-foreground">{selected.currency}</span>}
          <ChevronsUpDown className="ml-auto text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Trading account</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={selectedId}>
          <DropdownMenuRadioItem value="all">All accounts</DropdownMenuRadioItem>
          {accounts.map((a) => (
            <DropdownMenuRadioItem key={a.id} value={a.id}>
              <span className="truncate">{a.name}</span>
              <span className="num ml-auto text-xs text-muted-foreground">{a.currency}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        {accounts.length === 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled className="text-xs">
              Account management arrives in Phase 2
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
