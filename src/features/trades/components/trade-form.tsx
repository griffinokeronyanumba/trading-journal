"use client";

import { useEffect, useEffectEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Calculator, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleChips } from "@/components/ui/toggle-chips";
import { formatMoney, formatR, formatRatio, toneClass } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  Confluence, Instrument, MistakeTag, SetupType, Strategy, StrategyConfluence, StrategyRule, TradeGrade, TradingAccount, TradingSession,
} from "@/types/database";
import { saveTrade } from "../actions";
import {
  autoPnlAvailability, defaultRiskAmount, netPnl, outcomeFromR, plannedRR, pnlFromPrices, potentialReward, priceR,
  priceWarnings, riskFromPrices, rMultiple, sizeForRisk, suggestSession,
} from "../calc";
import { NEWS_CONDITIONS, OUTCOMES, outcomeLabel } from "../constants";
import { tradeSchema, type TradeFormInput, type TradeFormValues } from "../schema";

const NONE = "__none";
const num = (v: unknown) => {
  if (v === "" || v == null) return null;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};

export type TradeFormProps = {
  tradeId?: string;
  initial: TradeFormInput;
  accounts: Pick<TradingAccount, "id" | "name" | "currency" | "starting_balance" | "risk_per_trade_pct" | "is_archived">[];
  instruments: Instrument[];
  sessions: TradingSession[];
  grades: TradeGrade[];
  strategies: Strategy[];
  setups: SetupType[];
  confluences: Confluence[];
  mistakes: MistakeTag[];
  rules: StrategyRule[];
  strategyConfluences: StrategyConfluence[];
  timezone: string;
  breakevenBand: number;
};

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className="gap-4 py-4">
      <CardHeader className="px-4"><CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</CardTitle></CardHeader>
      <CardContent className={cn("grid grid-cols-2 gap-3 px-4 md:grid-cols-4", className)}>{children}</CardContent>
    </Card>
  );
}

function PreviewRow({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("num text-sm", className)}>{children}</span>
    </div>
  );
}

export function TradeForm(props: TradeFormProps) {
  const { tradeId, initial, accounts, instruments, sessions, grades, strategies, setups, confluences, mistakes, rules, strategyConfluences, timezone, breakevenBand } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [touched, setTouched] = useState({ date: !!tradeId, session: !!tradeId, riskPct: !!tradeId, riskAmount: !!tradeId });
  const touch = (k: keyof typeof touched) => setTouched((t) => (t[k] ? t : { ...t, [k]: true }));

  const form = useForm<TradeFormInput, unknown, TradeFormValues>({ resolver: zodResolver(tradeSchema), defaultValues: initial });
  const { register, control, setValue, formState, handleSubmit, getValues, setError, reset } = form;
  const e = formState.errors;
  const v = useWatch({ control }) as TradeFormInput;

  const account = accounts.find((a) => a.id === v.account_id);
  const instrument = instruments.find((i) => i.id === v.instrument_id);
  const currency = account?.currency ?? "USD";
  const direction = (v.direction ?? "buy") as "buy" | "sell";

  // ---- live calculations (same maths as the database) ----
  const entry = num(v.entry_price), stop = num(v.stop_loss), target = num(v.take_profit), exit = num(v.exit_price), size = num(v.position_size);
  const risk = num(v.risk_amount), gross = num(v.gross_pnl), fees = num(v.fees) ?? 0;
  const net = netPnl(gross, fees);
  const r = rMultiple(net, risk);
  const rr = plannedRR(entry, stop, target);
  const reward = potentialReward(risk, rr);
  const derived = outcomeFromR(r, net, breakevenBand);
  const outcome = (v.outcome_override && v.outcome_override !== NONE ? v.outcome_override : derived) as typeof derived;
  const refR = r == null ? priceR(direction, entry, stop, exit) : null;
  const warnings = priceWarnings(direction, entry, stop, target);
  const auto = autoPnlAvailability(instrument, currency);
  const calcPnl = auto.available ? pnlFromPrices(direction, entry, exit, size, instrument) : null;
  const sizeRisk = auto.available ? riskFromPrices(entry, stop, size, instrument) : null;
  const suggestedSize = auto.available ? sizeForRisk(entry, stop, risk, instrument) : null;

  const strategyRules = rules.filter((x) => x.strategy_id === v.strategy_id);
  const requiredConfluences = strategyConfluences.filter((x) => x.strategy_id === v.strategy_id).map((x) => x.confluence_id);
  const sortedSetups = useMemo(
    () => [...setups].sort((a, b) => Number(b.strategy_id === v.strategy_id) - Number(a.strategy_id === v.strategy_id) || a.name.localeCompare(b.name)),
    [setups, v.strategy_id],
  );
  const visibleAccounts = accounts.filter((a) => !a.is_archived || a.id === v.account_id);
  const visibleInstruments = instruments.filter((i) => i.is_active || i.id === v.instrument_id);

  // keep "calculated" P&L in sync with prices
  useEffect(() => {
    if (v.pnl_source === "calculated") setValue("gross_pnl", calcPnl == null ? "" : String(calcPnl));
  }, [v.pnl_source, calcPnl, setValue]);

  const onAccountChange = (id: string) => {
    setValue("account_id", id, { shouldValidate: formState.isSubmitted });
    const a = accounts.find((x) => x.id === id);
    if (!a) return;
    if (!touched.riskPct) setValue("risk_pct", String(a.risk_per_trade_pct));
    const pct = touched.riskPct ? num(getValues("risk_pct")) : a.risk_per_trade_pct;
    if (!touched.riskAmount) setValue("risk_amount", String(defaultRiskAmount(pct, a.starting_balance) ?? ""));
  };
  const onRiskPct = (val: string) => {
    touch("riskPct");
    setValue("risk_pct", val);
    if (!touched.riskAmount && account) setValue("risk_amount", String(defaultRiskAmount(num(val), account.starting_balance) ?? ""));
  };
  const onEntryTime = (val: string) => {
    setValue("entry_time_local", val);
    if (!val) return;
    if (!touched.date) setValue("trade_date", val.slice(0, 10));
    if (!touched.session) setValue("session_id", suggestSession(val.slice(11, 16), sessions) ?? NONE);
  };

  const submit = (addAnother: boolean) => handleSubmit(() =>
    startTransition(async () => {
      const values = getValues();
      // The checklist records every rule of the chosen strategy: ticked = followed.
      const checks = getValues("rule_checks") ?? {};
      values.rule_checks = Object.fromEntries(strategyRules.map((rule) => [rule.id, !!checks[rule.id]]));
      const res = await saveTrade(tradeId ?? null, values);
      if (!res.ok) {
        Object.entries(res.fieldErrors ?? {}).forEach(([k, m]) => setError(k as keyof TradeFormInput, { message: m }));
        toast.error(res.error);
        return;
      }
      if (addAnother && !tradeId) {
        toast.success("Trade saved — ready for the next one");
        reset({
          ...initial,
          account_id: values.account_id, instrument_id: values.instrument_id, direction: values.direction,
          strategy_id: values.strategy_id, setup_type_id: values.setup_type_id, session_id: values.session_id,
          risk_pct: values.risk_pct, risk_amount: values.risk_amount, trade_date: values.trade_date,
          news_condition: values.news_condition, pnl_source: values.pnl_source, position_size: values.position_size,
        });
        setTouched({ date: false, session: false, riskPct: true, riskAmount: true });
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      toast.success(tradeId ? "Trade updated" : "Trade saved");
      router.push(`/trades/${res.data.id}`);
    }),
    () => toast.error("Please fix the highlighted fields."),
  )();

  // Ctrl/Cmd + Enter saves
  const onShortcut = useEffectEvent((ev: KeyboardEvent) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key === "Enter") {
      ev.preventDefault();
      void submit(false);
    }
  });
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => onShortcut(ev);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const selectField = (
    name: "account_id" | "instrument_id" | "session_id" | "strategy_id" | "setup_type_id" | "grade_id" | "news_condition" | "outcome_override",
    items: { value: string; label: string }[],
    opts: { label: string; allowNone?: string; onChange?: (v: string) => void; placeholder?: string },
  ) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select
          value={(field.value as string) || (opts.allowNone ? NONE : undefined)}
          onValueChange={(val) => (opts.onChange ? opts.onChange(val) : field.onChange(val))}
        >
          <SelectTrigger aria-label={opts.label} aria-invalid={!!e[name]}><SelectValue placeholder={opts.placeholder ?? "Select…"} /></SelectTrigger>
          <SelectContent>
            {opts.allowNone && <SelectItem value={NONE}>{opts.allowNone}</SelectItem>}
            {items.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
    />
  );

  return (
    <form onSubmit={(ev) => { ev.preventDefault(); void submit(false); }} noValidate className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex min-w-0 flex-col gap-4">
        <Section title="Trade">
          <Field label="Account" error={e.account_id?.message} className="col-span-2">
            {selectField("account_id", visibleAccounts.map((a) => ({ value: a.id, label: `${a.name} · ${a.currency}` })), { label: "Account", onChange: onAccountChange, placeholder: "Choose account" })}
          </Field>
          <Field label="Instrument" error={e.instrument_id?.message} className="col-span-2">
            {selectField("instrument_id", visibleInstruments.map((i) => ({ value: i.id, label: i.symbol })), { label: "Instrument", placeholder: "Choose instrument" })}
          </Field>
          <Field label="Direction" className="col-span-2">
            <div role="group" aria-label="Direction" className="grid grid-cols-2 gap-1 rounded-md border border-input p-0.5">
              {(["buy", "sell"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={direction === d}
                  onClick={() => setValue("direction", d)}
                  className={cn(
                    "h-7 rounded-[5px] text-xs font-semibold tracking-wide uppercase transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
                    direction === d ? (d === "buy" ? "bg-profit/20 text-profit" : "bg-loss/20 text-loss") : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Trade date" htmlFor="trade_date" error={e.trade_date?.message}>
            <Input id="trade_date" type="date" className="num" {...register("trade_date", { onChange: () => touch("date") })} />
          </Field>
          <Field label="Session" error={e.session_id?.message} hint={touched.session ? undefined : "Auto from entry time"}>
            {selectField("session_id", sessions.filter((s) => s.is_active || s.id === v.session_id).map((s) => ({ value: s.id, label: s.name })), {
              label: "Session", allowNone: "Not set",
              onChange: (val) => { touch("session"); setValue("session_id", val); },
            })}
          </Field>
        </Section>

        <Section title="Prices & timing">
          <Field label="Entry price" htmlFor="entry_price" error={e.entry_price?.message}>
            <Input id="entry_price" inputMode="decimal" className="num" {...register("entry_price")} />
          </Field>
          <Field label="Stop-loss" htmlFor="stop_loss" error={e.stop_loss?.message}>
            <Input id="stop_loss" inputMode="decimal" className="num" {...register("stop_loss")} />
          </Field>
          <Field label="Take-profit" htmlFor="take_profit" error={e.take_profit?.message}>
            <Input id="take_profit" inputMode="decimal" className="num" {...register("take_profit")} />
          </Field>
          <Field label="Exit price" htmlFor="exit_price" error={e.exit_price?.message} hint="Leave empty if still open">
            <Input id="exit_price" inputMode="decimal" className="num" {...register("exit_price")} />
          </Field>
          <Field label={`Entry time (${timezone.split("/").pop()?.replaceAll("_", " ")})`} htmlFor="entry_time_local" error={e.entry_time_local?.message} className="col-span-2">
            <Input id="entry_time_local" type="datetime-local" className="num" {...register("entry_time_local", { onChange: (ev) => onEntryTime(ev.target.value) })} />
          </Field>
          <Field label="Exit time" htmlFor="exit_time_local" error={e.exit_time_local?.message} className="col-span-2">
            <Input id="exit_time_local" type="datetime-local" className="num" {...register("exit_time_local")} />
          </Field>
          <Field label="Position size (optional)" htmlFor="position_size" error={e.position_size?.message} className="col-span-2"
            hint={suggestedSize != null ? <button type="button" className="text-primary hover:underline" onClick={() => setValue("position_size", String(suggestedSize))}>Use {suggestedSize} to risk {formatMoney(risk, currency)}</button> : "Lots, contracts or units"}>
            <Input id="position_size" inputMode="decimal" className="num" {...register("position_size")} />
          </Field>
          {warnings.length > 0 && (
            <div className="col-span-full flex flex-col gap-1 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning" role="status">
              {warnings.map((w) => <span key={w} className="flex items-center gap-1.5"><AlertTriangle className="size-3.5" />{w}</span>)}
            </div>
          )}
        </Section>

        <Section title="Strategy & execution">
          <Field label="Strategy" className="col-span-2" hint={strategies.length === 0 ? "Create strategies in the Strategy library" : undefined}>
            {selectField("strategy_id", strategies.filter((s) => s.is_active || s.id === v.strategy_id).map((s) => ({ value: s.id, label: s.name })), { label: "Strategy", allowNone: "No strategy" })}
          </Field>
          <Field label="Setup type" className="col-span-2">
            {selectField("setup_type_id", sortedSetups.map((s) => ({ value: s.id, label: s.name })), { label: "Setup type", allowNone: "Not set" })}
          </Field>
          <Field label="Trade grade" hint={grades.find((g) => g.id === v.grade_id)?.description ?? "Quality of execution, not the result"}>
            {selectField("grade_id", grades.map((g) => ({ value: g.id, label: g.label })), { label: "Trade grade", allowNone: "Not graded" })}
          </Field>
          <Field label="News conditions">
            {selectField("news_condition", NEWS_CONDITIONS.map((n) => ({ value: n.value, label: n.label })), { label: "News conditions" })}
          </Field>
          <Field label="Rules followed?" className="col-span-2" hint={strategyRules.length ? "Derived from the checklist below" : undefined}>
            {strategyRules.length > 0 ? (
              <div className="flex h-9 items-center text-sm">
                {strategyRules.every((rule) => v.rule_checks?.[rule.id]) ? (
                  <span className="text-profit">Yes — all {strategyRules.length} rules</span>
                ) : (
                  <span className="text-loss">No — {strategyRules.filter((rule) => v.rule_checks?.[rule.id]).length} of {strategyRules.length} followed</span>
                )}
              </div>
            ) : (
              <div role="group" aria-label="Rules followed" className="grid h-9 grid-cols-3 gap-1 rounded-md border border-input p-0.5">
                {([["yes", "Yes"], ["no", "No"], ["", "Not set"]] as const).map(([val, lbl]) => (
                  <button key={lbl} type="button" aria-pressed={v.followed_rules === val} onClick={() => setValue("followed_rules", val)}
                    className={cn("rounded-[5px] text-xs transition-colors", v.followed_rules === val ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground")}>
                    {lbl}
                  </button>
                ))}
              </div>
            )}
          </Field>
          {strategyRules.length > 0 && (
            <fieldset className="col-span-full flex flex-col gap-2 rounded-md border border-border p-3">
              <legend className="px-1 text-xs text-muted-foreground">Rule checklist</legend>
              {strategyRules.map((rule) => (
                <label key={rule.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={!!v.rule_checks?.[rule.id]}
                    onCheckedChange={(c) => setValue("rule_checks", { ...(getValues("rule_checks") ?? {}), [rule.id]: c === true })}
                  />
                  {rule.rule_text}
                </label>
              ))}
            </fieldset>
          )}
          <Field label="Confluences" className="col-span-full">
            <Controller control={control} name="confluence_ids" render={({ field }) => (
              <ToggleChips label="Confluences" options={confluences} value={field.value ?? []} onChange={field.onChange} highlight={requiredConfluences} emptyText="Add confluences in Settings." />
            )} />
          </Field>
          <Field label="Entry reasoning" htmlFor="entry_reasoning" className="col-span-full">
            <Textarea id="entry_reasoning" rows={3} placeholder="Why did you take this trade?" {...register("entry_reasoning")} />
          </Field>
        </Section>

        <Section title="Risk & result">
          <Field label="Risk %" htmlFor="risk_pct" error={e.risk_pct?.message}>
            <Input id="risk_pct" inputMode="decimal" className="num" {...register("risk_pct", { onChange: (ev) => onRiskPct(ev.target.value) })} />
          </Field>
          <Field label={`Planned risk (${currency})`} htmlFor="risk_amount" error={e.risk_amount?.message}
            hint={sizeRisk != null && sizeRisk !== risk ? <button type="button" className="text-primary hover:underline" onClick={() => { touch("riskAmount"); setValue("risk_amount", String(sizeRisk)); }}>Use {formatMoney(sizeRisk, currency)} from size &amp; stop</button> : "Initial risk used for R"}>
            <Input id="risk_amount" inputMode="decimal" className="num" {...register("risk_amount", { onChange: () => touch("riskAmount") })} />
          </Field>
          <Field label={`Realized P&L (${currency})`} htmlFor="gross_pnl" error={e.gross_pnl?.message} className="col-span-2"
            hint={v.pnl_source === "calculated" ? "Calculated from prices × contract spec" : "Before fees · use − for a loss"}>
            <div className="flex gap-2">
              <Input id="gross_pnl" inputMode="decimal" className="num" readOnly={v.pnl_source === "calculated"} {...register("gross_pnl", { onChange: () => setValue("pnl_source", "manual") })} />
              <Button type="button" variant={v.pnl_source === "calculated" ? "secondary" : "outline"} size="icon"
                aria-label={v.pnl_source === "calculated" ? "Switch to manual P&L" : "Calculate P&L from prices"}
                title={auto.reason ?? (calcPnl == null ? "Enter exit price and position size" : "Calculate from prices")}
                disabled={!auto.available || (calcPnl == null && v.pnl_source !== "calculated")}
                onClick={() => setValue("pnl_source", v.pnl_source === "calculated" ? "manual" : "calculated")}>
                <Calculator />
              </Button>
            </div>
          </Field>
          <Field label="Fees / commission" htmlFor="fees" error={e.fees?.message}>
            <Input id="fees" inputMode="decimal" className="num" placeholder="0" {...register("fees")} />
          </Field>
          <Field label="Outcome" hint={`Auto: ${outcomeLabel(derived)}`}>
            {selectField("outcome_override", OUTCOMES.map((o) => ({ value: o.value, label: o.label })), { label: "Outcome override", allowNone: "Automatic" })}
          </Field>
          <Field label="MFE (R)" htmlFor="mfe_r" error={e.mfe_r?.message} hint="Max move in your favour">
            <Input id="mfe_r" inputMode="decimal" className="num" {...register("mfe_r")} />
          </Field>
          <Field label="MAE (R)" htmlFor="mae_r" error={e.mae_r?.message} hint="Max move against you">
            <Input id="mae_r" inputMode="decimal" className="num" {...register("mae_r")} />
          </Field>
          {!auto.available && instrument && (
            <p className="col-span-full flex items-start gap-1.5 text-xs text-muted-foreground"><Info className="mt-0.5 size-3.5 shrink-0" />{auto.reason}</p>
          )}
        </Section>

        <Section title="Review" className="grid-cols-1 md:grid-cols-1">
          <Field label="Mistakes">
            <Controller control={control} name="mistake_ids" render={({ field }) => (
              <ToggleChips label="Mistakes" options={mistakes} value={field.value ?? []} onChange={field.onChange} emptyText="Add mistake tags in Settings." />
            )} />
          </Field>
          <Field label="Notes" htmlFor="notes">
            <Textarea id="notes" rows={3} {...register("notes")} />
          </Field>
        </Section>
      </div>

      <aside className="lg:sticky lg:top-20 lg:self-start">
        <Card className="gap-2 py-4">
          <CardHeader className="px-4"><CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Live summary</CardTitle></CardHeader>
          <CardContent className="flex flex-col divide-y divide-border/60 px-4" aria-live="polite" data-testid="trade-summary">
            <PreviewRow label="Planned R:R">{rr != null ? `1 : ${formatRatio(rr)}` : "—"}</PreviewRow>
            <PreviewRow label="Potential reward">{formatMoney(reward, currency)}</PreviewRow>
            <PreviewRow label="Gross P&L" className={toneClass(gross)}>{formatMoney(gross, currency, { signed: true })}</PreviewRow>
            <PreviewRow label="Fees">{formatMoney(fees, currency)}</PreviewRow>
            <PreviewRow label="Net P&L" className={cn("font-medium", toneClass(net))}>{formatMoney(net, currency, { signed: true })}</PreviewRow>
            <PreviewRow label="Result (R)" className={cn("font-medium", toneClass(r))}>{formatR(r)}</PreviewRow>
            {refR != null && <PreviewRow label="Price-based R (ref.)" className="text-muted-foreground">{formatR(refR)}</PreviewRow>}
            <PreviewRow label="Outcome" className={outcome === "win" ? "text-profit" : outcome === "loss" ? "text-loss" : "text-muted-foreground"}>{outcomeLabel(outcome)}</PreviewRow>
          </CardContent>
        </Card>
        <div className="mt-4 flex flex-col gap-2">
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />} {tradeId ? "Save changes" : "Save trade"}
          </Button>
          {!tradeId && (
            <Button type="button" variant="secondary" disabled={pending} onClick={() => void submit(true)}>
              Save &amp; add another
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
          <p className="text-center text-[11px] text-muted-foreground">Ctrl/⌘ + Enter to save</p>
        </div>
      </aside>
    </form>
  );
}
