import { z } from "zod";
import { now, one, run } from "@/lib/db";
import { body, handle, ok } from "@/lib/http";
import { HttpError, requireAdmin } from "@/lib/auth";
import { adminAdjust, alignPeriod, getSubscription, planOf, syncAllowance, EUR } from "@/lib/billing";
import { L, userLang } from "@/lib/i18n-server";
import { pick } from "@/lib/i18n";

/** Actions d'administration : activation manuelle, forfait, boutiques, budget IA. Le rôle administrateur ne se transmet pas. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ uid: string }> }) => {
  const admin = await requireAdmin();
  const { uid } = await ctx.params;
  if (!one("SELECT 1 FROM users WHERE id = ?", uid)) throw new HttpError(404, L("Utilisateur introuvable.", "User not found."));
  const b = await body(req, z.object({ subscription: z.enum(["none", "manual", "canceled"]).optional(), stores: z.number().int().min(1).max(50).optional(), plan: z.enum(["creer", "vendre", "dominer"]).optional(), creditEur: z.number().min(-1000).max(0, { error: () => L("Le budget IA ne peut pas être augmenté à la main (règle des 40 % du prix HT). Offrez plutôt un pack.", "The AI budget can't be raised by hand (40% of the net price rule). Offer a pack instead.") }).optional(), note: z.string().max(200).optional() }));
  const hadPlan = !!planOf(getSubscription(uid));
  if (b.subscription) run("UPDATE subscriptions SET status = ?, updated_at = ? WHERE user_id = ?", b.subscription, now(), uid);
  if (b.stores) run("UPDATE subscriptions SET stores = ?, updated_at = ? WHERE user_id = ?", b.stores, now(), uid);
  if (b.plan) run("UPDATE subscriptions SET plan = ?, updated_at = ? WHERE user_id = ?", b.plan, now(), uid);
  // Activation d'un forfait (aucun forfait jusque-là) : la période des quotas démarre maintenant (pas de double quota).
  if (!hadPlan && planOf(getSubscription(uid))) alignPeriod(uid, now());
  if (b.subscription || b.stores || b.plan) syncAllowance(uid);
  if (b.creditEur) adminAdjust(uid, Math.round(b.creditEur * EUR), b.note ?? pick(userLang(uid), `Ajustement par ${admin.email}`, `Adjustment by ${admin.email}`));
  return ok();
});
