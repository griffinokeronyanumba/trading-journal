"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { ChevronsUpDown, Layers3, Loader2, Settings2 } from "lucide-react";

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
import { setActiveAccount } from "@/features/accounts/actions";

export type AccountOption = { id: string; name: string; currency: string };

/** Switches the active trading account for every page (stored in a cookie). */
export function AccountSelector({ accounts, selectedId }: { accounts: AccountOption[]; selectedId: string }) {
  const [pending, startTransition] = useTransition();
  const [optimisticId, setOptimisticId] = useOptimistic(selectedId);
  const selected = accounts.find((a) => a.id === optimisticId);
  const label = selected ? selected.name : "All accounts";

  const choose = (id: string) =>
    startTransition(async () => {
      setOptimisticId(id);
      await setActiveAccount(id);
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 max-w-60 justify-between gap-2 bg-card font-normal" aria-label="Select trading account">
          {pending ? <Loader2 className="animate-spin text-muted-foreground" /> : <Layers3 className="text-muted-foreground" />}
          <span className="truncate">{label}</span>
          {selected && <span className="num text-xs text-muted-foreground">{selected.currency}</span>}
          <ChevronsUpDown className="ml-auto text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Trading account</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={optimisticId} onValueChange={choose}>
          <DropdownMenuRadioItem value="all">All accounts</DropdownMenuRadioItem>
          {accounts.map((a) => (
            <DropdownMenuRadioItem key={a.id} value={a.id}>
              <span className="truncate">{a.name}</span>
              <span className="num ml-auto text-xs text-muted-foreground">{a.currency}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/accounts">
            <Settings2 /> {accounts.length === 0 ? "Create an account" : "Manage accounts"}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
