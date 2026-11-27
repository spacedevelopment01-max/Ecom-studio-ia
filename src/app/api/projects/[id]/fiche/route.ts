import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { START_FIELDS } from "@/lib/syna-agent/journey";
import { GENRES, PORTEES, corrigerFiche, ficheVue, journeyDuProjet } from "@/lib/syna-agent/fiche";
import { one } from "@/lib/db";
import { SUJET_MAX } from "@/lib/syna-agent/faits-a-montrer";

/** « Ce que SINA sait de toi » : la fiche du client, qu'il lit et corrige lui-même (gratuit, aucun appel à l'IA). */
const vue = (projectId: string) => {
  const cid = journeyDuProjet(projectId)?.cid ?? one<{ id: string }>("SELECT id FROM agent_conversations WHERE project_id=? ORDER BY updated_at DESC", projectId)?.id;
  return cid ? ficheVue(cid, projectId) : null;
};

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  return ok({ fiche: vue(p.id) });
});

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const b = await body(req, z.discriminatedUnion("type", [
    z.object({ type: z.literal("note"), sujet: z.string().min(1).max(80), value: z.string().max(2000).nullable(), genre: z.enum(GENRES).optional(), portee: z.enum(PORTEES).optional() }).strict(),
    z.object({ type: z.literal("reponse"), champ: z.enum(START_FIELDS), value: z.string().min(1).max(4000) }).strict(),
    // Un fait à montrer (27 novembre 2026) : sa valeur corrigée, ou null pour « ne pas le montrer ».
    z.object({ type: z.literal("fait"), sujet: z.string().min(2).max(SUJET_MAX), produit: z.string().min(1).max(120).optional(), value: z.string().max(600).nullable() }).strict(),
  ]));
  corrigerFiche(p.id, b);
  return ok({ fiche: vue(p.id) });
});
