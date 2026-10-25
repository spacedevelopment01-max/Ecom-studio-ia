/**
 * Biens immobiliers du projet (onglet « Biens », thème Maison & Horizon) : liste et création.
 * Le projet doit appartenir au compte connecté (projectFromCtx) ; chaque bien reste rattaché à ce projet.
 */
import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { BIEN_TRANSACTIONS, createBien, listBiens, missingForPublication } from "@/lib/biens";

export const runtime = "nodejs";

/** Biens du projet (les archivés avec ?archives=1), et ce qui manque à chacun pour être publié. */
export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const archived = new URL(req.url).searchParams.get("archives") === "1";
  return ok({ biens: listBiens(p.id, { archived }).map((b) => ({ ...b, missing: missingForPublication(b.transaction, b.data) })) });
});

/** Nouveau bien, toujours en brouillon (référence libre attribuée si aucune n'est donnée). */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const b = await body(req, z.object({ transaction: z.enum(BIEN_TRANSACTIONS), ref: z.string().optional(), data: z.record(z.string(), z.unknown()).optional() }));
  const bien = createBien(user.id, p.id, b);
  return ok({ bien: { ...bien, missing: missingForPublication(bien.transaction, bien.data) } }, { status: 201 });
});
