import type { NewsCondition, TradeOutcome } from "@/types/database";

export const NEWS_CONDITIONS: { value: NewsCondition; label: string }[] = [
  { value: "none", label: "No news" },
  { value: "low_impact", label: "Low-impact news" },
  { value: "medium_impact", label: "Medium-impact news" },
  { value: "high_impact", label: "High-impact news" },
  { value: "during_release", label: "During a release" },
];
export const newsLabel = (v: NewsCondition) => NEWS_CONDITIONS.find((n) => n.value === v)?.label ?? v;

export const OUTCOMES: { value: TradeOutcome; label: string }[] = [
  { value: "win", label: "Win" },
  { value: "loss", label: "Loss" },
  { value: "breakeven", label: "Break-even" },
];
export const outcomeLabel = (v: TradeOutcome | null) => (v ? OUTCOMES.find((o) => o.value === v)?.label ?? v : "Open");

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
