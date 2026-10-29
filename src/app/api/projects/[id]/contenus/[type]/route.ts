/**
 * Contenus d'un type (biens, plats, realisations, prestations) : liste, création (toujours en brouillon), ordre.
 * Propriétaire du projet seulement ; aucune publication du site hébergé n'est faite ici.
 */
import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { adapter, siteState } from "@/lib/contenus/api";
import { HttpError } from "@/lib/auth";
import { L } from "@/lib/i18n-server";
import { zodTo400 } from "../zod-400";

export const runtime = "nodejs";
type TCtx = Ctx<{ id: string; type: string }>;

export const GET = handle(async (req: Request, ctx: TCtx) => {
  const { project: p } = await projectFromCtx(ctx);
  const { type } = await ctx.params;
  return ok({ type, items: adapter(type).list(p.id, new URL(req.url).searchParams.get("archives") === "1"), site: siteState(p.id) });
});

const Schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), data: z.record(z.string(), z.unknown()) }),
  z.object({ action: z.literal("reorder"), ids: z.array(z.string().max(40)).max(1000) }),
]);

export const POST = handle(async (req: Request, ctx: TCtx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const { type } = await ctx.params;
  const a = adapter(type);
  const b = await body(req, Schema);
  return zodTo400(() => {
    if (b.action === "create") {
      if (!a.create) throw new HttpError(405, L("Ce contenu ne se crée pas : modifiez-le.", "This content can't be created: edit it."));
      return ok({ item: a.create(p.id, user.id, b.data), site: siteState(p.id) }, { status: 201 });
    }
    if (!a.reorder) throw new HttpError(405, L("Ce contenu n'a pas d'ordre.", "This content has no order."));
    a.reorder(p.id, b.ids);
    return ok({ items: a.list(p.id, false), site: siteState(p.id) });
  });
});
