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
import { deleteStrategy } from "../actions";

export function DeleteStrategyButton({ id, name, tradeCount }: { id: string; name: string; tradeCount: number }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button variant="outline" size="sm"><Trash2 /> Delete</Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            The strategy, its rules and checklist history are deleted.
            {tradeCount > 0 ? ` Its ${tradeCount} trade${tradeCount === 1 ? " is" : "s are"} kept, with strategy set to “not set”.` : ""} To keep its statistics, deactivate it instead.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={(ev) => {
            ev.preventDefault();
            start(async () => {
              const r = await deleteStrategy(id);
              if (!r.ok) return void toast.error(r.error);
              toast.success("Strategy deleted");
              router.push("/strategies");
            });
          }}>Delete strategy</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
