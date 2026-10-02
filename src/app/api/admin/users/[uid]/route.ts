import { z } from "zod";
import { now, one, run } from "@/lib/db";
import { body, handle, ok } from "@/lib/http";
import { HttpError, requireAdmin } from "@/lib/auth";
import { adminAdjust, getSubscription, syncAllowance, EUR } from "@/lib/billing";

/** Actions d'administration : activation manuelle, boutiques, crédit d'essai, rôle. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ uid: string }> }) => {
  const admin = await requireAdmin();
  const { uid } = await ctx.params;
  if (!one("SELECT 1 FROM users WHERE id = ?", uid)) throw new HttpError(404, "Utilisateur introuvable.");
  const b = await body(req, z.object({ subscription: z.enum(["none", "manual", "trial", "canceled"]).optional(), stores: z.number().int().min(1).max(50).optional(), creditEur: z.number().min(-1000).max(1000).optional(), note: z.string().max(200).optional(), role: z.enum(["client", "admin"]).optional() }));
  getSubscription(uid);
  if (b.subscription) run("UPDATE subscriptions SET status = ?, updated_at = ? WHERE user_id = ?", b.subscription, now(), uid);
  if (b.stores) run("UPDATE subscriptions SET stores = ?, updated_at = ? WHERE user_id = ?", b.stores, now(), uid);
  if (b.subscription || b.stores) syncAllowance(uid);
  if (b.creditEur) adminAdjust(uid, Math.round(b.creditEur * EUR), b.note ?? `Ajustement par ${admin.email}`);
  if (b.role && uid !== admin.id) run("UPDATE users SET role = ? WHERE id = ?", b.role, uid);
  return ok();
});
