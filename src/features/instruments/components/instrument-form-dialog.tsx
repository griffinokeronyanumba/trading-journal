"use client";

import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Instrument } from "@/types/database";
import { saveInstrument } from "../actions";
import { INSTRUMENT_CATEGORIES } from "../constants";
import { instrumentSchema, type InstrumentFormInput, type InstrumentFormValues } from "../schema";

const s = (v: number | null | undefined) => (v == null ? "" : String(v));

function toForm(i?: Instrument | null): InstrumentFormInput {
  return {
    symbol: i?.symbol ?? "",
    display_name: i?.display_name ?? "",
    category: i?.category ?? "forex",
    quote_currency: i?.quote_currency ?? "USD",
    contract_size: s(i?.contract_size),
    tick_size: s(i?.tick_size),
    tick_value: s(i?.tick_value),
    pip_size: s(i?.pip_size),
    notes: i?.notes ?? "",
    is_active: i?.is_active ?? true,
  };
}

export function InstrumentFormDialog({ instrument, trigger }: { instrument?: Instrument | null; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const form = useForm<InstrumentFormInput, unknown, InstrumentFormValues>({
    resolver: zodResolver(instrumentSchema),
    defaultValues: toForm(instrument),
  });
  const e = form.formState.errors;

  const onSubmit = form.handleSubmit(() =>
    startTransition(async () => {
      const res = await saveInstrument(instrument?.id ?? null, form.getValues());
      if (!res.ok) {
        Object.entries(res.fieldErrors ?? {}).forEach(([k, m]) => form.setError(k as keyof InstrumentFormInput, { message: m }));
        toast.error(res.error);
        return;
      }
      toast.success(instrument ? "Instrument updated" : "Instrument added");
      setOpen(false);
    }),
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) form.reset(toForm(instrument)); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{instrument ? `Edit ${instrument.symbol}` : "New instrument"}</DialogTitle>
          <DialogDescription>Contract specs are optional. Add them only if you want P&amp;L calculated from prices.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
          <Field label="Symbol" htmlFor="symbol" error={e.symbol?.message}>
            <Input id="symbol" className="num uppercase" placeholder="XAUUSD" autoFocus {...form.register("symbol")} />
          </Field>
          <Field label="Display name" htmlFor="display_name" error={e.display_name?.message}>
            <Input id="display_name" placeholder="Gold / US Dollar" {...form.register("display_name")} />
          </Field>
          <Field label="Category" error={e.category?.message}>
            <Controller
              control={form.control}
              name="category"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-label="Category"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INSTRUMENT_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="Quote currency" htmlFor="quote_currency" error={e.quote_currency?.message} hint="Currency P&L is measured in">
            <Input id="quote_currency" className="num uppercase" placeholder="USD" maxLength={3} {...form.register("quote_currency")} />
          </Field>

          <fieldset className="col-span-full grid grid-cols-1 gap-4 rounded-md border border-border p-4 sm:grid-cols-2">
            <legend className="px-1 text-xs font-medium text-muted-foreground">Contract specification (optional)</legend>
            <Field label="Tick size" htmlFor="tick_size" error={e.tick_size?.message} hint="Smallest price step, e.g. 0.01">
              <Input id="tick_size" inputMode="decimal" className="num" {...form.register("tick_size")} />
            </Field>
            <Field label="Tick value" htmlFor="tick_value" error={e.tick_value?.message} hint="Money per tick for 1 unit/lot, in quote currency">
              <Input id="tick_value" inputMode="decimal" className="num" {...form.register("tick_value")} />
            </Field>
            <Field label="Contract size" htmlFor="contract_size" error={e.contract_size?.message} hint="Units per lot (reference)">
              <Input id="contract_size" inputMode="decimal" className="num" {...form.register("contract_size")} />
            </Field>
            <Field label="Pip size" htmlFor="pip_size" error={e.pip_size?.message} hint="Reference only, e.g. 0.0001">
              <Input id="pip_size" inputMode="decimal" className="num" {...form.register("pip_size")} />
            </Field>
            <p className="col-span-full text-xs text-muted-foreground">
              Check these with your broker — they differ between brokers. Example: XAUUSD with 100 oz per lot → tick size 0.01, tick value 1.
            </p>
          </fieldset>

          <Field label="Notes" htmlFor="inst_notes" className="col-span-full">
            <Textarea id="inst_notes" rows={2} {...form.register("notes")} />
          </Field>
          <div className="col-span-full flex items-center gap-2">
            <Controller
              control={form.control}
              name="is_active"
              render={({ field }) => <Switch id="is_active" checked={field.value} onCheckedChange={field.onChange} />}
            />
            <Label htmlFor="is_active" className="text-sm font-normal">Active (available for new trades)</Label>
          </div>
          <DialogFooter className="col-span-full">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending && <Loader2 className="animate-spin" />}{instrument ? "Save changes" : "Add instrument"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
