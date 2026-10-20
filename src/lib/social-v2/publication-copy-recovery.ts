/** Local, explicit correction of acquired copy. No provider, queue or billing operation in this module. */
import { z } from "zod";
import { one, run, id, now, json } from "../db";
import { stableHash } from "../brain/hash";
import type { Job } from "../jobs";
import type { Project } from "../projects";
import { publicationCopyIssues, type CopyIssue } from "./publication-copy-policy";

export const CopyTextsSchema=z.object({headline:z.string().trim().min(2).max(120),subline:z.string().trim().max(200),cta:z.string().trim().max(40)});
export type CopyTexts=z.infer<typeof CopyTextsSchema>;
export type CopyReview={key:string;version:string;original:CopyTexts;proposal:CopyTexts;issues:CopyIssue[]};
const correctionKey=(key:string)=>`publication.copy-correction.${key}`;
const three=(x:CopyTexts):CopyTexts=>({headline:x.headline,subline:x.subline,cta:x.cta});
export const copyVersion=(key:string,texts:CopyTexts)=>stableHash("copy-review-1",{key,texts:three(texts)});
export function makeCopyReview(key:string,original:CopyTexts,issues:CopyIssue[],p:Project):CopyReview {
  const fields=new Set(issues.map(x=>x.field));
  const name=p.product.name||p.brand?.name||"";
  return {key,version:copyVersion(key,original),original:three(original),issues,proposal:{
    headline:fields.has("headline")?(name.length<=120?name:""):original.headline,
    subline:fields.has("subline")?"":original.subline,cta:fields.has("cta")?"":original.cta,
  }};
}
export function acquiredCorrection(projectId:string,key:string,original:CopyTexts):CopyTexts|null {
  const row=one<{value:string}>("SELECT value FROM memory WHERE project_id=? AND key=? ORDER BY rowid DESC LIMIT 1",projectId,correctionKey(key));
  const value=json<{version?:string;edits?:unknown}>(row?.value,{});
  if(!value||value.version!==copyVersion(key,original))return null;
  const parsed=CopyTextsSchema.safeParse(value.edits);return parsed.success?parsed.data:null;
}
export function correctionRevision(projectId:string,key:string):string|null {
  const row=one<{value:string}>("SELECT value FROM memory WHERE project_id=? AND key=? ORDER BY rowid DESC LIMIT 1",projectId,correctionKey(key));
  return row?stableHash("copy-correction-1",row.value):null;
}
export function jobCopyReview(job:Job,p?:Project):CopyReview|null {
  if(job.type!=="image.ai_post"||job.status!=="failed")return null;
  const r=json<Record<string,any>>(job.checkpoint,{} )["ai-post"]?.copyReview;
  if(!r && p && /Rédaction IA non conforme aux faits confirmés/i.test(job.error??"")) {
    // Older failures: reuse the exact, project/job-scoped text receipt; no error text or provider needed.
    const calls=one<{usage_key:string}>("SELECT usage_key FROM ai_calls WHERE project_id=? AND job_id=? AND user_id=? AND status='ok' AND usage_key LIKE ? ORDER BY created_at DESC,rowid DESC LIMIT 1",p.id,job.id,job.user_id,`ai-post:${p.id}:%:copy`);
    if(!calls)return null;
    const receipt=one<{value:string}>("SELECT value FROM memory WHERE project_id=? AND key=? ORDER BY rowid DESC LIMIT 1",p.id,`publication.stage.${calls.usage_key}`);
    const value=json<any>(receipt?.value,{}),original=CopyTextsSchema.safeParse(value.value);
    if(value.state!=="done"||!original.success)return null;
    const request=json<any>(job.payload,{}).request??{};
    const issues=publicationCopyIssues(p,original.data,request.request??"",[request.headline,request.subline,request.cta].filter((x):x is string=>typeof x==="string"));
    // If the new policy accepts it, still require explicit confirmation of the acquired texts before resuming.
    return makeCopyReview(calls.usage_key,original.data,issues,p);
  }
  if(!r||typeof r.key!=="string"||!r.key.startsWith(`ai-post:${job.project_id}:`)||!r.key.endsWith(":copy")||!CopyTextsSchema.safeParse(r.original).success||r.version!==copyVersion(r.key,r.original))return null;
  return r;
}
export function saveCopyCorrection(job:Job,p:Project,version:string,input:unknown,expectedCorrectionVersion:string|null=null) {
  const review=jobCopyReview(job,p);
  if(!review||review.version!==version)throw new Error("COPY_REVIEW_STALE");
  const receipt=one<{value:string}>("SELECT value FROM memory WHERE project_id=? AND key=? ORDER BY rowid DESC LIMIT 1",p.id,`publication.stage.${review.key}`);
  const stored=json<{state?:string;value?:CopyTexts}>(receipt?.value,{});
  if(stored.state!=="done"||!stored.value||copyVersion(review.key,stored.value)!==version)throw new Error("ACQUIRED_COPY_UNAVAILABLE");
  const edits=CopyTextsSchema.parse(input),request=json<any>(job.payload,{}).request??{};
  const issues=publicationCopyIssues(p,edits,request.request??"",Object.values(edits));
  if(issues.length)return {saved:false as const,issues};
  const key=correctionKey(review.key),record={version,edits};
  const row=one<{id:string;value:string}>("SELECT id,value FROM memory WHERE project_id=? AND key=? ORDER BY rowid DESC LIMIT 1",p.id,key);
  if(row&&stableHash("copy-correction-1",row.value)!==expectedCorrectionVersion && JSON.stringify(json<any>(row.value,{}).edits)!==JSON.stringify(edits))throw new Error("COPY_CORRECTION_CONFLICT");
  // Preserve the original paid receipt, scene, concept and strategy. Only the explicit correction is stored.
  if(row)run("UPDATE memory SET value=?,updated_at=? WHERE id=?",JSON.stringify(record),now(),row.id);
  else run("INSERT INTO memory(id,project_id,kind,key,value,status,source,scope,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)",id(),p.id,"artifact",key,JSON.stringify(record),"confirmed","user","publication-receipts",now(),now());
  return {saved:true as const,issues:[]};
}
