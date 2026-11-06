"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteTag, saveTag, type TagTable } from "../list-actions";

type Tag = { id: string; name: string };

function TagRow({ table, tag, noun }: { table: TagTable; tag: Tag; noun: string }) {
  const [value, setValue] = useState(tag.name);
  const [pending, start] = useTransition();
  const commit = () => {
    if (value.trim() === tag.name) return;
    start(async () => {
      const r = await saveTag(table, tag.id, value);
      if (r.ok) toast.success("Renamed");
      else { toast.error(r.error); setValue(tag.name); }
    });
  };
  return (
    <li className="flex items-center gap-2">
      <Input
        aria-label={`${noun} name`}
        value={value}
        disabled={pending}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), e.currentTarget.blur())}
        className="h-8"
      />
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Delete ${tag.name}`}><Trash2 /></Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{tag.name}”?</AlertDialogTitle>
            <AlertDialogDescription>It will be removed from every trade and review that uses it. Trades themselves are not deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                start(async () => {
                  const r = await deleteTag(table, tag.id);
                  if (r.ok) toast.success("Deleted");
                  else toast.error(r.error);
                })
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}

export function TagManager({ table, tags, noun, placeholder }: { table: TagTable; tags: Tag[]; noun: string; placeholder: string }) {
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  const add = () =>
    start(async () => {
      const r = await saveTag(table, null, name);
      if (r.ok) { setName(""); toast.success(`${noun} added`); }
      else toast.error(r.error);
    });
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-1.5">
        {tags.map((t) => <TagRow key={`${t.id}:${t.name}`} table={table} tag={t} noun={noun} />)}
        {tags.length === 0 && <li className="text-sm text-muted-foreground">None yet.</li>}
      </ul>
      <form onSubmit={(e) => { e.preventDefault(); add(); }} className="flex gap-2">
        <Input aria-label={`New ${noun.toLowerCase()}`} placeholder={placeholder} value={name} onChange={(e) => setName(e.target.value)} className="h-8" />
        <Button type="submit" size="sm" variant="secondary" disabled={pending || !name.trim()}><Plus /> Add</Button>
      </form>
    </div>
  );
}
