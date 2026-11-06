import { describe, expect, it } from "vitest";

import { safeNextPath, signInSchema } from "./schema";

describe("safeNextPath", () => {
  it("keeps internal paths", () => {
    expect(safeNextPath("/trades?account=1")).toBe("/trades?account=1");
  });
  it.each([undefined, null, "", "https://evil.com", "//evil.com", "/login", "/login?next=/x", "trades"])(
    "falls back to /dashboard for %s",
    (value) => {
      expect(safeNextPath(value)).toBe("/dashboard");
    },
  );
});

describe("signInSchema", () => {
  it("rejects a bad email", () => {
    expect(signInSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
  });
  it("rejects an empty password", () => {
    expect(signInSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });
  it("accepts valid credentials", () => {
    expect(signInSchema.safeParse({ email: "a@b.co", password: "secret" }).success).toBe(true);
  });
});
