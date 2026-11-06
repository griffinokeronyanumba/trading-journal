import { describe, expect, it } from "vitest";

import { formatDay, isoToLocalInput, isoToLocalTime, localInputToIso, todayInTz } from "./time";

describe("time", () => {
  it("converts Nairobi wall-clock to UTC and back", () => {
    expect(localInputToIso("2026-03-02T14:30", "Africa/Nairobi")).toBe("2026-03-02T11:30:00.000Z");
    expect(isoToLocalInput("2026-03-02T11:30:00.000Z", "Africa/Nairobi")).toBe("2026-03-02T14:30");
    expect(isoToLocalTime("2026-03-02T11:30:00+00:00", "Africa/Nairobi")).toBe("14:30");
  });
  it("handles DST zones (London summer time)", () => {
    expect(localInputToIso("2026-07-01T09:00", "Europe/London")).toBe("2026-07-01T08:00:00.000Z");
    expect(localInputToIso("2026-01-01T09:00", "Europe/London")).toBe("2026-01-01T09:00:00.000Z");
  });
  it("returns null/empty for blanks", () => {
    expect(localInputToIso("", "Africa/Nairobi")).toBeNull();
    expect(isoToLocalInput(null, "Africa/Nairobi")).toBe("");
  });
  it("today in a timezone", () => {
    expect(todayInTz("Africa/Nairobi", new Date("2026-03-02T22:30:00Z"))).toBe("2026-03-03");
    expect(todayInTz("UTC", new Date("2026-03-02T22:30:00Z"))).toBe("2026-03-02");
  });
  it("formats date-only values without shifting", () => {
    expect(formatDay("2026-03-02")).toBe("Mon 2 Mar 2026");
  });
});
