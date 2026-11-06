"use client";

import { useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { TradingAccount } from "@/types/database";
import { saveAccount } from "../actions";
import { ACCOUNT_TYPES, CURRENCIES } from "../constants";
import { accountSchema, type AccountFormInput, type AccountFormValues } from "../schema";

const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time

function toFormValues(a?: TradingAccount | null, defaultCurrency = "USD"): AccountFormInput {
  return {
    name: a?.name ?? "",
    account_type: a?.account_type ?? "backtest",
    currency: a?.currency ?? defaultCurrency,
    starting_balance: a ? String(a.starting_balance) : "",
    risk_per_trade_pct: a ? String(a.risk_per_trade_pct) : "1",
    daily_loss_limit_pct: a?.daily_loss_limit_pct != null ? String(a.daily_loss_limit_pct) : "",
    max_drawdown_pct: a?.max_drawdown_pct != null ? String(a.max_drawdown_pct) : "",
    opened_on: a?.opened_on ?? today(),
    notes: a?.notes ?? "",
  };
}

export function AccountFormDialog({
  account,
  trigger,
  hasTrades = false,
  defaultCurrency = "USD",
}: {
  account?: TradingAccount | null;
  trigger: React.ReactNode;
  hasTrades?: boolean;
  defaultCurrency?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const form = useForm<AccountFormInput, unknown, AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: toFormValues(account, defaultCurrency),
  });
  const { register, control, handleSubmit, formState, setError, reset } = form;
  const e = formState.errors;
  const currency = useWatch({ control, name: "currency" });
  const currencyOptions = CURRENCIES.includes(String(currency)) ? CURRENCIES : [String(currency), ...CURRENCIES];

  const onSubmit = handleSubmit(() => {
    startTransition(async () => {
      const res = await saveAccount(account?.id ?? null, form.getValues());
      if (!res.ok) {
        Object.entries(res.fieldErrors ?? {}).forEach(([k, msg]) => setError(k as keyof AccountFormInput, { message: msg }));
        toast.error(res.error);
        return;
      }
      toast.success(account ? "Account updated" : "Account created");
      setOpen(false);
      if (!account) reset(toFormValues(null, defaultCurrency));
    });
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) reset(toFormValues(account, defaultCurrency));
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{account ? "Edit account" : "New trading account"}</DialogTitle>
          <DialogDescription>
            Each account keeps its own balance, trades and statistics. Limits are percentages of the starting balance.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
          <Field label="Account name" htmlFor="name" error={e.name?.message} className="sm:col-span-2">
            <Input id="name" placeholder="e.g. $10,000 Backtest" autoFocus aria-invalid={!!e.name} {...register("name")} />
          </Field>

          <Field label="Account type" error={e.account_type?.message}>
            <Controller
              control={control}
              name="account_type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-label="Account type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field
            label="Currency"
            error={e.currency?.message}
            hint={hasTrades ? "Changing currency does not convert existing trades." : undefined}
          >
            <Controller
              control={control}
              name="currency"
              render={({ field }) => (
                <Select value={String(field.value)} onValueChange={field.onChange}>
                  <SelectTrigger aria-label="Currency"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field label="Starting balance" htmlFor="starting_balance" error={e.starting_balance?.message}>
            <Input id="starting_balance" inputMode="decimal" className="num" placeholder="10000" aria-invalid={!!e.starting_balance} {...register("starting_balance")} />
          </Field>

          <Field label="Risk per trade (%)" htmlFor="risk_per_trade_pct" error={e.risk_per_trade_pct?.message} hint="Default risk for new trades">
            <Input id="risk_per_trade_pct" inputMode="decimal" className="num" aria-invalid={!!e.risk_per_trade_pct} {...register("risk_per_trade_pct")} />
          </Field>

          <Field label="Daily loss limit (%)" htmlFor="daily_loss_limit_pct" error={e.daily_loss_limit_pct?.message} hint="Optional · % of starting balance">
            <Input id="daily_loss_limit_pct" inputMode="decimal" className="num" placeholder="e.g. 5" aria-invalid={!!e.daily_loss_limit_pct} {...register("daily_loss_limit_pct")} />
          </Field>

          <Field label="Max drawdown (%)" htmlFor="max_drawdown_pct" error={e.max_drawdown_pct?.message} hint="Optional · static, from starting balance">
            <Input id="max_drawdown_pct" inputMode="decimal" className="num" placeholder="e.g. 10" aria-invalid={!!e.max_drawdown_pct} {...register("max_drawdown_pct")} />
          </Field>

          <Field label="Account creation date" htmlFor="opened_on" error={e.opened_on?.message}>
            <Input id="opened_on" type="date" className="num" aria-invalid={!!e.opened_on} {...register("opened_on")} />
          </Field>

          <Field label="Notes" htmlFor="notes" error={e.notes?.message} className="sm:col-span-2">
            <Textarea id="notes" rows={2} placeholder="Optional" {...register("notes")} />
          </Field>

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {account ? "Save changes" : "Create account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
