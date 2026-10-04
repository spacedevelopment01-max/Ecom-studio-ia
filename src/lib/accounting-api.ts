/** Validation (zod) partagée par les routes de la comptabilité. Montants entiers en centimes. */
import { z } from "zod";
import { HttpError } from "./auth";
import { L } from "./i18n-server";
import { FREQUENCIES, isYmd, PAYMENT_METHODS, periodRange, PRESETS, VAT_RATES, type Preset, type Range } from "./accounting";
import { isCategory, today } from "./accounting-store";

const day = z.string().refine(isYmd, { error: () => L("Date attendue au format AAAA-MM-JJ.", "Date expected as YYYY-MM-DD.") });
const cents = z.number().int().min(0).max(100_000_000);
const rate = z.number().int().refine((v) => (VAT_RATES as readonly number[]).includes(v), { error: () => L("Taux de TVA non pris en charge.", "Unsupported VAT rate.") });
const category = z.string().min(1).max(40).refine((c) => isCategory(c), { error: () => L("Catégorie inconnue.", "Unknown category.") });

export const ExpenseInput = z.object({
  date: day,
  label: z.string().trim().min(1).max(200),
  category,
  supplier: z.string().trim().max(120).default(""),
  basis: z.enum(["ht", "ttc"]),
  amount: cents,
  vatRate: rate,
  paymentMethod: z.enum(PAYMENT_METHODS),
  status: z.enum(["paid", "to_pay"]),
  paidAt: day.nullable().optional(),
  notes: z.string().max(2000).default(""),
});
export const ExpensePatch = ExpenseInput.partial().extend({ restore: z.literal(true).optional() });

export const RecurringInput = z.object({
  label: z.string().trim().min(1).max(200),
  category,
  supplier: z.string().trim().max(120).default(""),
  amountHt: cents,
  vatRate: rate,
  frequency: z.enum(FREQUENCIES),
  day: z.number().int().min(1).max(28),
  startDate: day,
  endDate: day.nullable().optional(),
  paymentMethod: z.enum(PAYMENT_METHODS),
  autoPaid: z.boolean().default(true),
  active: z.boolean().default(true),
});
export const RecurringPatch = RecurringInput.partial();

/** Période demandée dans l'adresse (?preset=…&from=…&to=…). */
export function rangeFromUrl(url: string): Range {
  const q = new URL(url).searchParams;
  const preset = (q.get("preset") ?? "month") as Preset;
  if (!(PRESETS as readonly string[]).includes(preset)) throw new HttpError(400, L("Période inconnue.", "Unknown period."));
  const r = periodRange(preset, today(), { from: q.get("from") ?? undefined, to: q.get("to") ?? undefined });
  return r;
}
