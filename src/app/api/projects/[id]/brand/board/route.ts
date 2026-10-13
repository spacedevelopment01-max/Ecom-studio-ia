import { HttpError } from "@/lib/auth";
import { handle, ok } from "@/lib/http";
import { saveIdentityBoard } from "@/lib/engine/identity-board";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { L } from "@/lib/i18n-server";

export const runtime = "nodejs";

/** Refait la planche d'identité de marque (logo, couleurs, typographies, icônes, motif, applications), sans IA. */
export const POST = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  if (!p.brand) throw new HttpError(409, L("La marque n'est pas encore créée.", "The brand has not been created yet."));
  const a = await saveIdentityBoard(p.id);
  if (!a) throw new HttpError(409, L("Choisissez d'abord un logo : la planche se construit autour de lui.", "Choose a logo first: the board is built around it."));
  return ok({ board: { id: a.id, url: `/api/files/${a.id}` } });
});
