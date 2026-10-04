import { z } from "zod";
import { HttpError, json, readJson, route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { createPlusCheckout } from "@/lib/billing";

const Body = z.object({ confirmPrice: z.literal(true) });

/** L'utilisateur doit avoir confirmé le prix affiché (4,99 € par mois) avant tout paiement. */
export const POST = route(async (req) => {
  const { user } = await requireSession();
  const body = await readJson(req, Body).catch(() => null);
  if (!body) throw new HttpError(400, "prix", "Confirmez le prix et le contenu de l'offre avant de continuer.");
  return json({ url: await createPlusCheckout(user) });
});
