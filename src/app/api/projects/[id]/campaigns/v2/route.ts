import { z } from "zod";
import { HttpError } from "@/lib/auth";
import { body, handle, ok } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { all, json, one, run } from "@/lib/db";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { L } from "@/lib/i18n-server";
import { PLATFORMS } from "@/lib/ads-v2/types";
import { aiActiveFor } from "@/lib/ai/access";
import { resolveSubject, subjectOptions } from "@/lib/creative-subject";
import { aiPostQuoteMicro } from "@/lib/engine/ai-post-image";

export const runtime = "nodejs";

/** Créations publicitaires V2 du projet : concept, plateforme, format, verdict, note, textes (aucune consigne IA). */
function view(projectId: string) {
  const rows = all<{ id: string; status: string; meta: string; created_at: number }>(
    "SELECT id, status, meta, created_at FROM assets WHERE project_id = ? AND role = 'ad' AND deleted_at IS NULL AND json_extract(meta, '$.adV2') IS NOT NULL ORDER BY created_at DESC LIMIT 80",
    projectId,
  );
  return {
    creatives: rows.map((r) => {
      const m = json<any>(r.meta, {});
      const a = m.adV2 ?? {};
      return {
        id: r.id,
        url: `/api/files/${r.id}`,
        status: r.status,
        verdict: m.gate?.verdict ?? null,
        score: typeof m.gate?.score === "number" ? Math.round(m.gate.score * 10) / 10 : null,
        reason: m.gate?.reason ?? "",
        concept: a.conceptId,
        angle: a.angle,
        copy: a.copy,
        platform: a.platform,
        aspect: a.aspect,
        layout: a.layout,
        imageAssetId: a.imageAssetId ?? null,
        at: r.created_at,
      };
    }),
  };
}

/** Publicités entièrement conçues par l'IA (création guidée), avec le produit ou service et la demande d'origine. */
function aiAds(projectId: string) {
  return all<{ id: string; meta: string; created_at: number }>("SELECT id, meta, created_at FROM assets WHERE project_id = ? AND role = 'ad' AND deleted_at IS NULL AND status != 'rejected' AND json_extract(meta, '$.aiAd') IS NOT NULL ORDER BY created_at DESC LIMIT 60", projectId).map((r) => {
    const m = json<any>(r.meta, {});
    return { id: r.id, url: `/api/files/${r.id}`, aspect: m.aspect ?? null, subject: m.aiPost?.subject?.name ?? null, request: m.aiPost?.request ?? null, texts: m.aiPost?.texts ?? null, at: r.created_at };
  });
}

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  return ok({ ...view(p.id), aiAds: aiAds(p.id), ai: aiActiveFor(p.userId, p.id), subjects: subjectOptions(p).map((x) => ({ kind: x.kind, key: x.key, name: x.name, hasPhoto: !!x.referenceAssetId, photoId: x.referenceAssetId })) });
});

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const b = await body(
    req,
    z.object({
      action: z.enum(["generate", "reject", "ai_quote", "ai_create"]),
      /** Création guidée par l'IA (Qwen) : produit ou service, demande libre, format, prix accepté. */
      subject: z.discriminatedUnion("kind", [z.object({ kind: z.literal("product"), key: z.string().min(1).max(80) }), z.object({ kind: z.literal("service"), name: z.string().min(1).max(120) })]).optional(),
      request: z.string().max(600).optional(),
      aspect: z.enum(["1:1", "4:5", "9:16", "16:9"]).optional(),
      approvedEstimateMicro: z.number().int().min(0).nullable().optional(),
      assetId: z.string().max(40).optional(),
      count: z.number().int().min(1).max(6).optional(),
      platforms: z.array(z.enum(PLATFORMS)).max(6).optional(),
      objective: z.string().max(80).optional(),
      audience: z.string().max(600).optional(),
      /** Offre RÉELLE de la campagne (sinon aucune promotion n'est écrite). */
      offer: z.string().max(200).optional(),
      /** Format voulu par le client (une image différente par publicité, à ce format). */
      aspects: z.array(z.enum(["1:1", "4:5", "9:16", "16:9", "1.91:1", "2:3"])).max(4).optional(),
    }),
  );
  if (b.action === "reject") {
    // Création refusée par le client : jamais réutilisée automatiquement.
    if (!one("SELECT 1 FROM assets WHERE id = ? AND project_id = ? AND role = 'ad'", b.assetId ?? "", p.id)) throw new HttpError(404, L("Création introuvable.", "Creative not found."));
    run("UPDATE assets SET status = 'rejected', meta = json_set(meta, '$.userRejected', 1) WHERE id = ?", b.assetId!);
    return ok(view(p.id));
  }
  if (b.action === "ai_quote") return ok({ ai: aiActiveFor(p.userId, p.id), estimateMicro: aiPostQuoteMicro() });
  if (!p.brand) throw new HttpError(409, L("La marque n'est pas encore créée.", "The brand has not been created yet."));
  if (b.action === "ai_create") {
    // Publicité entièrement conçue par l'IA d'images (Qwen) : jamais sans IA active ni prix accepté.
    if (!aiActiveFor(p.userId, p.id)) throw new HttpError(402, L("L'IA n'est pas active pour ce projet (forfait Découverte, budget IA épuisé ou fournisseur désactivé).", "AI isn't active for this project (Discovery plan, AI budget used up or provider disabled)."));
    const quote = aiPostQuoteMicro();
    if (b.approvedEstimateMicro == null || b.approvedEstimateMicro < quote) throw new HttpError(409, L("Prix à accepter avant de lancer (il a pu changer) : vérifiez-le puis relancez.", "Price to accept before starting (it may have changed): check it and start again."));
    const subject = b.subject ? resolveSubject(p, b.subject) : null;
    if (b.subject && (!subject || subject.kind !== b.subject.kind || subject.key !== (b.subject.kind === "service" ? b.subject.name.trim() : b.subject.key))) throw new HttpError(400, L("Produit ou service introuvable dans ce projet.", "Product or service not found in this project."));
    const job = enqueue({ userId: user.id, projectId: p.id, type: "image.ai_post", label: L("Publicité conçue par l'IA", "Ad designed by AI"), payload: { projectId: p.id, costCapMicro: quote, request: { as: "ad", kind: "ad", format: b.aspect ?? "4:5", subject: b.subject, request: b.request?.trim() || undefined } } });
    return ok({ jobId: job.id, estimateMicro: quote });
  }
  if (one("SELECT 1 FROM jobs WHERE project_id = ? AND type = 'ads.v2' AND status IN ('queued','running','paused')", p.id)) throw new HttpError(409, L("Des publicités sont déjà en préparation.", "Ads are already being prepared."));
  const job = enqueue({ userId: user.id, projectId: p.id, type: "ads.v2", label: L("Publicités : angles, textes et créations", "Ads: angles, copy and creatives"), payload: { projectId: p.id, request: { count: b.count, platforms: b.platforms, objective: b.objective, audience: b.audience, offer: b.offer, aspects: b.aspects } } });
  return ok({ jobId: job.id, ...view(p.id) });
});
