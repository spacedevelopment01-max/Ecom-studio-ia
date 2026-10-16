import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { requireCreationPlan } from "@/lib/plan-gates";
import { loadCreativeMemory, rememberCorrection, rememberPreference, rememberValidated } from "@/lib/video-v2/creative-memory";

/** Mémoire créative vidéo du projet : marque autorisée, références produit, préférences, médias et provenance… */
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  return ok({ memory: loadCreativeMemory(p.id, p) });
});

/** Le client règle ses préférences (style, animation, voix, musique), valide un choix ou note une correction. */
export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  // Découverte : visite seulement, rien ne se modifie sans abonnement.
  requireCreationPlan(user, p.id, "videos");
  const b = await body(
    req,
    z.object({
      family: z.enum(["premium", "tech", "artisan", "wellness", "promo"]).optional(),
      animation: z.enum(["sober", "punchy", "mask", "words", "highlight"]).optional(),
      voice: z.enum(["on", "off"]).optional(),
      music: z.enum(["on", "off"]).optional(),
      validated: z.string().min(1).max(200).optional(),
      correction: z.string().min(1).max(300).optional(),
    }),
  );
  for (const k of ["family", "animation", "voice", "music"] as const) if (b[k]) rememberPreference(p.id, k, b[k]!);
  if (b.validated) rememberValidated(p.id, b.validated);
  if (b.correction) rememberCorrection(p.id, b.correction);
  return ok({ memory: loadCreativeMemory(p.id, p) });
});
