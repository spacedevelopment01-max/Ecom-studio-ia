/**
 * Contenus métier du projet (#239, phase 4) : quels types ce site affiche (biens, carte, réalisations, prestations),
 * combien d'éléments, quelles opérations, et si le site en ligne est à jour. Propriétaire du projet seulement.
 * Forme commune décrite dans `src/lib/contenus/api.ts` (réutilisable plus tard par SYNA).
 */
import { handle, ok } from "@/lib/http";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { contentManifest } from "@/lib/contenus/api";

export const runtime = "nodejs";

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  return ok(contentManifest(p.id));
});
