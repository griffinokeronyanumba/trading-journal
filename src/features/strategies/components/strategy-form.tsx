"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleChips } from "@/components/ui/toggle-chips";
import { saveStrategy } from "../actions";
import { strategySchema, type StrategyFormInput, type StrategyFormValues } from "../schema";

export function StrategyForm({ strategyId, initial, confluences, sessions, usedRuleCount = {} }: {
  strategyId?: string;
  initial: StrategyFormInput;
  confluences: { id: string; name: string }[];
  sessions: { id: string; name: string }[];
  /** rule id → number of trades that recorded it (warn before removing) */
  usedRuleCount?: Record<string, number>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const form = useForm<StrategyFormInput, unknown, StrategyFormValues>({ resolver: zodResolver(strategySchema), defaultValues: initial });
  const { register, control, handleSubmit, formState: { errors: e }, setError } = form;
  const rules = useFieldArray({ control, name: "rules", keyName: "_key" });

  const submit = handleSubmit(() =>
    start(async () => {
      const res = await saveStrategy(strategyId ?? null, form.getValues());
      if (!res.ok) {
        Object.entries(res.fieldErrors ?? {}).forEach(([k, m]) => setError(k as keyof StrategyFormInput, { message: m }));
        return void toast.error(res.error);
      }
      toast.success(strategyId ? "Strategy updated" : "Strategy created");
      router.push(`/strategies/${res.data.id}`);
    }),
  );

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-w-0 flex-col gap-4">
        <Card>
          <CardHeader><CardTitle>Strategy</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field label="Name" htmlFor="name" error={e.name?.message}>
              <Input id="name" autoFocus placeholder="e.g. London Sweep" {...register("name")} />
            </Field>
            <Field label="Description" htmlFor="description"><Textarea id="description" rows={3} placeholder="What is the idea behind it?" {...register("description")} /></Field>
            <Field label="Entry conditions" htmlFor="entry_conditions"><Textarea id="entry_conditions" rows={4} placeholder="Exactly what must happen before you enter" {...register("entry_conditions")} /></Field>
            <Field label="Exit / management rules" htmlFor="exit_rules"><Textarea id="exit_rules" rows={3} placeholder="Stops, targets, partials, when to bail" {...register("exit_rules")} /></Field>
            <Field label="Notes" htmlFor="strategy_notes"><Textarea id="strategy_notes" rows={3} {...register("notes")} /></Field>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Rule checklist</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">These appear as a checklist when you log a trade with this strategy. Analytics then shows which rules you break most.</p>
            {rules.fields.map((f, i) => {
              const used = f.id ? usedRuleCount[f.id] ?? 0 : 0;
              return (
                <div key={f._key} className="flex items-center gap-1.5">
                  <span className="num w-5 text-right text-xs text-muted-foreground">{i + 1}.</span>
                  <Input aria-label={`Rule ${i + 1}`} className="h-8" placeholder="e.g. Wait for the sweep of the Asia high/low" {...register(`rules.${i}.rule_text`)} />
                  <Button type="button" variant="ghost" size="icon-sm" disabled={i === 0} onClick={() => rules.move(i, i - 1)} aria-label={`Move rule ${i + 1} up`}><ArrowUp /></Button>
                  <Button type="button" variant="ghost" size="icon-sm" disabled={i === rules.fields.length - 1} onClick={() => rules.move(i, i + 1)} aria-label={`Move rule ${i + 1} down`}><ArrowDown /></Button>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove rule ${i + 1}`}
                    onClick={() => {
                      if (used > 0) toast.warning(`This rule was checked on ${used} trade${used === 1 ? "" : "s"}; saving will remove that history.`);
                      rules.remove(i);
                    }}>
                    <Trash2 />
                  </Button>
                </div>
              );
            })}
            {e.rules?.message && <p className="text-xs text-loss">{e.rules.message}</p>}
            <Button type="button" variant="secondary" size="sm" className="self-start" onClick={() => rules.append({ rule_text: "" })}><Plus /> Add rule</Button>
          </CardContent>
        </Card>
      </div>
      <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader><CardTitle>Required confluences</CardTitle></CardHeader>
          <CardContent>
            <Controller control={control} name="confluence_ids" render={({ field }) => (
              <ToggleChips label="Required confluences" options={confluences} value={field.value} onChange={field.onChange} emptyText="Add confluences in Settings first." />
            )} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Preferred sessions</CardTitle></CardHeader>
          <CardContent>
            <Controller control={control} name="session_ids" render={({ field }) => (
              <ToggleChips label="Preferred sessions" options={sessions} value={field.value} onChange={field.onChange} />
            )} />
          </CardContent>
        </Card>
        <div className="flex items-center gap-2 px-1">
          <Controller control={control} name="is_active" render={({ field }) => <Switch id="is_active" checked={field.value} onCheckedChange={field.onChange} />} />
          <Label htmlFor="is_active" className="text-sm font-normal">Active (offered when logging trades)</Label>
        </div>
        <Button type="submit" disabled={pending}>{pending && <Loader2 className="animate-spin" />}{strategyId ? "Save changes" : "Create strategy"}</Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
      </aside>
    </form>
  );
}
