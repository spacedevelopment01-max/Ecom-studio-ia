import { z } from "zod";
import { HttpError } from "@/lib/auth";
import { body, handle, ok } from "@/lib/http";
import { all, json, one } from "@/lib/db";
import { enqueue } from "@/lib/jobs";
import { L } from "@/lib/i18n-server";
import { aiActiveFor } from "@/lib/ai/access";
import { projectRights } from "@/lib/plan-gates";
import { aiPostProbableMicro, estimateMicro } from "@/lib/ai/estimate";
import { budgetPctOf } from "@/lib/ai/budget-pct";
import { aiPostMaxMicro, wanClipMaxMicro } from "@/lib/ai/media-providers";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { resolveSubject, subjectOptions } from "@/lib/creative-subject";
import { quoteScenes, SCENE_LIMITS, type ThreeScenesRequest } from "@/lib/video-v2/three-scenes";
import type { Project } from "@/lib/projects";

export const runtime = "nodejs";

const Subject = z.discriminatedUnion("kind", [z.object({ kind: z.literal("product"), key: z.string().min(1).max(80) }), z.object({ kind: z.literal("service"), name: z.string().min(1).max(120) })]);
const Req = z.object({
  as: z.enum(["post", "ad"]),
  subject: Subject.optional(),
  request: z.string().max(600).optional(),
  aspect: z.enum(["9:16", "16:9", "1:1", "4:5"]).default("9:16"),
  scenes: z.number().int().min(SCENE_LIMITS.scenes[0]).max(SCENE_LIMITS.scenes[1]).default(3),
  totalS: z.number().int().min(SCENE_LIMITS.totalS[0]).max(SCENE_LIMITS.totalS[1]).default(15),
  music: z.boolean().default(true),
});

/**
 * Devis au COÛT PROBABLE (une image et un plan par scène, un essai), montré en % du budget IA du mois ; `capMicro` :
 * plafond de la tâche (coûts maximaux, reprises comprises), jamais montré comme prix.
 */
const quote = (p: Project, r: ThreeScenesRequest) => {
  const o = { clipMaxMicro: (s: number) => wanClipMaxMicro(s), textMicro: Math.round(estimateMicro("blog") / 10), videosRight: projectRights(p.id)?.videos ?? null, aiActive: aiActiveFor(p.userId, p.id) };
  const max = quoteScenes(p, r, { ...o, imageMaxMicro: aiPostMaxMicro() });
  const probable = quoteScenes(p, r, { ...o, imageMaxMicro: aiPostMaxMicro() == null ? null : aiPostProbableMicro() });
  return { ...probable, capMicro: Math.max(max.estimateMicro, probable.estimateMicro), pct: budgetPctOf(p.userId, probable.estimateMicro, p.id) };
};

/** Vidéos en scènes déjà faites (création guidée et création du projet), avec leur sujet et leur demande. */
function list(projectId: string) {
  const seen = new Set<string>();
  return all<{ id: string; meta: string; created_at: number }>("SELECT id, meta, created_at FROM assets WHERE project_id = ? AND role = 'video' AND deleted_at IS NULL AND json_extract(meta, '$.scenes') IS NOT NULL ORDER BY created_at DESC LIMIT 40", projectId).map((r) => {
    const m = json<any>(r.meta, {});
    return { id: r.id, url: `/api/files/${r.id}`, docKey: m.videoV2?.docKey ?? null, aspect: m.format ?? null, durationS: m.videoV2?.durationS ?? null, as: m.scenes?.as ?? "post", mode: m.scenes?.mode ?? null, subject: m.scenes?.subject?.name ?? null, request: m.scenes?.request ?? null, music: m.scenes?.music !== false, at: r.created_at };
  }).filter((v) => !v.docKey || (!seen.has(v.docKey) && !!seen.add(v.docKey))); // dernier rendu de chaque vidéo seulement
}

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  return ok({ videos: list(p.id), ai: aiActiveFor(p.userId, p.id), limits: SCENE_LIMITS, subjects: subjectOptions(p).map((x) => ({ kind: x.kind, key: x.key, name: x.name, hasPhoto: !!x.referenceAssetId, photoId: x.referenceAssetId })) });
});

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const b = await body(req, z.discriminatedUnion("action", [z.object({ action: z.literal("quote"), ...Req.shape }), z.object({ action: z.literal("create"), ...Req.shape, approvedEstimateMicro: z.number().int().min(0).nullable().optional() })]));
  const subject = b.subject ? resolveSubject(p, b.subject) : null;
  if (b.subject && (!subject || subject.kind !== b.subject.kind || subject.key !== (b.subject.kind === "service" ? b.subject.name.trim() : b.subject.key))) throw new HttpError(400, L("Produit ou service introuvable dans ce projet.", "Product or service not found in this project."));
  const r: ThreeScenesRequest = { as: b.as, subject: b.subject ?? null, request: b.request?.trim() || null, aspect: b.aspect, scenes: b.scenes, totalS: b.totalS, music: b.music };
  const q = quote(p, r);
  if (b.action === "quote") return ok(q);
  if (!p.brand) throw new HttpError(409, L("La marque n'est pas encore créée.", "The brand has not been created yet."));
  if (!q.allowed) throw new HttpError(402, q.reason ?? L("Vidéo impossible pour ce projet.", "Video not possible for this project."));
  if (q.estimateMicro > 0 && (b.approvedEstimateMicro == null || b.approvedEstimateMicro < q.estimateMicro)) throw new HttpError(409, L("Prix à accepter avant de lancer (il a pu changer) : vérifiez-le puis relancez.", "Price to accept before starting (it may have changed): check it and start again."));
  if (one("SELECT 1 FROM jobs WHERE project_id = ? AND type = 'video.scenes' AND status IN ('queued','running','paused')", p.id)) throw new HttpError(409, L("Une vidéo est déjà en préparation.", "A video is already being prepared."));
  const job = enqueue({ userId: user.id, projectId: p.id, type: "video.scenes", label: b.as === "ad" ? L("Publicité vidéo", "Video ad") : L("Publication vidéo", "Video post"), payload: { projectId: p.id, costCapMicro: q.capMicro, request: { ...r, mode: q.mode } } });
  return ok({ jobId: job.id, ...q });
});
