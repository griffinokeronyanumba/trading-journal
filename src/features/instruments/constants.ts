import type { InstrumentCategory } from "@/types/database";

export const INSTRUMENT_CATEGORIES: { value: InstrumentCategory; label: string }[] = [
  { value: "forex", label: "Forex" },
  { value: "indices", label: "Indices" },
  { value: "commodities", label: "Commodities" },
  { value: "crypto", label: "Cryptocurrency" },
  { value: "stocks", label: "Stocks" },
  { value: "custom", label: "Custom" },
];

export const categoryLabel = (c: InstrumentCategory) => INSTRUMENT_CATEGORIES.find((x) => x.value === c)?.label ?? c;
