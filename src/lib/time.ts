/**
 * Timezone helpers. Trade times are entered as wall-clock time in the
 * profile timezone (default Africa/Nairobi) and stored as UTC timestamps.
 */
import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";

/** "2026-03-02T14:30" in `tz` → ISO UTC string. */
export function localInputToIso(value: string | null | undefined, tz: string): string | null {
  if (!value) return null;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  return new Date(new TZDate(y, mo - 1, d, h, mi, 0, tz).getTime()).toISOString();
}

/** ISO UTC string → "2026-03-02T14:30" wall-clock in `tz` (for <input type="datetime-local">). */
export function isoToLocalInput(iso: string | null | undefined, tz: string): string {
  if (!iso) return "";
  return format(new TZDate(iso, tz), "yyyy-MM-dd'T'HH:mm");
}

/** ISO → "HH:mm" in tz. */
export function isoToLocalTime(iso: string | null | undefined, tz: string): string {
  if (!iso) return "";
  return format(new TZDate(iso, tz), "HH:mm");
}

/** Today's date (YYYY-MM-DD) in tz. */
export function todayInTz(tz: string, now = new Date()): string {
  return format(new TZDate(now, tz), "yyyy-MM-dd");
}

/** "2026-03-02" → "Mon 2 Mar 2026" (date-only values: no timezone shift). */
export function formatDay(date: string, pattern = "EEE d MMM yyyy"): string {
  const [y, m, d] = date.split("-").map(Number);
  return format(new Date(y, m - 1, d), pattern);
}
