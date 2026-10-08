import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { pendingValidations, prepareWorkflow, projectWorkflows, workflowView } from "@/lib/workflow";

export const runtime = "nodejs";

/** Demandes globales du projet (Studio Workflow V2) et éléments à valider. */
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  return ok({ workflows: projectWorkflows(p.id, 5).map((w) => workflowView(w.id)), validations: pendingValidations(p) });
});

/** Prépare une demande : plan de l'orchestrateur et devis. Rien n'est lancé ni dépensé. */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const b = await body(req, z.object({ text: z.string().min(3).max(4000), videos: z.enum(["ai", "edited", "none"]).optional() }));
  const wf = await prepareWorkflow(p.id, user.id, b.text, { videos: b.videos });
  return ok(workflowView(wf.id));
});
