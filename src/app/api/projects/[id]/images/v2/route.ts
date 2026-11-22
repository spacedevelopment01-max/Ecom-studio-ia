import { strategyVisibilitySql } from "@/lib/marketing-strategy/visibility";
import { checkedPlacementRequest } from "@/lib/theme/placement-request";
import { z } from "zod";
import { HttpError } from "@/lib/auth";
import { body, handle, ok } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { all, json, one, run } from "@/lib/db";
import { remember } from "@/lib/projects";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { L } from "@/lib/i18n-server";
import { requireCreationPlan } from "@/lib/plan-gates";
import { visualIntent } from "@/lib/image-v2/intent";
import { ART_DIRECTIONS, VISUAL_KINDS } from "@/lib/image-v2/types";
import { DIRECTIONS } from "@/lib/image-v2/direction";
import { stableHash } from "@/lib/brain/hash";
import {NativeImageRequestSchema} from '@/lib/image-v2/native-approval';

import { devisRetouche, devisScene, lancerRetouche, lancerScene, requeteRetouche, requeteScene } from '@/lib/atelier/coeur';

export const runtime = "nodejs";

/** Images V2 du projet : verdict, note, origine, licence, brief résumé (aucune consigne de génération). */
function view(projectId: string) {
  const rows = all<{ id: string; role: string; status: string; meta: string; created_at: number }>(
    `SELECT id, role, status, meta, created_at FROM assets WHERE project_id = ? AND ${strategyVisibilitySql(projectId,"asset","assets.id")} AND deleted_at IS NULL AND json_extract(meta, '$.imageV2') IS NOT NULL ORDER BY created_at DESC LIMIT 60`,
    projectId,
  );
  return {
    images: rows.map((r) => {
      const m = json<any>(r.meta, {});
      const v = m.imageV2 ?? {};
      return {
        id: r.id,
        url: `/api/files/${r.id}`,
        role: r.role,
        status: r.status,
        verdict: m.gate?.verdict ?? null,
        score: typeof m.gate?.score === "number" ? Math.round(m.gate.score * 10) / 10 : null,
        reason: m.gate?.reason ?? "",
        origin: v.origin,
        provider: v.provider,
        brief: v.brief,
        license: v.license ? { name: v.license.name, url: v.license.url, verifiedBy: v.license.verifiedBy, restrictions: v.license.restrictions } : null,
        credit: m.recipe ?? null,
        corrections: v.corrections ?? [],
        at: r.created_at,
      };
    }),
  };
}

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  return ok(view(p.id));
});

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const b = await body(req, z.object({ operationId:z.string().min(8).max(100).optional(), action: z.enum(["quote", "generate", "quote_edit", "edit", "reject", "reject_direction"]), confirmation:z.boolean().optional(),approvalToken:z.string().max(1000000).optional(),assetId: z.string().max(40).optional(), instruction: z.string().max(400).optional(), geste: z.enum(["fond", "retirer", "story", "carre", "lot"]).optional(), outil: z.string().max(80).optional(), mode: z.enum(["sina", "ensemble", "moi"]).optional(), direction: z.enum(ART_DIRECTIONS).optional(), request: NativeImageRequestSchema.optional() }));
  if (b.action === "reject") {
    // Image refusée par le client : jamais réutilisée automatiquement (statut refusé, choix humain mémorisé).
    const a = one<{ meta: string }>("SELECT meta FROM assets WHERE id = ? AND project_id = ? AND json_extract(meta, '$.imageV2') IS NOT NULL", b.assetId ?? "", p.id);
    if (!a) throw new HttpError(404, L("Image introuvable.", "Image not found."));
    run("UPDATE assets SET status = 'rejected', meta = json_set(meta, '$.userRejected', 1) WHERE id = ?", b.assetId!);
    return ok(view(p.id));
  }
  if (b.action === "reject_direction") {
    if (!b.direction) throw new HttpError(400, L("Direction manquante.", "Missing direction."));
    // Direction artistique écartée : ne sera plus choisie pour ce projet.
    remember(p.id, { kind: "rejection", key: `image:${b.direction}`, value: DIRECTIONS[b.direction].label, source: "user", scope: "image" });
    return ok(view(p.id));
  }
  // Même droit que les autres créations d'images : un forfait de création est requis (aucun passe-droit).
  requireCreationPlan(user, p.id, "images");
  if (b.action === "edit" || b.action === "quote_edit") {
    // Retouche par l'IA d'une photo livrée (accord sur le coût demandé dans le studio avant l'appel). Le même cœur sert
    // l'écran de l'atelier et SINA dans sa conversation (`lib/atelier/coeur.ts`).
    const demande = { assetId: b.assetId ?? "", instruction: b.instruction, geste: b.geste, outil: b.outil, mode: b.mode };
    requeteRetouche(p.id, demande);
    if(!b.operationId)throw new HttpError(409,'Vérifiez et confirmez le devis exact avant retouche.','image_consent_required');
    if(b.action==='quote_edit')return ok(await devisRetouche(user,p.id,b.operationId,demande));
    if(b.confirmation!==true)throw new HttpError(409,'Confirmez le devis exact avant retouche.','image_consent_required');
    return ok(await lancerRetouche(user,p.id,b.operationId,demande,b.approvalToken));
  }
  const raw = b.request ?? {},r=requeteScene(raw);
  if(b.action==='quote'){
    if(!b.operationId)throw new HttpError(409,'Identifiant de demande nécessaire au devis.','image_consent_required');
    // Atelier (rapport 10, point 2) : conditions, modération gratuite et contrôle des personnes avant le devis.
    return ok(await devisScene(user,p.id,b.operationId,r));
  }
  if(r.allowGenerate!==false){
    if(!b.operationId||b.confirmation!==true)throw new HttpError(409,'Vérifiez et confirmez le devis exact avant génération.','image_consent_required');
    const lance=await lancerScene(user,p.id,b.operationId,r,b.approvalToken);
    return ok({jobId:lance.jobId,...view(p.id)});
  }
  const placement=r.themePlacement?await checkedPlacementRequest(p.id,r.themePlacement):null;
  if(placement&&placement.request.kind!=="image")throw new HttpError(400,L("Utilisez le parcours vidéo pour cet emplacement.","Use the video workflow for this placement."));
  // Images finales 100 % IA : une image demandée à l'IA n'est jamais remplacée par une photo libre de droits (aucune
  // bascule silencieuse). La recherche de photos libres reste possible seulement quand elle est demandée seule
  // (« Chercher des photos libres », allowGenerate: false).
  const intent = r.kind ? { kind: r.kind, support: r.support } : visualIntent(r.text ?? "", p.business);
  const job = enqueue({
    userId: user.id,
    projectId: p.id,
    type: "image.v2",
    idempotencyKey:b.operationId?`image-create:${b.operationId}:${stableHash("image-intent",r)}`:undefined,
    label: L("Images : direction artistique et sélection", "Images: art direction and selection"),
    payload: { projectId: p.id,aiOff:true,costCapMicro:0, request: { ...(placement?{instructions:placement.request.request,references:placement.request.referenceAssetIds,peopleAllowed:false,slot:`theme:${placement.request.role}:${placement.plan.contextHash}:${placement.request.key}`,themePlacement:r.themePlacement}:{}), kind: placement?(placement.request.role==="packshot"?"packshot":placement.request.role==="detail"?"product_image":p.business==="services"?"trade_photo":"usage_scene"):intent.kind, support: r.support ?? intent.support, aspect: r.aspect, count: r.count ?? 1, topic: r.topic ?? (r.kind ? null : r.text ?? null), allowGenerate: r.allowGenerate !== false, ...(r.allowGenerate !== false ? { noStock: true } : { bankSearch: { typed: r.topic?.trim() || null, broad: !!r.broad, silhouettes: !!r.silhouettes } }) } },
  });
  return ok({ jobId: job.id, ...view(p.id) });
});
