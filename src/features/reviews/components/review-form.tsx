"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { ToggleChips } from "@/components/ui/toggle-chips";
import { formatMoney, formatR, toneClass } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ReviewPeriod } from "@/types/database";
import { deleteReview, saveReview } from "../actions";
import type { ReviewFormInput } from "../schema";

type TradeOption = { id: string; label: string; r: number | null; net: number | null; currency: string };
type TextKey = "summary" | "went_well" | "went_wrong" | "lessons" | "strategy_effectiveness" | "improvement_areas" | "objectives";

const FIELDS: Record<ReviewPeriod, { key: TextKey; label: string; placeholder: string }[]> = {
  daily: [
    { key: "went_well", label: "What went well?", placeholder: "Patience, execution, sticking to the plan…" },
    { key: "went_wrong", label: "What went wrong?", placeholder: "Where did you deviate, and why?" },
    { key: "lessons", label: "Lessons learned", placeholder: "One thing to carry into tomorrow" },
  ],
  weekly: [
    { key: "summary", label: "Performance summary", placeholder: "How did the week go overall?" },
    { key: "improvement_areas", label: "Areas for improvement", placeholder: "What will you work on next week?" },
  ],
  monthly: [
    { key: "summary", label: "Overall performance", placeholder: "Your read on the month's numbers" },
    { key: "strategy_effectiveness", label: "Strategy effectiveness", placeholder: "Which strategies worked, which didn't, and why" },
    { key: "objectives", label: "Improvement objectives", placeholder: "Concrete, measurable goals for next month" },
  ],
};

function TradePicker({ title, trades, value, onChange, testId }: { title: string; trades: TradeOption[]; value: string[]; onChange: (v: string[]) => void; testId: string }) {
  return (
    <fieldset className="flex flex-col gap-1.5" data-testid={testId}>
      <legend className="mb-1 text-xs text-muted-foreground">{title}</legend>
      {trades.length === 0 && <p className="text-xs text-muted-foreground">No trades in this period.</p>}
      {trades.map((t) => (
        <label key={t.id} className="flex items-center gap-2 text-sm">
          <Checkbox checked={value.includes(t.id)} onCheckedChange={(c) => onChange(c ? [...value, t.id] : value.filter((v) => v !== t.id))} />
          <span className="flex-1 truncate">{t.label}</span>
          <span className={cn("num text-xs", toneClass(t.r ?? t.net))}>{t.r != null ? formatR(t.r) : formatMoney(t.net, t.currency, { signed: true })}</span>
        </label>
      ))}
    </fieldset>
  );
}

export function ReviewForm({ reviewId, initial, mistakes, trades, suggestedMistakes }: {
  reviewId: string | null;
  initial: ReviewFormInput;
  mistakes: { id: string; name: string }[];
  trades: TradeOption[];
  suggestedMistakes: string[];
}) {
  const router = useRouter();
  const [v, setV] = useState<ReviewFormInput>(initial);
  const [pending, start] = useTransition();
  const period = v.period;

  const save = () =>
    start(async () => {
      const r = await saveReview(v);
      if (r.ok) { toast.success("Review saved"); router.refresh(); }
      else toast.error(r.error);
    });

  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }} className="flex flex-col gap-4" noValidate>
      <Card>
        <CardHeader><CardTitle>Your review</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          {FIELDS[period].map((f) => (
            <Field key={f.key} label={f.label} htmlFor={f.key}>
              <Textarea id={f.key} rows={4} placeholder={f.placeholder} value={(v[f.key] as string | null) ?? ""} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
            </Field>
          ))}
          {period !== "weekly" && (
            <Field label={period === "daily" ? "Mistakes" : "Recurring mistakes"} hint={suggestedMistakes.length ? "Tagged on this period's trades are highlighted" : undefined}>
              <ToggleChips label="Review mistakes" options={mistakes} value={v.mistake_ids ?? []} onChange={(m) => setV({ ...v, mistake_ids: m })} highlight={suggestedMistakes} />
            </Field>
          )}
          {period === "weekly" && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <TradePicker testId="best-trades" title="Best trades" trades={trades} value={v.best_trade_ids ?? []} onChange={(x) => setV({ ...v, best_trade_ids: x, worst_trade_ids: (v.worst_trade_ids ?? []).filter((w) => !x.includes(w)) })} />
              <TradePicker testId="worst-trades" title="Worst trades" trades={trades} value={v.worst_trade_ids ?? []} onChange={(x) => setV({ ...v, worst_trade_ids: x, best_trade_ids: (v.best_trade_ids ?? []).filter((b) => !x.includes(b)) })} />
            </div>
          )}
        </CardContent>
      </Card>
      <div className="flex items-center justify-between gap-2">
        {reviewId ? (
          <AlertDialog>
            <AlertDialogTrigger asChild><Button type="button" variant="ghost" size="sm"><Trash2 /> Delete review</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Delete this review?</AlertDialogTitle><AlertDialogDescription>Your notes for this period are removed. Trades are not affected.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => start(async () => { const r = await deleteReview(reviewId); if (r.ok) { toast.success("Review deleted"); router.push(`/reviews?type=${period}`); } else toast.error(r.error); })}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : <span />}
        <Button type="submit" disabled={pending}>{pending && <Loader2 className="animate-spin" />} Save review</Button>
      </div>
    </form>
  );
}
