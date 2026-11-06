import { describe, expect, it } from "vitest";

import { formatMoney, formatPct, formatR, formatRatio, roundMoney, toneClass } from "./format";

describe("format", () => {
  it("formats money in the account currency", () => {
    expect(formatMoney(1234.5, "USD")).toBe("$1,234.50");
    expect(formatMoney(-50, "EUR")).toBe("−€50.00");
    expect(formatMoney(10, "USD", { signed: true })).toBe("+$10.00");
    expect(formatMoney(null, "USD")).toBe("—");
  });
  it("formats percentages and R", () => {
    expect(formatPct(12.345)).toBe("12.35%");
    expect(formatPct(-3, { signed: true })).toBe("−3.00%");
    expect(formatR(1.5)).toBe("+1.50R");
    expect(formatR(-1)).toBe("−1.00R");
    expect(formatR(0)).toBe("0.00R");
  });
  it("formats ratios including infinity", () => {
    expect(formatRatio(Infinity)).toBe("∞");
    expect(formatRatio(1.234)).toBe("1.23");
  });
  it("rounds money and picks tones", () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    expect(toneClass(5)).toBe("text-profit");
    expect(toneClass(-5)).toBe("text-loss");
    expect(toneClass(0)).toBe("text-muted-foreground");
  });
});
