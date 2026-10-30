import { strategyVisibilitySql } from "@/lib/marketing-strategy/visibility";
import { all } from "@/lib/db";
import { body, handle, ok } from "@/lib/http";
import { postView } from "@/lib/posts";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import {createManualPost,ManualPostInputSchema}from "@/lib/social-v2/manual";


export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const u = new URL(req.url).searchParams;
  const from = Number(u.get("from") ?? 0);
  const to = Number(u.get("to") ?? 8.64e15);
  const rows = all<any>(`SELECT p.*, c.name AS connection_name FROM posts p LEFT JOIN connections c ON c.id = p.connection_id WHERE p.project_id = ? AND ${strategyVisibilitySql(p.id,"post","p.id")} AND (p.scheduled_at IS NULL OR (p.scheduled_at >= ? AND p.scheduled_at < ?)) ORDER BY COALESCE(p.scheduled_at, p.created_at) ASC LIMIT 600`, p.id, from, to);
  return ok({ posts: rows.map(postView) });
});

/** Publication créée à la main ou depuis une campagne (texte, médias de la bibliothèque, date) : publication Social V2. */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const b=await body(req,ManualPostInputSchema);
  return ok(createManualPost(p,user.id,b));
});
