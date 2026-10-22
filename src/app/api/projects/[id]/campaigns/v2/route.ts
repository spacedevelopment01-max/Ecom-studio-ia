import { withCommunicationRequest } from "@/lib/marketing-strategy/communication-route";
import { planAllowsAds } from "@/lib/plan-entitlements";
import { planOfProject } from "@/lib/plan-gates";
import { assertAdvertising } from "@/lib/job-entitlements";
import {stableHash} from "@/lib/brain/hash";
import {campaignEstimate} from "@/lib/ads-v2/estimate";
import { publicationReadiness } from "@/lib/social-v2/ai-post";
import { z } from "zod";
import { HttpError } from "@/lib/auth";
import { body, handle, ok } from "@/lib/http";
import { enqueue, publicJob, type Job } from "@/lib/jobs";
import { all, json, one, run } from "@/lib/db";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { L } from "@/lib/i18n-server";
import { PLATFORMS } from "@/lib/ads-v2/types";
import { aiActiveFor } from "@/lib/ai/access";
import { resolveSubject, subjectOptions } from "@/lib/creative-subject";
import { aiPostCapMicro } from "@/lib/engine/ai-post-image";
import { aiPostProbableMicro } from "@/lib/ai/estimate";
import { budgetPctOf } from "@/lib/ai/budget-pct";

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
  return all<{ id: string; meta: string; created_at: number }>("SELECT id, meta, created_at FROM assets WHERE project_id = ? AND role = 'ad' AND deleted_at IS NULL AND status IN ('ready','approved') AND json_extract(meta, '$.aiAd') IS NOT NULL ORDER BY created_at DESC LIMIT 60", projectId).map((r) => {
    const m = json<any>(r.meta, {});
    return { id: r.id, url: `/api/files/${r.id}`, aspect: m.aspect ?? null, subject: m.aiPost?.subject?.name ?? null, request: m.aiPost?.request ?? null, texts: m.aiPost?.texts ?? null, at: r.created_at };
  });
}

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  // L'état terminal reste visible après une tâche très rapide, une déconnexion ou un rechargement.
  // Les publications organiques et les tâches des autres projets n'appartiennent pas à cette galerie.
  const aiJobs=all<Job>("SELECT * FROM jobs WHERE project_id=? AND type='image.ai_post' AND (json_extract(payload,'$.request.as')='ad' OR json_extract(payload,'$.request.entryPoint')='ads-guided') ORDER BY created_at DESC, rowid DESC LIMIT 20",p.id).map(publicJob);
  return ok({ access:planAllowsAds(planOfProject(p.id)), ...view(p.id), aiAds: aiAds(p.id), aiJobs, ai: aiActiveFor(p.userId, p.id) && (await publicationReadiness(p)).ready, subjects: subjectOptions(p).map((x) => ({ kind: x.kind, key: x.key, name: x.name, hasPhoto: !!x.referenceAssetId, photoId: x.referenceAssetId })) });
});

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  return withCommunicationRequest(p.id,req,async()=>{
  const b = await body(
    req,
    z.object({
      operationId:z.string().min(8).max(100).optional(),
      action: z.enum(["generate", "reject", "ai_quote", "ai_create", "campaign_quote"]),
      /** Création guidée par l'IA (Qwen) : produit ou service, demande libre, format, prix accepté. */
      subject: z.discriminatedUnion("kind", [z.object({ kind: z.literal("product"), key: z.string().min(1).max(80) }), z.object({ kind: z.literal("service"), name: z.string().min(1).max(120) })]).optional(),
      request: z.string().max(600).optional(),
      aspect: z.enum(["1:1", "4:5", "2:3", "3:2", "9:16", "16:9", "1.91:1", "3:1", "4:1"]).optional(),
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
  assertAdvertising(p.id);
  // Devis au coût probable (un essai), dit en % du budget IA ; le plafond de la tâche permet les reprises.
  if (b.action === "ai_quote") return ok({ ...(await publicationReadiness(p)), ai: aiActiveFor(p.userId, p.id) && (await publicationReadiness(p)).ready, estimateMicro: aiPostProbableMicro(), pct: budgetPctOf(p.userId, aiPostProbableMicro(), p.id) });
  if(b.action==="campaign_quote") {const readiness=await publicationReadiness(p);return ok({...campaignEstimate(p,b),...readiness,ai:aiActiveFor(p.userId,p.id)&&readiness.ready});}
  if (!p.brand) throw new HttpError(409, L("La marque n'est pas encore créée.", "The brand has not been created yet."));
  if (b.action === "ai_create") {
    const readiness=await publicationReadiness(p);
    if (!readiness.ready) throw new HttpError(409,readiness.reason!);
    // Publicité entièrement conçue par l'IA d'images (Qwen) : jamais sans IA active ni prix accepté.
    if (!aiActiveFor(p.userId, p.id)) throw new HttpError(402, L("L'IA n'est pas active pour ce projet (forfait Découverte, budget IA épuisé ou fournisseur désactivé).", "AI isn't active for this project (Discovery plan, AI budget used up or provider disabled)."));
    const quote = aiPostProbableMicro();
    if (b.approvedEstimateMicro == null || b.approvedEstimateMicro < quote) throw new HttpError(409, L("Prix à accepter avant de lancer (il a pu changer) : vérifiez-le puis relancez.", "Price to accept before starting (it may have changed): check it and start again."));
    const subject = b.subject ? resolveSubject(p, b.subject) : null;
    if (b.subject && (!subject || subject.kind !== b.subject.kind || subject.key !== (b.subject.kind === "service" ? b.subject.name.trim() : b.subject.key))) throw new HttpError(400, L("Produit ou service introuvable dans ce projet.", "Product or service not found in this project."));
    const job = enqueue({ userId: user.id, projectId: p.id, type: "image.ai_post", idempotencyKey:b.operationId?`ad-create:${p.id}:${b.operationId}:${stableHash("ad-intent",{subject:b.subject,request:b.request,aspect:b.aspect})}`:undefined, label: L("Publicité conçue par l'IA", "Ad designed by AI"), payload: { projectId: p.id, costCapMicro: aiPostCapMicro(), request: { entryPoint:"ads-guided", as: "ad", kind: "ad", format: b.aspect ?? "4:5", subject: b.subject, request: b.request?.trim() || undefined } } });
    return ok({ jobId: job.id, estimateMicro: quote });
  }
  const campaignPrice=campaignEstimate(p,b);
  if(!aiActiveFor(p.userId,p.id))throw new HttpError(402,L("L’IA n’est pas active : aucune campagne créée par un gabarit.","AI is inactive: no template campaign created instead."));
  const readiness=await publicationReadiness(p);
  if(!readiness.ready)throw new HttpError(409,readiness.reason!);
  if(b.approvedEstimateMicro==null || b.approvedEstimateMicro<campaignPrice.estimateMicro)throw new HttpError(409,L("Vérifiez et acceptez le devis de cette campagne avant de lancer.","Review and accept this campaign quote before starting."));
  if (one("SELECT 1 FROM jobs WHERE project_id = ? AND type = 'ads.v2' AND status IN ('queued','running','paused')", p.id)) throw new HttpError(409, L("Des publicités sont déjà en préparation.", "Ads are already being prepared."));
  const job = enqueue({ userId: user.id, projectId: p.id, type: "ads.v2", idempotencyKey:b.operationId?`campaign-create:${p.id}:${b.operationId}:${stableHash("campaign-intent",{count:b.count,platforms:b.platforms,aspects:b.aspects,offer:b.offer,audience:b.audience,objective:b.objective})}`:undefined, label: L("Publicités : angles, textes et créations", "Ads: angles, copy and creatives"), payload: { projectId: p.id, costCapMicro:campaignPrice.capMicro, request: { count: b.count, platforms: b.platforms, objective: b.objective, audience: b.audience, offer: b.offer, aspects: b.aspects } } });
  return ok({ jobId: job.id, ...view(p.id) });
  },["ai_create", "generate"]);
});
