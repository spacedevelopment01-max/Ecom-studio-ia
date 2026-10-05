import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { enqueue, pipelineActive } from "@/lib/jobs";
import { HttpError } from "@/lib/auth";
import { one, json } from "@/lib/db";
import { STEPS } from "@/lib/engine/pipeline";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { setStatus } from "@/lib/projects";
import { L } from "@/lib/i18n-server";

/** Reprise ou relance du pilote à partir d'une étape (les étapes antérieures sont conservées). */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const b = await body(req, z.object({ from: z.enum(STEPS.map((s) => s.id) as [string, ...string[]]).optional(), mode: z.enum(["autopilot", "guided"]).optional() }));
  // Une seule création à la fois (sinon chaque relance générerait de nouveaux visuels en parallèle).
  if (pipelineActive(p.id)) throw new HttpError(409, L("Une création est déjà en cours pour ce projet.", "A creation is already in progress for this project."));
  const last = one<{ payload: string }>("SELECT payload FROM jobs WHERE project_id = ? AND type = 'pipeline.run' ORDER BY created_at DESC LIMIT 1", p.id);
  const prev = json<any>(last?.payload, { input: {} });
  setStatus(p.id, "queued");
  const job = enqueue({ userId: user.id, projectId: p.id, type: "pipeline.run", label: L("Suite de la création", "Continuing the creation"), payload: { projectId: p.id, mode: b.mode ?? "autopilot", from: b.from ?? "copy", input: prev.input ?? {} }, maxAttempts: 2 });
  return ok({ jobId: job.id });
});
