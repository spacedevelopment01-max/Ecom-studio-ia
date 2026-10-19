import {assertCanSpend} from "@/lib/billing";
import {applyWordingDeep,loadWordingRules} from "@/lib/client-wording";
import crypto from "node:crypto";
import {latestVideo} from "@/lib/video-v2/store";
import { z } from "zod";
import { getAsset,assetMeta } from "@/lib/library";
import { hasUncertainVideoReceipt } from "@/lib/video-v2/receipts";
import { sceneChainQuote } from "@/lib/video-v2/chain-quote";
import { saveGuidedScenario,savedGuidedScenarios,approveVideoScenario,readVideoApproval,sceneApprovalRequest,guidedRunKey,videoScope } from "@/lib/video-v2/approval";
import { localScenePlan,ScenePlanSchema,type ScenePlan } from "@/lib/video-v2/three-scenes";
import { VideoEditorialSchema } from "@/lib/video-v2/editorial";
import { HttpError } from "@/lib/auth";
import { body, handle, ok } from "@/lib/http";
import { all, json, one } from "@/lib/db";
import { enqueue } from "@/lib/jobs";
import { L } from "@/lib/i18n-server";
import { aiActiveFor } from "@/lib/ai/access";
import { projectRights, requirePlan } from "@/lib/plan-gates";
import { aiPostProbableMicro, estimateMicro } from "@/lib/ai/estimate";
import { budgetPctOf } from "@/lib/ai/budget-pct";
import { aiPostMaxMicro, wanClipMaxMicro } from "@/lib/ai/media-providers";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { resolveSubject, subjectOptions } from "@/lib/creative-subject";
import { quoteScenes, SCENE_LIMITS, type ThreeScenesRequest } from "@/lib/video-v2/three-scenes";
import { loadCreativeMemory } from "@/lib/video-v2/creative-memory";
import { voiceAvailable } from "@/lib/video-v2/voice";
import type { Project } from "@/lib/projects";

export const runtime = "nodejs";

const Subject = z.discriminatedUnion("kind", [z.object({ kind: z.literal("product"), key: z.string().min(1).max(80) }), z.object({ kind: z.literal("service"), name: z.string().min(1).max(120) })]);
const Req = z.object({
  mode:z.enum(["ai","stock"]).optional(),
  generation:z.enum(["direct","reference","staged"]).default("direct"),
  purpose:z.literal("site").optional(),initialSlot:z.string().max(100).optional(),
  sceneImages:z.array(z.object({assetId:z.string().max(80),use:z.enum(["reuse","reference"])}).nullable()).max(6).optional(),
  as: z.enum(["post", "ad"]),
  subject: Subject.optional(),
  editorial:VideoEditorialSchema.optional(),
  request: z.string().max(12000).optional(),
  aspect: z.enum(["9:16", "16:9", "1:1", "4:5"]).default("9:16"),
  scenes: z.number().int().min(SCENE_LIMITS.scenes[0]).max(SCENE_LIMITS.scenes[1]).default(3),
  totalS: z.number().int().min(SCENE_LIMITS.totalS[0]).max(SCENE_LIMITS.totalS[1]).default(15),
  music: z.boolean().default(true),
});

/**
 * Devis au COÛT PROBABLE (une image et un plan par scène, un essai), montré en % du budget IA du mois ; `capMicro` :
 * plafond de la tâche (coûts maximaux, reprises comprises), jamais montré comme prix.
 */
const quote = (p:Project,r:ThreeScenesRequest) => {const q=sceneChainQuote(p,r);return {...q,pct:budgetPctOf(p.userId,q.estimateMicro,p.id)};};

/** Vidéos en scènes déjà faites (création guidée et création du projet), avec leur sujet et leur demande. */
function list(projectId: string) {
  const seen = new Set<string>();
  return all<{ id: string; meta: string; created_at: number }>("SELECT id, meta, created_at FROM assets WHERE project_id = ? AND role = 'video' AND deleted_at IS NULL AND json_extract(meta, '$.scenes') IS NOT NULL ORDER BY created_at DESC LIMIT 40", projectId).map((r) => {
    const m = json<any>(r.meta, {});
    // Un MP4 rendu n'est pas une création validée : conserver les limites du worker jusque dans la carte client.
    const notes = Array.isArray(m.creative?.notes) ? m.creative.notes.filter((s: unknown) => typeof s === "string") : [];
    const unchecked = Array.isArray(m.finalCheck?.summary?.unchecked) ? m.finalCheck.summary.unchecked.filter((s: unknown) => typeof s === "string") : [];
    const issues = Array.isArray(m.finalCheck?.summary?.issues) ? m.finalCheck.summary.issues.map((i: any) => String(i.detail || i.label || "")) : [];
    const warnings = [...notes, ...issues, ...unchecked.map((s: string) => L(`Non vérifié : ${s}`, `Not checked: ${s}`))];
    if (!m.finalCheck?.summary) warnings.push(L("Contrôle du fichier final indisponible : résultat à vérifier.", "Final file check unavailable: review this result."));
    return { id: r.id, url: `/api/files/${r.id}`, docKey: m.videoV2?.docKey ?? null, aspect: m.format ?? null, durationS: m.videoV2?.durationS ?? null, purpose:m.scenes?.purpose,initialSlot:m.scenes?.initialSlot,as: m.scenes?.as ?? "post", mode: m.scenes?.mode ?? null, subject: m.scenes?.subject?.name ?? null, request: m.scenes?.request ?? null, music: m.scenes?.music !== false, reviewRequired: true, warnings: [...new Set(warnings)], at: r.created_at };
  }).filter((v) => !v.docKey || (!seen.has(v.docKey) && !!seen.add(v.docKey))); // dernier rendu de chaque vidéo seulement
}

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const scenarios=all<{id:string;result:string;payload:string}>("SELECT id,result,payload FROM jobs WHERE project_id=? AND type='video.scenario' AND status='done' ORDER BY created_at DESC LIMIT 4",p.id).flatMap(j=>{
    const payload=json<{request:ThreeScenesRequest}>(j.payload,{} as never),result=json<{scope:string;scenario:ScenePlan}>(j.result,{} as never);
    if(!result.scenario || result.scope!==videoScope(p,sceneApprovalRequest(payload.request))) return [];
    const q=quote(p,payload.request),spent=one<{cost:number}>("SELECT COALESCE(SUM(cost),0) cost FROM ai_calls WHERE job_id=?",j.id)?.cost??0;
    const signed=approveVideoScenario(p,sceneApprovalRequest(payload.request),result.scenario,Math.max(0,q.capMicro-spent),{quoteTotalMicro:q.capMicro,retakeMicro:q.oneSceneRetakeMicro,scenarioJobId:j.id});
    return [{...q,request:payload.request,scenarioJobId:j.id as string|undefined,scenario:result.scenario,approvalToken:signed.token}];
  });
  for(const saved of savedGuidedScenarios(p)){const q=quote(p,saved.request);const signed=approveVideoScenario(p,sceneApprovalRequest(saved.request),saved.scenario,q.capMicro,{quoteTotalMicro:q.capMicro,retakeMicro:q.oneSceneRetakeMicro,scenarioJobId:saved.scenarioJobId});scenarios.unshift({...q,request:saved.request,scenarioJobId:saved.scenarioJobId,scenario:saved.scenario,approvalToken:signed.token});}
  return ok({ scenarios,drafts:all<{id:string;error:string;payload:string;created_at:number}>("SELECT id,error,payload,created_at FROM jobs WHERE project_id=? AND type='video.scenes' AND status='failed' ORDER BY created_at DESC LIMIT 4",p.id).map(j=>{const r=json<{request:ThreeScenesRequest}>(j.payload,{} as never).request;const key=r?guidedRunKey(p,r):null;const docKey=key?`vid:${crypto.createHash("sha256").update(key).digest("hex").slice(0,20)}`:null;const saved=docKey?latestVideo(p.id,docKey):null;if(saved?.version.renderedAssetId && saved.version.createdAt>=j.created_at)return null;return {docKey:saved?docKey:null,id:j.id,error:j.error,purpose:r?.purpose,initialSlot:r?.initialSlot,generation:r?.generation,scenes:r?.scenes??3,as:r?.as??"ad",used:!!r?.repair || !!one("SELECT 1 FROM jobs WHERE project_id=? AND json_extract(payload,'$.request.repair.rootJobId')=?",p.id,j.id),retakeMicro:r?quote(p,r).oneSceneRetakeMicro:0};}).filter(d=>d!==null).filter((d,i,a)=>!d.docKey||a.findIndex(other=>other.docKey===d.docKey)===i), voiceAvailable:voiceAvailable(),voice:loadCreativeMemory(p.id,p).preferences, videos: list(p.id), ai: aiActiveFor(p.userId, p.id), limits: SCENE_LIMITS, subjects: subjectOptions(p).map((x) => ({ kind: x.kind, key: x.key, name: x.name, hasPhoto: !!x.referenceAssetId, photoId: x.referenceAssetId })) });
});

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const b = await body(req, z.discriminatedUnion("action", [z.object({action:z.literal("refine"),draftPlan:ScenePlanSchema,instruction:z.string().min(1).max(1000),...Req.shape}),z.object({action:z.literal("repair"),jobId:z.string().max(80),index:z.number().int().min(0).max(5),kind:z.enum(["image","clip"]),instruction:z.string().max(1000).optional()}),z.object({action:z.literal("plan"),scenarioJobId:z.string().max(80).optional(),approvedScriptMicro:z.number().int().min(0).optional(),draftPlan:ScenePlanSchema.optional(),...Req.shape}),z.object({ action: z.literal("quote"), ...Req.shape }), z.object({ action: z.literal("create"), ...Req.shape, approvalToken:z.string().max(100000).optional(), approvedEstimateMicro: z.number().int().min(0).nullable().optional() })]));
  if(b.action === "repair") {
    requirePlan(user,p.id);
    const source=one<{id:string;payload:string;status:string}>("SELECT id,payload,status FROM jobs WHERE id=? AND project_id=? AND type='video.scenes'",b.jobId,p.id);
    if(!source || source.status!=="failed") throw new HttpError(409,"Choisissez une vidéo incomplète à reprendre.");
    const original=json<{request:ThreeScenesRequest}>(source.payload,{} as never).request;
    if(!original?.approval || original.repair || original.approval.scope!==videoScope(p,sceneApprovalRequest(original))) throw new HttpError(409,"Le contexte a changé ou la reprise a déjà été utilisée : nouveau scénario requis.");
    if(b.index>=(original.scenes??3)) throw new HttpError(400,"Scène inconnue.");
    if(one("SELECT 1 FROM jobs WHERE project_id=? AND json_extract(payload,'$.request.repair.rootJobId')=?",p.id,source.id)) throw new HttpError(409,"Une seule reprise ciblée autorisée dans ce devis.");
    const key=guidedRunKey(p,original);
    if(hasUncertainVideoReceipt(p.id,key)) throw new HttpError(409,"Résultat fournisseur incertain : rapprochement requis avant toute reprise payante.");
    const quoteNow=quote(p,original);
    if(!quoteNow.allowed) throw new HttpError(402,quoteNow.reason??"Vidéo indisponible.");
    const spent=one<{cost:number}>("SELECT COALESCE(SUM(cost),0) cost FROM ai_calls WHERE job_id=?",source.id)?.cost??0;
    const cap=Math.max(0,original.approval.capMicro-spent);
    const scenario=structuredClone(original.approval.scenario);
    if(b.instruction) scenario.scenes[b.index].still+=` Correction ciblée : ${b.instruction}`;
    const request:ThreeScenesRequest={...original,key,approval:{...original.approval,scenario},repair:{rootJobId:source.id,index:b.index,kind:b.kind,instruction:b.instruction}};
    const job=enqueue({userId:user.id,projectId:p.id,type:"video.scenes",label:L("Reprise d’une seule scène","Single-scene repair"),payload:{projectId:p.id,costCapMicro:cap,request}});
    return ok({jobId:job.id,capMicro:cap,retakeMicro:quoteNow.oneSceneRetakeMicro});
  }
  if(b.action==="refine"){const {refineScenePlan}=await import("@/lib/video-v2/scenario-refinement");return ok({scenario:refineScenePlan(p,b.draftPlan,b.instruction)});}
  const subject = b.subject ? resolveSubject(p, b.subject) : null;
  if (b.subject && (!subject || subject.kind !== b.subject.kind || subject.key !== (b.subject.kind === "service" ? b.subject.name.trim() : b.subject.key))) throw new HttpError(400, L("Produit ou service introuvable dans ce projet.", "Product or service not found in this project."));

  if(b.generation==="direct"&&b.sceneImages?.some(Boolean))throw new HttpError(400,"Choisissez le mode référence pour transmettre une photo, ou retirez cette sélection du mode direct.");
  for(const image of b.sceneImages??[]) {if(!image)continue;const a=getAsset(image.assetId);if(!a||a.project_id!==p.id||a.deleted_at||a.kind!=="image"||assetMeta<any>(a).gate?.fatal)throw new HttpError(400,"Référence image indisponible dans ce projet.");}
  const r: ThreeScenesRequest = {mode:b.mode,generation:b.generation,purpose:b.purpose,initialSlot:b.initialSlot, sceneImages:b.sceneImages,editorial:b.editorial, as: b.as, subject: b.subject ?? null, request: b.request?.trim() || null, aspect: b.aspect, scenes: b.scenes, totalS: b.totalS, music: b.music };
  if(r.purpose==="site"){
    const {stateOf}=await import("@/lib/preparation/store");const state=stateOf(p.id);
    if(state?.stages.brand?.status!=="approved")throw new HttpError(409,"Validez l’identité du projet avant sa proposition vidéo.");
    r.initialExistingAssetId=state.stages.media?.data.slots.find(s=>s.key===r.initialSlot)?.assetId??null;
    if(!r.initialSlot||!state.stages.media?.data.slots.some(s=>s.key===r.initialSlot&&s.kind==="video"))throw new HttpError(400,"Emplacement vidéo initial inconnu ; aucun livrable ajouté.");
  }
  const q = quote(p, r);
  if (b.action === "quote") return ok({...q,suggestedScenario:r.purpose==="site"?localScenePlan(p,resolveSubject(p,r.subject??null),r):undefined});
  if(b.action === "plan") {
    if(q.scriptMicro>0 && !b.draftPlan) {
      requirePlan(user,p.id);
      if((b.approvedScriptMicro??-1)<q.scriptMicro) throw new HttpError(409,"Acceptez le coût de rédaction du scénario avant l’appel texte. Aucune image ni clip ne sera lancé.");
      if(one("SELECT 1 FROM jobs WHERE project_id=? AND type='video.scenario' AND status IN ('queued','running','paused')",p.id)) throw new HttpError(409,"Un scénario est déjà en préparation.");
      assertCanSpend(user.id,q.scriptMicro,p.id);
      const job=enqueue({userId:user.id,projectId:p.id,type:"video.scenario",label:L("Scénario vidéo à vérifier","Video scenario to review"),payload:{projectId:p.id,request:r,costCapMicro:q.scriptMicro}});
      return ok({...q,scenarioJobId:job.id});
    }
    const scenario=applyWordingDeep(b.draftPlan??localScenePlan(p,resolveSubject(p,r.subject??null),r),loadWordingRules(p.id));if(scenario.scenes.length!==r.scenes) throw new HttpError(400,"Le scénario doit conserver le nombre de scènes demandé.");let spent=0;
    if(b.scenarioJobId){const prior=one<{result:string;payload:string}>("SELECT result,payload FROM jobs WHERE id=? AND project_id=? AND type='video.scenario' AND status='done'",b.scenarioJobId,p.id);const previousRequest=prior?json<{request:ThreeScenesRequest}>(prior.payload,{} as never).request:null;if(!prior || !previousRequest || json<{scope:string}>(prior.result,{} as never).scope!==videoScope(p,sceneApprovalRequest({...r,sceneImages:previousRequest.sceneImages}))) throw new HttpError(409,"Scénario précédent hors de ce contexte.");spent=one<{cost:number}>("SELECT COALESCE(SUM(cost),0) cost FROM ai_calls WHERE job_id=?",b.scenarioJobId)?.cost??0;}
    saveGuidedScenario(p,r,scenario,b.scenarioJobId);
    const approved=approveVideoScenario(p,sceneApprovalRequest(r),scenario,Math.max(0,q.capMicro-spent),{quoteTotalMicro:q.capMicro,retakeMicro:q.oneSceneRetakeMicro,scenarioJobId:b.scenarioJobId});return ok({...q,scenario,scenarioJobId:b.scenarioJobId,approvalToken:approved.token});}
  // Le montage gratuit ne dispense pas du forfait actif nécessaire à toute création.
  requirePlan(user, p.id);
  if (!p.brand) throw new HttpError(409, L("La marque n'est pas encore créée.", "The brand has not been created yet."));
  if (!q.allowed) throw new HttpError(402, q.reason ?? L("Vidéo impossible pour ce projet.", "Video not possible for this project."));
  if (q.estimateMicro > 0 && (b.approvedEstimateMicro == null || b.approvedEstimateMicro < q.estimateMicro)) throw new HttpError(409, L("Prix à accepter avant de lancer (il a pu changer) : vérifiez-le puis relancez.", "Price to accept before starting (it may have changed): check it and start again."));
  const approval=readVideoApproval<ScenePlan>(p,sceneApprovalRequest(r),b.approvalToken);
  if((approval.quoteTotalMicro??approval.capMicro)!==q.capMicro) throw new HttpError(409,"Devis modifié : préparez à nouveau le scénario.");
  if (one("SELECT 1 FROM jobs WHERE project_id = ? AND type = 'video.scenes' AND status IN ('queued','running','paused')", p.id)) throw new HttpError(409, L("Une vidéo est déjà en préparation.", "A video is already being prepared."));
  const docKey=`vid:${crypto.createHash("sha256").update(guidedRunKey(p,{...r,approval})).digest("hex").slice(0,20)}`;
  const existing=latestVideo(p.id,docKey);if(existing?.version.renderedAssetId)return ok({...q,reused:true,docKey,videoAssetId:existing.version.renderedAssetId});
  assertCanSpend(user.id,approval.capMicro,p.id);
  const job = enqueue({ userId: user.id, projectId: p.id, type: "video.scenes", label: b.as === "ad" ? L("Publicité vidéo", "Video ad") : L("Publication vidéo", "Video post"), payload: { projectId: p.id, costCapMicro: approval.capMicro, request: { ...r, mode: q.mode,approval } } });
  return ok({ jobId: job.id, ...q });
});
