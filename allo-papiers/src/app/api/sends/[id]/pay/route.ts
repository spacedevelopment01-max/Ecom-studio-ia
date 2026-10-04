import { json, route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { startSendPayment } from "@/lib/sends";
import type { IdCtx } from "@/lib/params";

/** Bouton « Envoyer » : ouvre le paiement. L'envoi n'est déclenché qu'après confirmation serveur (webhook). */
export const POST = route<IdCtx>(async (_req, ctx) => {
  const { user } = await requireSession();
  const { id } = await ctx.params;
  return json({ url: await startSendPayment(user, id) });
});
