import { z } from "zod";
import { HttpError } from "@/lib/auth";
import { body, handle, ok } from "@/lib/http";
import { one } from "@/lib/db";
import { enqueue } from "@/lib/jobs";
import { L } from "@/lib/i18n-server";
import { aiActiveFor } from "@/lib/ai/access";
import { assetMeta, getAsset } from "@/lib/library";
import { aiPostCapMicro } from "@/lib/engine/ai-post-image";
import { aiPostProbableMicro } from "@/lib/ai/estimate";
import { budgetPctOf } from "@/lib/ai/budget-pct";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { isAiImage, redoRequest, reformatAiImage } from "@/lib/media/ai-image-variants";

export const runtime = "nodejs";

type ImgCtx = { params: Promise<{ id: string; assetId: string }> };

/**
 * Publication ou publicité faite par l'IA : autre format gratuit (studio) ou nouvelle version par l'IA (autre
 * format recomposé et/ou modification demandée), payante, prix accepté avant, jamais sans IA active.
 */
export const POST = handle(async (req: Request, ctx: ImgCtx) => {
  const { user, project: p } = await projectFromCtx(ctx as unknown as Ctx);
  const { assetId } = await ctx.params;
  const a = getAsset(assetId);
  if (!a || a.project_id !== p.id || a.deleted_at || a.kind !== "image" || !isAiImage(assetMeta(a))) throw new HttpError(404, L("Visuel introuvable.", "Visual not found."));
  const b = await body(
    req,
    z.object({
      action: z.enum(["reformat", "quote", "redo"]),
      aspect: z.enum(["1:1", "4:5", "9:16", "16:9"]),
      instruction: z.string().max(400).optional(),
      approvedEstimateMicro: z.number().int().min(0).nullable().optional(),
    }),
  );
  if (b.action === "reformat") {
    const copy = await reformatAiImage(p.id, a.id, b.aspect);
    if (!copy) throw new HttpError(400, L("Ce visuel ne peut pas changer de format.", "This visual cannot change format."));
    return ok({ assetId: copy.id, url: `/api/files/${copy.id}` });
  }
  // Devis au coût probable (un essai), dit en % du budget IA ; le plafond de la tâche permet les reprises.
  const estimateMicro = aiPostProbableMicro();
  const ai = aiActiveFor(p.userId, p.id);
  if (b.action === "quote") return ok({ ai, estimateMicro, pct: budgetPctOf(p.userId, estimateMicro, p.id) });
  if (!ai) throw new HttpError(402, L("L'IA n'est pas active pour ce projet (pas d'abonnement, budget IA épuisé ou fournisseur désactivé).", "AI isn't active for this project (no subscription, AI budget used up or provider disabled)."));
  if (b.approvedEstimateMicro == null || b.approvedEstimateMicro < estimateMicro) throw new HttpError(409, L("Prix à accepter avant de lancer (il a pu changer) : vérifiez-le puis relancez.", "Price to accept before starting (it may have changed): check it and start again."));
  if (one("SELECT 1 FROM jobs WHERE project_id = ? AND type = 'image.ai_post' AND status IN ('queued','running','paused')", p.id)) throw new HttpError(409, L("Un visuel IA est déjà en préparation.", "An AI visual is already being prepared."));
  const meta = assetMeta<Record<string, any>>(a);
  const request = redoRequest(meta, { aspect: b.aspect, instruction: b.instruction });
  const job = enqueue({ userId: user.id, projectId: p.id, type: "image.ai_post", label: meta.aiAd ? L("Publicité IA : nouvelle version", "AI ad: new version") : L("Publication IA : nouvelle version", "AI post: new version"), payload: { projectId: p.id, costCapMicro: aiPostCapMicro(), request } });
  return ok({ jobId: job.id, estimateMicro });
});
