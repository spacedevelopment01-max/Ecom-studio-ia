import { z } from "zod";
import { HttpError, requireUser } from "@/lib/auth";
import { hasPaidSubscription } from "@/lib/project-billing";
import { body, handle, ok } from "@/lib/http";
import { houseDescribe } from "@/lib/ai/house-describe";
import { contentLang, L } from "@/lib/i18n-server";

export const runtime = "nodejs";

const Schema = z.object({
  business: z.enum(["services", "products"]),
  brief: z.string().max(2000),
  name: z.string().max(200).optional(),
  area: z.string().max(400).optional(),
  address: z.string().max(400).optional(),
  hours: z.string().max(400).optional(),
  phone: z.string().max(60).optional(),
  email: z.string().max(200).optional(),
  lang: z.string().max(8).optional(),
});

/**
 * Création de projet : quelques mots du client → description complète rédigée par l'IA, offerte par la plateforme
 * (jamais débitée du budget IA du client). Réservée aux comptes avec un abonnement payé en vigueur : un compte
 * Découverte (sans abonnement) ne crée pas de projet et ne déclenche aucun appel à l'IA.
 */
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  if (!hasPaidSubscription(user.id)) {
    throw new HttpError(402, L("La rédaction par l'IA est incluse dans les forfaits : écrivez votre description vous-même, ou choisissez un forfait.", "AI writing is included in the plans: write your description yourself, or choose a plan."), "subscription_required");
  }
  const b = await body(req, Schema);
  const r = await houseDescribe(user.id, { ...b, lang: b.lang || contentLang() });
  return ok({ text: r.text, cached: r.cached });
});
