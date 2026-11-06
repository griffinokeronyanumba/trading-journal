"use client";

import { useState, useTransition } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { TradingSession } from "@/types/database";
import { deleteSession, saveSession } from "../list-actions";

type Draft = { name: string; start_time: string; end_time: string; is_active: boolean };
const hhmm = (t: string) => t.slice(0, 5);

function Row({ session, timezone }: { session?: TradingSession; timezone: string }) {
  const initial: Draft = session
    ? { name: session.name, start_time: hhmm(session.start_time), end_time: hhmm(session.end_time), is_active: session.is_active }
    : { name: "", start_time: "08:00", end_time: "12:00", is_active: true };
  const [d, setD] = useState(initial);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(d) !== JSON.stringify(initial);
  const label = session?.name ?? "new session";

  const save = () =>
    start(async () => {
      const r = await saveSession(session?.id ?? null, d);
      if (r.ok) { toast.success(session ? "Session saved" : "Session added"); if (!session) setD(initial); }
      else toast.error(r.error);
    });
  const remove = () =>
    start(async () => {
      const r = await deleteSession(session!.id);
      if (r.ok) toast.success("Session deleted");
      else toast.error(r.error);
    });

  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 sm:grid-cols-[1fr_7rem_7rem_auto_auto]" data-testid={`session-${label}`}>
      <Input aria-label={`Name of ${label}`} value={d.name} placeholder="Session name" onChange={(e) => setD({ ...d, name: e.target.value })} className="col-span-3 h-8 sm:col-span-1" />
      <Input aria-label={`Start of ${label} (${timezone})`} type="time" value={d.start_time} onChange={(e) => setD({ ...d, start_time: e.target.value })} className="num h-8" />
      <Input aria-label={`End of ${label} (${timezone})`} type="time" value={d.end_time} onChange={(e) => setD({ ...d, end_time: e.target.value })} className="num h-8" />
      <Switch aria-label={`${label} active`} checked={d.is_active} onCheckedChange={(v) => setD({ ...d, is_active: v })} />
      <div className="flex gap-1">
        <Button size="icon-sm" variant={dirty || !session ? "secondary" : "ghost"} disabled={pending || (!dirty && !!session)} onClick={save} aria-label={session ? `Save ${label}` : "Add session"}>
          {session ? <Save /> : <Plus />}
        </Button>
        {session && <Button size="icon-sm" variant="ghost" disabled={pending} onClick={remove} aria-label={`Delete ${label}`}><Trash2 /></Button>}
      </div>
    </div>
  );
}

export function SessionsManager({ sessions, timezone }: { sessions: TradingSession[]; timezone: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="hidden grid-cols-[1fr_7rem_7rem_auto_auto] gap-2 text-[11px] text-muted-foreground sm:grid">
        <span>Name</span><span>Start</span><span>End</span><span>Active</span><span />
      </div>
      {sessions.map((s) => <Row key={`${s.id}:${s.updated_at}`} session={s} timezone={timezone} />)}
      <Row timezone={timezone} />
      <p className="text-xs text-muted-foreground">
        Times are in {timezone.replaceAll("_", " ")}. An end time earlier than the start means the session runs past midnight. When sessions overlap, the one that opened most recently is suggested.
      </p>
    </div>
  );
}
