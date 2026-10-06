import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { runForUser } from "@/lib/ai/access";
import { contentLang } from "@/lib/i18n-server";
import { draftAds, localAdStrategy, localAds } from "@/lib/engine/ads";

/**
 * Propose les annonces d'une campagne et leur plan de test (audiences, structure, budget honnête, accroches) dans la langue demandée (en-tête x-content-lang, sinon langue du projet).
 * Avec l'IA si elle est disponible pour le client (mode IA et crédits), sinon modèles locaux.
 * Rien n'est enregistré : la fenêtre de campagne reprend les propositions, la personne les relit puis enregistre.
 */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const b = await body(req, z.object({ count: z.number().int().min(1).max(6).optional(), objective: z.string().max(80).optional(), audience: z.string().max(600).optional(), networks: z.array(z.string().max(20)).max(6).optional() }));
  const lang = contentLang();
  try {
    const r = await runForUser(user.id, () => draftAds(p, { userId: user.id, count: b.count, objective: b.objective, audience: b.audience, networks: b.networks }));
    return ok({ ...r, lang });
  } catch (e) {
    // L'IA a échoué (fournisseur, refus, crédits) : propositions locales plutôt qu'une erreur.
    console.error("[campaigns/draft]", e);
    return ok({ ads: localAds(p, lang, b.count ?? 3), by: "local", strategy: localAdStrategy(p, lang, b), lang });
  }
});
