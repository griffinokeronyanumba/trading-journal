import { z } from "zod";

/** Form inputs arrive as strings. These helpers parse them consistently. */
const blankToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

type NumOpts = { min?: number; max?: number; positive?: boolean };

function numberSchema(label: string, opts: NumOpts) {
  let n = z.number({
    error: (iss) => (iss.input === undefined ? `${label} is required.` : `${label} must be a number.`),
  });
  if (opts.positive) n = n.positive(`${label} must be greater than 0.`);
  if (opts.min != null) n = n.min(opts.min, `${label} must be at least ${opts.min}.`);
  if (opts.max != null) n = n.max(opts.max, `${label} must be at most ${opts.max}.`);
  return n;
}

const toNumber = (v: unknown) => (typeof v === "number" ? v : Number(String(v).replace(/,/g, "").trim()));

export const requiredNumber = (label: string, opts: NumOpts = {}) =>
  z.preprocess((v) => (blankToUndefined(v) === undefined || v === null ? undefined : toNumber(v)), numberSchema(label, opts));

export const optionalNumber = (label: string, opts: NumOpts = {}) =>
  z.preprocess((v) => (blankToUndefined(v) === undefined || v === null ? null : toNumber(v)), numberSchema(label, opts).nullable());

export const optionalText = (max = 2000) =>
  z.preprocess((v) => (blankToUndefined(v) === undefined || v == null ? null : String(v).trim()), z.string().max(max).nullable());

export const isoDate = (label: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `${label} must be a valid date.`);
