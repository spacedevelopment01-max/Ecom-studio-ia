import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { body, handle, ok } from "@/lib/http";
import { houseDescribe } from "@/lib/ai/house-describe";
import { contentLang } from "@/lib/i18n-server";

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
 * (jamais débitée du budget IA du client, forfait Découverte compris).
 */
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const b = await body(req, Schema);
  const r = await houseDescribe(user.id, { ...b, lang: b.lang || contentLang() });
  return ok({ text: r.text, cached: r.cached });
});
