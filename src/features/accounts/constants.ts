import type { AccountType } from "@/types/database";

export const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "backtest", label: "Backtesting" },
  { value: "evaluation", label: "Evaluation / challenge" },
  { value: "funded", label: "Funded" },
  { value: "simulated", label: "Simulated / demo" },
  { value: "live", label: "Live" },
  { value: "other", label: "Other" },
];

export const accountTypeLabel = (t: AccountType) => ACCOUNT_TYPES.find((x) => x.value === t)?.label ?? t;

export const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CHF", "AUD", "CAD", "NZD", "KES", "ZAR", "USDT"].filter(
  (c) => c.length === 3,
);
