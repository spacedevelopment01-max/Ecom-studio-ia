import { body, handle, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { id as newId, now, run } from "@/lib/db";
import { RecurringInput } from "@/lib/accounting-api";
import { syncRecurring } from "@/lib/accounting-store";

/** Nouvelle charge récurrente : ses échéances sont créées aussitôt (jusqu'à aujourd'hui + la prochaine). */
export const POST = handle(async (req: Request) => {
  await requireAdmin();
  const b = await body(req, RecurringInput);
  const rid = newId();
  run(
    `INSERT INTO recurring_charges (id, label, category, supplier, amount_ht, vat_rate, frequency, day, start_date, end_date, payment_method, auto_paid, active, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    rid, b.label, b.category, b.supplier, b.amountHt, b.vatRate, b.frequency, b.day, b.startDate, b.endDate ?? null, b.paymentMethod, b.autoPaid ? 1 : 0, b.active ? 1 : 0, now(), now(),
  );
  const created = syncRecurring();
  return ok({ id: rid, created });
});
