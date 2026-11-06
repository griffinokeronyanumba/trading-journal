"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Instrument } from "@/types/database";
import { deleteInstrument, setInstrumentActive } from "../actions";
import { InstrumentFormDialog } from "./instrument-form-dialog";

export function InstrumentRowActions({ instrument, tradeCount }: { instrument: Instrument; tradeCount: number }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const toggle = () =>
    start(async () => {
      const r = await setInstrumentActive(instrument.id, !instrument.is_active);
      if (r.ok) toast.success(instrument.is_active ? "Instrument deactivated" : "Instrument activated");
      else toast.error(r.error);
    });
  const remove = () =>
    start(async () => {
      const r = await deleteInstrument(instrument.id);
      if (r.ok) toast.success("Instrument deleted");
      else toast.error(r.error);
      setConfirm(false);
    });

  return (
    <div className="flex justify-end gap-1">
      <InstrumentFormDialog instrument={instrument} trigger={<Button variant="ghost" size="icon-sm" aria-label={`Edit ${instrument.symbol}`}><Pencil /></Button>} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${instrument.symbol}`} disabled={pending}><MoreHorizontal /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={toggle}><Power />{instrument.is_active ? "Deactivate" : "Activate"}</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirm(true)}><Trash2 className="text-loss" />Delete…</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {instrument.symbol}?</AlertDialogTitle>
            <AlertDialogDescription>
              {tradeCount > 0
                ? `${instrument.symbol} is used by ${tradeCount} trade${tradeCount === 1 ? "" : "s"}, so it can't be deleted. Deactivate it instead.`
                : "This removes the instrument permanently."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={pending} onClick={(ev) => { ev.preventDefault(); remove(); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
