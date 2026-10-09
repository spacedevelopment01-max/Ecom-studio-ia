import { z } from "zod";
import { HttpError } from "@/lib/auth";
import { body, handle, ok } from "@/lib/http";
import { L } from "@/lib/i18n-server";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { cancelWorkflow, loadWorkflow, retryWorkflow, startWorkflow, workflowView, WorkflowError } from "@/lib/workflow";

export const runtime = "nodejs";

type WfCtx = Ctx<{ id: string; wid: string }>;

async function owned(ctx: WfCtx) {
  const { user, project } = await projectFromCtx(ctx as unknown as Ctx);
  const { wid } = await ctx.params;
  const wf = loadWorkflow(wid);
  if (!wf || wf.projectId !== project.id) throw new HttpError(404, L("Demande introuvable.", "Request not found."));
  return { user, project, wf };
}

/** Suivi : étapes, résultats, reprises, coûts réels par module, éléments à valider. */
export const GET = handle(async (_req: Request, ctx: WfCtx) => {
  const { wf } = await owned(ctx);
  return ok(workflowView(wf.id));
});

/** Lancer (devis accepté, plafond) ou annuler. */
export const POST = handle(async (req: Request, ctx: WfCtx) => {
  const { wf } = await owned(ctx);
  const b = await body(req, z.object({ action: z.enum(["start", "cancel", "retry"]), approveMicro: z.number().int().min(0).nullable().optional(), capEur: z.number().min(0).max(10000).nullable().optional(), videos: z.enum(["ai", "edited", "none"]).optional() }));
  try {
    if (b.action === "cancel") cancelWorkflow(wf.id);
    else if (b.action === "retry") retryWorkflow(wf.id, { approveMicro: b.approveMicro ?? null, capEur: b.capEur ?? null });
    else startWorkflow(wf.id, { approveMicro: b.approveMicro ?? null, capEur: b.capEur ?? null, videos: b.videos });
  } catch (e) {
    if (e instanceof WorkflowError) throw new HttpError(e.status, e.message);
    throw e;
  }
  return ok(workflowView(wf.id));
});
