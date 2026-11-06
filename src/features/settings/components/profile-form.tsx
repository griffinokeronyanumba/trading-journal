"use client";

import { useMemo, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CURRENCIES } from "@/features/accounts/constants";
import type { Profile } from "@/types/database";
import { saveProfile } from "../actions";
import { profileSchema, type ProfileFormInput, type ProfileFormValues } from "../schema";

export function ProfileForm({ profile, email }: { profile: Profile; email: string }) {
  const [pending, startTransition] = useTransition();
  const timezones = useMemo(() => {
    const list = Intl.supportedValuesOf("timeZone");
    return list.includes(profile.timezone) ? list : [profile.timezone, ...list];
  }, [profile.timezone]);
  const currencies = CURRENCIES.includes(profile.default_currency) ? CURRENCIES : [profile.default_currency, ...CURRENCIES];

  const form = useForm<ProfileFormInput, unknown, ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: profile.display_name ?? "",
      timezone: profile.timezone,
      default_currency: profile.default_currency,
      breakeven_band_r: String(profile.breakeven_band_r),
    },
  });
  const e = form.formState.errors;

  const onSubmit = form.handleSubmit(() =>
    startTransition(async () => {
      const res = await saveProfile(form.getValues());
      if (res.ok) toast.success("Settings saved");
      else {
        Object.entries(res.fieldErrors ?? {}).forEach(([k, m]) => form.setError(k as keyof ProfileFormInput, { message: m }));
        toast.error(res.error);
      }
    }),
  );

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
      <Field label="Email (sign-in)" htmlFor="account_email">
        <Input id="account_email" value={email} disabled readOnly />
      </Field>
      <Field label="Display name" htmlFor="display_name" error={e.display_name?.message}>
        <Input id="display_name" placeholder="Optional" {...form.register("display_name")} />
      </Field>
      <Field label="Timezone" error={e.timezone?.message} hint="Used for trade dates, sessions and the calendar">
        <Controller
          control={form.control}
          name="timezone"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger aria-label="Timezone"><SelectValue /></SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz} value={tz}>{tz.replaceAll("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>
      <Field label="Default currency" error={e.default_currency?.message} hint="Pre-selected for new accounts">
        <Controller
          control={form.control}
          name="default_currency"
          render={({ field }) => (
            <Select value={String(field.value)} onValueChange={field.onChange}>
              <SelectTrigger aria-label="Default currency"><SelectValue /></SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>
      <Field
        label="Break-even band (R)"
        htmlFor="breakeven_band_r"
        error={e.breakeven_band_r?.message}
        hint="Trades within ±this many R count as break-even"
      >
        <Input id="breakeven_band_r" inputMode="decimal" className="num" {...form.register("breakeven_band_r")} />
      </Field>
      <div className="flex items-end sm:justify-end">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />} Save settings
        </Button>
      </div>
    </form>
  );
}
