"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteTrade } from "../actions";

export function DeleteTradeButton({ tradeId, label, redirectTo, compact = false }: { tradeId: string; label: string; redirectTo?: string; compact?: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {compact ? (
          <Button variant="ghost" size="icon-sm" aria-label={`Delete ${label}`}><Trash2 /></Button>
        ) : (
          <Button variant="outline" size="sm"><Trash2 /> Delete</Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this trade?</AlertDialogTitle>
          <AlertDialogDescription>{label} will be permanently deleted, including its screenshots. Balances and statistics update immediately.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(ev) => {
              ev.preventDefault();
              start(async () => {
                const r = await deleteTrade(tradeId);
                if (!r.ok) return void toast.error(r.error);
                toast.success("Trade deleted");
                if (redirectTo) router.push(redirectTo);
              });
            }}
          >
            Delete trade
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
