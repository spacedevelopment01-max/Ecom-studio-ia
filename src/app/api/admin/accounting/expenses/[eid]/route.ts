import { body, handle, ok } from "@/lib/http";
import { HttpError, requireAdmin } from "@/lib/auth";
import { now, one, run } from "@/lib/db";
import { fromHt, fromTtc } from "@/lib/accounting";
import { ExpensePatch } from "@/lib/accounting-api";
import { clearReceipt, today, type ExpenseRow } from "@/lib/accounting-store";
import { L } from "@/lib/i18n-server";

type Ctx = { params: Promise<{ eid: string }> };
async function load(ctx: Ctx) {
  const { eid } = await ctx.params;
  const e = one<ExpenseRow>("SELECT * FROM expenses WHERE id = ?", eid);
  if (!e) throw new HttpError(404, L("Dépense introuvable.", "Expense not found."));
  return e;
}

/** Modification partielle, « marquer payée », restauration depuis la corbeille. */
export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  await requireAdmin();
  const e = await load(ctx);
  const b = await body(req, ExpensePatch);
  if (b.restore) {
    run("UPDATE expenses SET deleted_at = NULL, updated_at = ? WHERE id = ?", now(), e.id);
    return ok();
  }
  const rate = b.vatRate ?? e.vat_rate;
  const a = b.amount !== undefined ? (b.basis === "ttc" ? fromTtc(b.amount, rate) : fromHt(b.amount, rate)) : b.vatRate !== undefined ? fromHt(e.amount_ht, rate) : { ht: e.amount_ht, vat: e.vat, ttc: e.amount_ttc };
  const status = b.status ?? e.status;
  const paidAt = status === "paid" ? (b.paidAt ?? e.paid_at ?? (b.status === "paid" && e.status !== "paid" ? today() : (b.date ?? e.date))) : null;
  run(
    `UPDATE expenses SET date = ?, label = ?, category = ?, supplier = ?, amount_ht = ?, vat_rate = ?, vat = ?, amount_ttc = ?, payment_method = ?, status = ?, paid_at = ?, notes = ?, updated_at = ? WHERE id = ?`,
    b.date ?? e.date, b.label ?? e.label, b.category ?? e.category, b.supplier ?? e.supplier, a.ht, rate, a.vat, a.ttc, b.paymentMethod ?? e.payment_method, status, paidAt, b.notes ?? e.notes, now(), e.id,
  );
  return ok();
});

/** Suppression : corbeille (annulable) ; `?purge=1` depuis la corbeille supprime définitivement (justificatif compris). */
export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  await requireAdmin();
  const e = await load(ctx);
  if (new URL(req.url).searchParams.get("purge") === "1") {
    if (e.deleted_at === null) throw new HttpError(400, L("Mettez d'abord la dépense à la corbeille.", "Move the expense to the trash first."));
    clearReceipt(e.id);
    // Une échéance récurrente garde une trace invisible (deleted_at = 0), sinon elle serait recréée à la synchronisation.
    if (e.recurring_id) run("UPDATE expenses SET deleted_at = 0, updated_at = ? WHERE id = ?", now(), e.id);
    else run("DELETE FROM expenses WHERE id = ?", e.id);
    return ok();
  }
  run("UPDATE expenses SET deleted_at = ?, updated_at = ? WHERE id = ?", now(), now(), e.id);
  return ok();
});
