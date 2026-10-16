import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { requireCreationPlan } from "@/lib/plan-gates";
import { artDirectionFor, loadArtDirection, saveArtDirection } from "@/lib/image-v2/art-direction";

/**
 * Direction artistique des images du projet (mémoire versionnée, table `memory`, portée `images`, clé
 * `image.art_direction`) : celle que le moteur charge avant chaque image finale. Absente : proposée par le studio.
 */
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const saved = loadArtDirection(p.id);
  return ok({ artDirection: saved ?? artDirectionFor(p), saved: !!saved });
});

/** Le client ajuste la direction (idée, lumière, décor, émotion, à éviter…) ou en demande une autre : nouvelle version. */
export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  requireCreationPlan(user, p.id, "images");
  const s = z.string().min(1).max(300);
  const b = await body(req, z.object({ refresh: z.boolean().optional(), idea: s.optional(), light: s.optional(), setting: s.optional(), style: s.optional(), emotion: s.optional(), density: s.optional(), avoid: z.array(s).max(12).optional() }));
  const { refresh, ...patch } = b;
  const base = artDirectionFor(p, { refresh: !!refresh });
  if (!Object.values(patch).some((v) => v !== undefined)) return ok({ artDirection: base });
  const next = saveArtDirection(p.id, { ...base, ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)), ...(patch.avoid ? { avoid: [...new Set([...base.avoid, ...patch.avoid])] } : {}) }, "user");
  return ok({ artDirection: next });
});
