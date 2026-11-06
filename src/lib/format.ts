/** Display formatting. All money is shown in the account's own currency. */

const moneyFormatters = new Map<string, Intl.NumberFormat>();

function moneyFormatter(currency: string) {
  let f = moneyFormatters.get(currency);
  if (!f) {
    try {
      f = new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } catch {
      f = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    moneyFormatters.set(currency, f);
  }
  return f;
}

export function formatMoney(value: number | null | undefined, currency: string, opts: { signed?: boolean } = {}) {
  if (value == null || Number.isNaN(value)) return "—";
  const text = moneyFormatter(currency).format(Math.abs(value));
  if (value < 0) return `−${text}`;
  if (opts.signed && value > 0) return `+${text}`;
  return text;
}

export function formatNumber(value: number | null | undefined, digits = 2) {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: digits }).format(value);
}

/** 12.345 → "12.35%". Input is already a percentage (not a fraction). */
export function formatPct(value: number | null | undefined, opts: { digits?: number; signed?: boolean } = {}) {
  if (value == null || !Number.isFinite(value)) return "—";
  const d = opts.digits ?? 2;
  const text = `${Math.abs(value).toFixed(d)}%`;
  if (value < 0) return `−${text}`;
  if (opts.signed && value > 0) return `+${text}`;
  return text;
}

export function formatR(value: number | null | undefined, digits = 2) {
  if (value == null || !Number.isFinite(value)) return "—";
  const text = `${Math.abs(value).toFixed(digits)}R`;
  if (value < 0) return `−${text}`;
  if (value > 0) return `+${text}`;
  return text;
}

export function formatRatio(value: number | null | undefined, digits = 2) {
  if (value == null || Number.isNaN(value)) return "—";
  if (value === Infinity) return "∞";
  return value.toFixed(digits);
}

/** Tailwind text colour for a signed value. */
export function toneClass(value: number | null | undefined) {
  if (value == null || value === 0 || Number.isNaN(value)) return "text-muted-foreground";
  return value > 0 ? "text-profit" : "text-loss";
}

/** Round to cents without floating-point drift (0.1 + 0.2 problems). */
export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
