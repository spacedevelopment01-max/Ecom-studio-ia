import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { uiLang } from "@/lib/i18n-server";
import { saveSettings } from "@/lib/projects";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { STORE_KINDS } from "@/lib/theme/store-kind";
import { themeRecommendation } from "@/lib/theme/theme-recommendation";

/** Contrat de recommandation : catégorie du projet, thèmes éligibles, justification (lecture seule). */
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  return ok(themeRecommendation(p, uiLang()));
});

/**
 * Réponse du client à la question « quel type de boutique ? » (ou correction) : enregistrée dans les réglages du projet.
 * Ne change jamais le thème installé : la galerie recalcule simplement ses éligibilités et ses sections compatibles.
 */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const b = await body(req, z.object({ storeKind: z.enum(STORE_KINDS as [string, ...string[]]).nullable() }));
  saveSettings(p.id, { ...p.settings, storeKind: (b.storeKind as (typeof STORE_KINDS)[number] | null) ?? undefined });
  const next = { ...p, settings: { ...p.settings, storeKind: (b.storeKind as (typeof STORE_KINDS)[number] | null) ?? undefined } };
  return ok(themeRecommendation(next, uiLang()));
});
