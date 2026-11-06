import { Badge } from "@/components/ui/badge";
import type { TradeDirection, TradeOutcome } from "@/types/database";
import { outcomeLabel } from "../constants";

export function DirectionBadge({ direction }: { direction: TradeDirection }) {
  return <Badge variant={direction === "buy" ? "profit" : "loss"} className="uppercase">{direction}</Badge>;
}

export function OutcomeBadge({ outcome }: { outcome: TradeOutcome | null }) {
  const variant = outcome === "win" ? "profit" : outcome === "loss" ? "loss" : outcome === "breakeven" ? "secondary" : "outline";
  return <Badge variant={variant}>{outcomeLabel(outcome)}</Badge>;
}
