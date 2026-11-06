"use client";

import { useState, useTransition } from "react";
import { Archive, ArchiveRestore, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TradingAccount } from "@/types/database";
import { deleteAccount, setAccountArchived } from "../actions";
import { AccountFormDialog } from "./account-form-dialog";

export function AccountMenu({ account, tradeCount }: { account: TradingAccount; tradeCount: number }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const archive = () =>
    startTransition(async () => {
      const res = await setAccountArchived(account.id, !account.is_archived);
      if (res.ok) toast.success(account.is_archived ? "Account restored" : "Account archived");
      else toast.error(res.error);
    });

  const remove = () =>
    startTransition(async () => {
      const res = await deleteAccount(account.id);
      if (res.ok) toast.success("Account deleted");
      else toast.error(res.error);
      setConfirmOpen(false);
    });

  return (
    <>
      <div className="flex items-center gap-1">
        <AccountFormDialog
          account={account}
          hasTrades={tradeCount > 0}
          trigger={
            <Button variant="ghost" size="icon-sm" aria-label={`Edit ${account.name}`}>
              <Pencil />
            </Button>
          }
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${account.name}`} disabled={pending}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={archive}>
              {account.is_archived ? <ArchiveRestore /> : <Archive />}
              {account.is_archived ? "Restore" : "Archive"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
              <Trash2 className="text-loss" /> Delete…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{account.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the account
              {tradeCount > 0 ? ` and its ${tradeCount} trade${tradeCount === 1 ? "" : "s"} (with their screenshots)` : ""}. This
              cannot be undone. Archive it instead if you only want to hide it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(ev) => { ev.preventDefault(); remove(); }} disabled={pending}>
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
