/**
 * Un bien du projet : lecture, modification (fiche), changement d'état (publier, retirer, vendu, loué, archiver).
 * Aucune suppression : « archivé » retire le bien de tout affichage et le garde en base.
 */
import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { BIEN_STATUSES, BIEN_TRANSACTIONS, getBien, missingForPublication, setBienStatus, updateBien } from "@/lib/biens";

export const runtime = "nodejs";

type BCtx = Ctx<{ id: string; bid: string }>;
const view = (b: ReturnType<typeof getBien>) => ({ ...b, missing: missingForPublication(b.transaction, b.data) });

export const GET = handle(async (_req: Request, ctx: BCtx) => {
  const { project: p } = await projectFromCtx(ctx);
  const { bid } = await ctx.params;
  return ok({ bien: view(getBien(p.id, bid)) });
});

export const PATCH = handle(async (req: Request, ctx: BCtx) => {
  const { project: p } = await projectFromCtx(ctx);
  const { bid } = await ctx.params;
  const b = await body(req, z.object({ transaction: z.enum(BIEN_TRANSACTIONS).optional(), data: z.record(z.string(), z.unknown()).optional(), status: z.enum(BIEN_STATUSES).optional() }));
  // Retirer / archiver d'abord (une fiche hors ligne peut s'enregistrer incomplète) ; publier après l'enregistrement.
  const offline = b.status && ["draft", "withdrawn", "archived"].includes(b.status);
  if (offline && b.status !== getBien(p.id, bid).status) setBienStatus(p.id, bid, b.status!);
  let bien = b.transaction || b.data ? updateBien(p.id, bid, { transaction: b.transaction, data: b.data }) : getBien(p.id, bid);
  if (b.status && !offline && b.status !== bien.status) bien = setBienStatus(p.id, bid, b.status);
  return ok({ bien: view(bien) });
});
