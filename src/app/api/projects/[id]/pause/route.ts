import { z } from "zod";
import { all } from "@/lib/db";
import { body, handle, ok } from "@/lib/http";
import { pauseJob, resumeJob } from "@/lib/jobs";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";

/**
 * Pause ou reprise de toutes les créations en cours d'un projet.
 * La pause intervient au prochain point d'avancement ; les étapes terminées sont conservées
 * et la reprise repart de là (rien n'est refait ni refacturé).
 */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const b = await body(req, z.object({ action: z.enum(["pause", "resume"]) }));
  if (b.action === "pause") {
    const jobs = all<{ id: string; type: string }>("SELECT id, type FROM jobs WHERE project_id = ? AND status IN ('queued','running','blocked')", p.id);
    jobs.forEach((j) => pauseJob(j.id));
    return ok({ paused: jobs.length });
  }
  const jobs = all<{ id: string; type: string }>("SELECT id, type FROM jobs WHERE project_id = ? AND status = 'paused'", p.id);
  jobs.forEach((j) => resumeJob(j.id));
  return ok({ resumed: jobs.length });
});
