"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TradeGrade } from "@/types/database";
import { deleteGrade, moveGrade, saveGrade } from "../list-actions";

function Row({ grade, first, last }: { grade?: TradeGrade; first?: boolean; last?: boolean }) {
  const initial = { label: grade?.label ?? "", description: grade?.description ?? "" };
  const [d, setD] = useState(initial);
  const [pending, start] = useTransition();
  const dirty = d.label !== initial.label || d.description !== initial.description;
  const name = grade?.label ?? "new grade";
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) =>
    start(async () => {
      const r = await fn();
      if (r.ok) { toast.success(msg); if (!grade) setD({ label: "", description: "" }); }
      else toast.error(r.error);
    });

  return (
    <div className="grid grid-cols-[5rem_1fr_auto] items-center gap-2">
      <Input aria-label={`Label of ${name}`} value={d.label} placeholder="A+" onChange={(e) => setD({ ...d, label: e.target.value })} className="num h-8" />
      <Input aria-label={`Description of ${name}`} value={d.description} placeholder="What this grade means" onChange={(e) => setD({ ...d, description: e.target.value })} className="h-8" />
      <div className="flex gap-1">
        {grade && (
          <>
            <Button size="icon-sm" variant="ghost" disabled={pending || first} onClick={() => run(() => moveGrade(grade.id, "up"), "Order updated")} aria-label={`Move ${name} up`}><ArrowUp /></Button>
            <Button size="icon-sm" variant="ghost" disabled={pending || last} onClick={() => run(() => moveGrade(grade.id, "down"), "Order updated")} aria-label={`Move ${name} down`}><ArrowDown /></Button>
          </>
        )}
        <Button size="icon-sm" variant={dirty || !grade ? "secondary" : "ghost"} disabled={pending || (!dirty && !!grade)} onClick={() => run(() => saveGrade(grade?.id ?? null, d), grade ? "Grade saved" : "Grade added")} aria-label={grade ? `Save ${name}` : "Add grade"}>
          {grade ? <Save /> : <Plus />}
        </Button>
        {grade && <Button size="icon-sm" variant="ghost" disabled={pending} onClick={() => run(() => deleteGrade(grade.id), "Grade deleted")} aria-label={`Delete ${name}`}><Trash2 /></Button>}
      </div>
    </div>
  );
}

export function GradesManager({ grades }: { grades: TradeGrade[] }) {
  return (
    <div className="flex flex-col gap-2">
      {grades.map((g, i) => <Row key={`${g.id}:${g.updated_at}`} grade={g} first={i === 0} last={i === grades.length - 1} />)}
      <Row />
      <p className="text-xs text-muted-foreground">Ordered best to worst. Grades judge execution against your plan, not whether the trade made money. Deleting a grade clears it from trades that used it.</p>
    </div>
  );
}
