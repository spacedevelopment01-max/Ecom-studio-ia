import { body, handle, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { id as newId, now, run } from "@/lib/db";
import { fromHt, fromTtc } from "@/lib/accounting";
import { ExpenseInput } from "@/lib/accounting-api";

/** Nouvelle dépense saisie (montants recalculés côté serveur à partir du HT ou du TTC). */
export const POST = handle(async (req: Request) => {
  await requireAdmin();
  const b = await body(req, ExpenseInput);
  const a = b.basis === "ht" ? fromHt(b.amount, b.vatRate) : fromTtc(b.amount, b.vatRate);
  const eid = newId();
  run(
    `INSERT INTO expenses (id, date, label, category, supplier, amount_ht, vat_rate, vat, amount_ttc, payment_method, status, paid_at, notes, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    eid, b.date, b.label, b.category, b.supplier, a.ht, b.vatRate, a.vat, a.ttc, b.paymentMethod, b.status, b.status === "paid" ? (b.paidAt ?? b.date) : null, b.notes, now(), now(),
  );
  return ok({ id: eid });
});
