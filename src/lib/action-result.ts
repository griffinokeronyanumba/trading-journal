export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });
export const fail = (error: string, fieldErrors?: Record<string, string>): ActionResult<never> => ({ ok: false, error, fieldErrors });

/** Turn Zod issues into { field: firstMessage }. */
export function zodFieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const key = i.path.map(String).join(".");
    if (key && !out[key]) out[key] = i.message;
  }
  return out;
}

/** Friendly messages for common Postgres/PostgREST errors. */
export function dbErrorMessage(error: { code?: string; message?: string } | null, what = "item"): string {
  if (!error) return "Something went wrong.";
  switch (error.code) {
    case "23505":
      return `${/^[aeiou]/i.test(what) ? "An" : "A"} ${what} with that name already exists.`;
    case "23503":
      return `This ${what} is still in use and can't be removed. Archive it instead.`;
    case "23514":
      return "One of the values is outside the allowed range.";
    case "42501":
      return "You don't have permission to do that.";
    default:
      return error.message ?? "Something went wrong.";
  }
}
