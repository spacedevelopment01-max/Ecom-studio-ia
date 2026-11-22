import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { ownedProject, requireUser } from "@/lib/auth";
import { L } from "@/lib/i18n-server";
import { relierAppShopify } from "@/lib/integrations/shopify-app";

/** Relie la boutique Shopify du client par SON application (Client ID et Client secret) ; dit les droits qui manquent. */
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const b = await body(req, z.object({ shop: z.string().min(3).max(120), clientId: z.string().min(4).max(200), clientSecret: z.string().min(4).max(400), projectId: z.string().max(80).optional() }));
  if (b.projectId) ownedProject(user, b.projectId);
  const r = await relierAppShopify(user.id, b.projectId ?? null, b);
  return ok({
    connectionId: r.connectionId, manque: r.manque,
    message: r.manque.length
      ? L(`Ta boutique est reliée, mais il manque ${r.manque.length > 1 ? "des droits" : "un droit"} : ${r.manque.map((m) => `« ${m.droit} » (pour ${m.pourquoi})`).join(", ")}. Coche-${r.manque.length > 1 ? "les" : "le"} dans Access, puis Release, et relie de nouveau.`, "Store linked, but some permissions are missing.")
      : L("Ta boutique est reliée : je peux installer ton thème, tes produits, tes pages et tes menus.", "Your store is linked."),
  });
});
