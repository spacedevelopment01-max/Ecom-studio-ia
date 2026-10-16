import { z } from "zod";
import { HttpError } from "@/lib/auth";
import { body, handle, ok } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { L } from "@/lib/i18n-server";
import { aiActiveFor } from "@/lib/ai/access";
import { estimateMicro } from "@/lib/ai/estimate";
import { videoProviderAvailable } from "@/lib/ai/media-providers";
import { requireCreationPlan } from "@/lib/plan-gates";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";

export const runtime = "nodejs";

/** Prix d'un plan filmé par l'IA, affiché avant ; IA du projet active ou non. */
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  return ok({ ai: aiActiveFor(p.userId, p.id) && !!videoProviderAvailable("product_video"), clipEstimateMicro: estimateMicro("video-clip") });
});

const Req = z.discriminatedUnion("action", [
  z.object({ action: z.literal("stock"), topic: z.string().max(200).optional(), aspect: z.enum(["9:16", "16:9"]).default("9:16"), count: z.number().int().min(1).max(3).default(2), broad: z.boolean().optional(), silhouettes: z.boolean().optional() }),
  z.object({ action: z.literal("ai"), imageId: z.string().max(64), prompt: z.string().max(300).optional(), aspect: z.enum(["9:16", "16:9"]).default("9:16"), approvedEstimateMicro: z.number().int().min(0) }),
]);

/** Compléter la banque : plans libres de droits (gratuit) ou un plan filmé par l'IA (payant, prix accepté). */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  requireCreationPlan(user, p.id, "videos");
  const b = await body(req, Req);
  if (b.action === "stock") {
    const job = enqueue({ userId: user.id, projectId: p.id, type: "video.bank.stock", label: L("Plans libres de droits", "Royalty-free clips"), payload: { projectId: p.id, request: { topic: b.topic, aspect: b.aspect, count: b.count, broad: b.broad, silhouettes: b.silhouettes } } });
    return ok({ jobId: job.id });
  }
  if (!aiActiveFor(p.userId, p.id)) throw new HttpError(402, L("L'IA n'est pas active pour ce projet : cherchez plutôt des plans libres de droits (gratuit).", "AI isn't active for this project: search royalty-free clips instead (free)."));
  if (b.approvedEstimateMicro < estimateMicro("video-clip")) throw new HttpError(409, L("Prix à accepter avant de lancer (il a pu changer).", "Price to accept before starting (it may have changed)."));
  const job = enqueue({ userId: user.id, projectId: p.id, type: "video.bank.ai", label: L("Plan filmé par l'IA", "AI-filmed shot"), payload: { projectId: p.id, request: { imageId: b.imageId, prompt: b.prompt, aspect: b.aspect } } });
  return ok({ jobId: job.id });
});
