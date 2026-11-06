import { describe, expect, it } from "vitest";

import { parseCsv, parseCsvObjects, toCsv } from "./csv";

describe("csv", () => {
  it("writes and reads back quotes, commas and newlines", () => {
    const text = toCsv(["a", "b", "c"], [["x, y", 'say "hi"', "line1\nline2"], [1.5, null, true]]);
    expect(parseCsv(text)).toEqual([["a", "b", "c"], ["x, y", 'say "hi"', "line1\nline2"], ["1.5", "", "true"]]);
  });
  it("neutralises spreadsheet formulas in text but keeps negative numbers", () => {
    const text = toCsv(["note", "pnl"], [["=HYPERLINK(\"x\")", -100], ["+cmd", -0.5], ["@SUM(A1)", 3]]);
    const rows = parseCsv(text);
    expect(rows[1]).toEqual(["'=HYPERLINK(\"x\")", "-100"]);
    expect(rows[2][0]).toBe("'+cmd");
    expect(rows[3][0]).toBe("'@SUM(A1)");
  });
  it("handles CRLF, BOM, blank lines and normalises headers", () => {
    const { headers, rows } = parseCsvObjects("﻿Trade Date,Symbol,Entry-Price\r\n2026-01-05,XAUUSD,2000\r\n\r\n2026-01-06, NAS100 ,18000\r\n");
    expect(headers).toEqual(["trade_date", "symbol", "entry_price"]);
    expect(rows).toEqual([
      { trade_date: "2026-01-05", symbol: "XAUUSD", entry_price: "2000" },
      { trade_date: "2026-01-06", symbol: "NAS100", entry_price: "18000" },
    ]);
  });
  it("handles a missing trailing newline and short rows", () => {
    expect(parseCsvObjects("a,b\n1").rows).toEqual([{ a: "1", b: "" }]);
  });
});
