import { all } from "@/lib/db";
import { handle, ok } from "@/lib/http";
import { publicJob, type Job } from "@/lib/jobs";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";

export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const type = new URL(req.url).searchParams.get("type");
  const rows = type
    ? all<Job>("SELECT * FROM jobs WHERE project_id = ? AND type LIKE ? ORDER BY created_at DESC LIMIT 30", p.id, `${type}%`)
    : all<Job>("SELECT * FROM jobs WHERE project_id = ? ORDER BY created_at DESC LIMIT 40", p.id);
  return ok({ jobs: rows.map(publicJob) });
});
