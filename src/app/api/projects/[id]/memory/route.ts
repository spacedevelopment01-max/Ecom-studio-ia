import { z } from "zod";
import { all, run } from "@/lib/db";
import { body, handle, ok } from "@/lib/http";
import { remember } from "@/lib/projects";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  return ok({ items: all("SELECT id, kind, key, value, status, source, scope, updated_at FROM memory WHERE project_id = ? AND kind != 'artifact' AND state = 'active' ORDER BY updated_at DESC", p.id) });
});

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const b = await body(req, z.object({ kind: z.enum(["decision", "correction", "preference", "goal"]), key: z.string().min(1).max(120), value: z.string().min(1).max(2000), scope: z.enum(["all", "shop", "images", "video", "social", "brand"]).default("all") }));
  remember(p.id, { ...b, source: "user" });
  return ok();
});

export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const mid = new URL(req.url).searchParams.get("item");
  run("DELETE FROM memory WHERE id = ? AND project_id = ? AND kind != 'artifact'", mid, p.id);
  return ok();
});
