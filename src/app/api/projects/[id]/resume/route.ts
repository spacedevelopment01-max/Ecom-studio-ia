import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { one, json } from "@/lib/db";
import { STEPS } from "@/lib/engine/pipeline";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { setStatus } from "@/lib/projects";

/** Reprise ou relance du pilote à partir d'une étape (les étapes antérieures sont conservées). */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const b = await body(req, z.object({ from: z.enum(STEPS.map((s) => s.id) as [string, ...string[]]).optional(), mode: z.enum(["autopilot", "guided"]).optional() }));
  const last = one<{ payload: string }>("SELECT payload FROM jobs WHERE project_id = ? AND type = 'pipeline.run' ORDER BY created_at DESC LIMIT 1", p.id);
  const prev = json<any>(last?.payload, { input: {} });
  setStatus(p.id, "queued");
  const job = enqueue({ userId: user.id, projectId: p.id, type: "pipeline.run", label: "Suite de la création", payload: { projectId: p.id, mode: b.mode ?? "autopilot", from: b.from ?? "copy", input: prev.input ?? {} }, maxAttempts: 2 });
  return ok({ jobId: job.id });
});
