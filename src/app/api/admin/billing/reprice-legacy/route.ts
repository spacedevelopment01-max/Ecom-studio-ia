import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { repriceLegacySubscriptions } from "@/lib/payments-v2";

/**
 * Anciens abonnés → nouveau prix au prochain renouvellement. `apply: false` (par défaut) montre la liste sans rien
 * changer ; `apply: true` met à jour les abonnements Stripe (sans facturation immédiate) et prévient chaque client.
 */
export const POST = handle(async (req: Request) => {
  await requireAdmin();
  const b = await body(req, z.object({ apply: z.boolean().default(false) }));
  return ok({ applied: b.apply, results: await repriceLegacySubscriptions(!b.apply) });
});
