import { z } from "zod";
import { body,handle,ok } from "@/lib/http";
import { HttpError } from "@/lib/auth";
import { projectFromCtx,type Ctx } from "@/lib/route-helpers";
import { getJob,retryJob } from "@/lib/jobs";
import { json,run,tx } from "@/lib/db";
import { L } from "@/lib/i18n-server";
import { CopyTextsSchema,jobCopyReview,acquiredCorrection,correctionRevision,saveCopyCorrection } from "@/lib/social-v2/publication-copy-recovery";
import { projectForSubject,publicationReadiness } from "@/lib/social-v2/ai-post";
import { resolveSubject } from "@/lib/creative-subject";
import { aiPostProbableMicro } from "@/lib/ai/estimate";
import { aiActiveFor } from "@/lib/ai/access";
import { requireCreationPlan } from "@/lib/plan-gates";

async function scope(ctx:Ctx,jid:string) {
  const {user,project}=await projectFromCtx(ctx),job=getJob(jid);
  if(!job||job.project_id!==project.id||job.user_id!==project.userId)throw new HttpError(404,L("Tâche introuvable.","Task not found."));
  const request=json<any>(job.payload,{}).request??{};
  const subject=request.subject?resolveSubject(project,request.subject):null;
  if(request.subject&&!subject)throw new HttpError(409,L("Le produit ou service a changé : choisissez le sujet avant de reprendre.","The product or service changed: choose the subject before resuming."),"SUBJECT_NOT_FOUND");
  return {user,project,selected:projectForSubject(project,subject),job};
}
export const GET=handle(async(req:Request,ctx:Ctx)=>{
  const {job,selected}=await scope(ctx,new URL(req.url).searchParams.get("jobId")??"");
  const review=jobCopyReview(job,selected);
  return ok({available:!!review,review:review?{...review,correctionVersion:correctionRevision(selected.id,review.key),edits:acquiredCorrection(selected.id,review.key,review.original)??review.proposal}:null});
});
export const POST=handle(async(req:Request,ctx:Ctx)=>{
  const b=await body(req,z.object({jobId:z.string().min(1).max(100),version:z.string().min(8).max(100),correctionVersion:z.string().min(8).max(100).nullable().optional(),action:z.enum(["save","resume"]),edits:CopyTextsSchema,approvedEstimateMicro:z.number().int().min(0).optional()}));
  const {user,project,selected,job}=await scope(ctx,b.jobId);
  const review=jobCopyReview(job,selected);
  if(!review||review.version!==b.version)throw new HttpError(409,L("Cette rédaction a changé : rechargez ses passages avant de corriger.","This copy changed: reload its passages before correcting."),"COPY_REVIEW_STALE");
  // Saving is free and remains available with exhausted AI budget. Resume requires the actual rights/quote.
  if(b.action==="resume") {
    requireCreationPlan(user,project.id,"images");
    if(!aiActiveFor(project.userId,project.id))throw new HttpError(402,L("L’IA n’est pas active pour reprendre l’image. La correction gratuite et les étapes acquises sont conservées.","AI is inactive for resuming the image. Free correction and acquired steps are kept."),"AI_UNAVAILABLE");
    const readiness=await publicationReadiness(selected);
    if(!readiness.ready)throw new HttpError(409,readiness.reason!,"IMAGE_ENGINE_UNAVAILABLE");
    if(b.approvedEstimateMicro==null||b.approvedEstimateMicro<aiPostProbableMicro())throw new HttpError(409,L("Acceptez le devis actuel avant de reprendre l’image. Le plafond de la tâche reste inchangé.","Accept the current quote before resuming the image. The task cap stays unchanged."),"QUOTE_REQUIRED");
  }
  return tx(()=>{
    const latest=getJob(job.id)!;
    if(latest.status!=="failed")throw new HttpError(409,L("La tâche a changé : rechargez son suivi.","The task changed: reload its status."),"COPY_REVIEW_STALE");
    let saved:ReturnType<typeof saveCopyCorrection>;
    try{saved=saveCopyCorrection(latest,selected,b.version,b.edits,b.correctionVersion??null);}catch(e){if(e instanceof Error&&["COPY_REVIEW_STALE","ACQUIRED_COPY_UNAVAILABLE","COPY_CORRECTION_CONFLICT"].includes(e.message))throw new HttpError(409,L("La rédaction ou sa correction a changé dans une autre fenêtre. Aucun changement écrasé ni nouvel appel lancé ; rechargez les passages.","Copy or its correction changed in another window. No change overwritten and no new call started; reload the passages."),e.message);throw e;}
    if(!saved.saved)return ok({...saved,code:"COPY_FACTS_REJECTED",error:L("Ces passages contiennent encore une assertion non confirmée : retirez-la ou confirmez d’abord ses faits dans le projet. Aucune génération lancée.","These passages still contain an unconfirmed assertion: remove it or first confirm its facts in the project. No generation started.")},{status:422});
    if(b.action==="resume") {
      const payload=json<any>(latest.payload,{}),checkpoint=json<any>(latest.checkpoint,{});
      checkpoint["ai-post:before-copy-correction"]=checkpoint["ai-post"]??null;
      delete checkpoint["ai-post"]; // Only the failed wrapper is reopened; paid copy/stage receipts are kept.
      run("UPDATE jobs SET payload=?,checkpoint=? WHERE id=?",JSON.stringify({...payload,request:{...payload.request,expectedCopyKey:review.key}}),JSON.stringify(checkpoint),job.id);
      retryJob(job.id);
    }
    return ok({saved:true,jobId:job.id,resumed:b.action==="resume",code:b.action==="resume"?"IMAGE_RESUME_REQUESTED":"COPY_CORRECTION_SAVED",providerCalls:0});
  });
});
