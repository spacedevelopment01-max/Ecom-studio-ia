import { body, handle, ok } from "@/lib/http";
import { HttpError, requireAdmin } from "@/lib/auth";
import { now, one, run } from "@/lib/db";
import { RecurringPatch } from "@/lib/accounting-api";
import { dropFutureUnpaid, syncRecurring, type RecurringRow } from "@/lib/accounting-store";
import { L } from "@/lib/i18n-server";

type Ctx = { params: Promise<{ rid: string }> };
async function load(ctx: Ctx) {
  const { rid } = await ctx.params;
  const c = one<RecurringRow>("SELECT * FROM recurring_charges WHERE id = ?", rid);
  if (!c) throw new HttpError(404, L("Charge introuvable.", "Charge not found."));
  return c;
}

/** Modifier ou suspendre : les échéances passées restent telles quelles ; la prochaine, si elle n'est pas payée, est recalculée. */
export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  await requireAdmin();
  const c = await load(ctx);
  const b = await body(req, RecurringPatch);
  run(
    `UPDATE recurring_charges SET label = ?, category = ?, supplier = ?, amount_ht = ?, vat_rate = ?, frequency = ?, day = ?, start_date = ?, end_date = ?, payment_method = ?, auto_paid = ?, active = ?, updated_at = ? WHERE id = ?`,
    b.label ?? c.label, b.category ?? c.category, b.supplier ?? c.supplier, b.amountHt ?? c.amount_ht, b.vatRate ?? c.vat_rate, b.frequency ?? c.frequency, b.day ?? c.day,
    b.startDate ?? c.start_date, b.endDate === undefined ? c.end_date : b.endDate, b.paymentMethod ?? c.payment_method,
    b.autoPaid === undefined ? c.auto_paid : b.autoPaid ? 1 : 0, b.active === undefined ? c.active : b.active ? 1 : 0, now(), c.id,
  );
  dropFutureUnpaid(c.id);
  syncRecurring();
  return ok();
});

/** Supprime la charge (les échéances déjà passées restent dans le journal). */
export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  await requireAdmin();
  const c = await load(ctx);
  dropFutureUnpaid(c.id);
  run("DELETE FROM recurring_charges WHERE id = ?", c.id);
  return ok();
});
