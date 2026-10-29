/**
 * Un contenu métier : lecture, modification (`ifVersion` : refus si l'élément a changé entre-temps), publication,
 * retrait, archivage ou changement d'état (`confirm: true` obligatoire : accord explicite du professionnel).
 * Aucune suppression ; le site hébergé n'est jamais publié ici.
 */
import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { adapter, setContentStatus, siteState, updateContent } from "@/lib/contenus/api";
import { zodTo400 } from "../../zod-400";

export const runtime = "nodejs";
type ICtx = Ctx<{ id: string; type: string; itemId: string }>;

export const GET = handle(async (_req: Request, ctx: ICtx) => {
  const { project: p } = await projectFromCtx(ctx);
  const { type, itemId } = await ctx.params;
  return ok({ item: adapter(type).get(p.id, itemId), site: siteState(p.id) });
});

export const PATCH = handle(async (req: Request, ctx: ICtx) => {
  const { project: p } = await projectFromCtx(ctx);
  const { type, itemId } = await ctx.params;
  const b = await body(req, z.object({ data: z.record(z.string(), z.unknown()), ifVersion: z.string().max(80).optional() }));
  return zodTo400(() => ok({ item: updateContent(p.id, type, itemId, b.data, b.ifVersion), site: siteState(p.id) }));
});

export const POST = handle(async (req: Request, ctx: ICtx) => {
  const { project: p } = await projectFromCtx(ctx);
  const { type, itemId } = await ctx.params;
  const b = await body(req, z.object({ action: z.enum(["publish", "withdraw", "archive", "status"]), status: z.string().max(20).optional(), confirm: z.boolean().optional(), ifVersion: z.string().max(80).optional() }));
  return zodTo400(() => ok({ item: setContentStatus(p.id, type, itemId, b.action, b), site: siteState(p.id) }));
});
