"use client";
import {useEffect,useRef,useState} from "react";
import {api,Button,Input,useApi,useToast} from "../ui";
import {useT} from "../i18n";
import {useBudgetPct} from "../billing-client";
import type {CopyReview,CopyTexts} from "@/lib/social-v2/publication-copy-recovery";
import {useProject,type JobView} from "./project-context";

export function CopyFailureHistory() {
  const {id,reload:reloadProject}=useProject();
  const {data,reload}=useApi<{jobs:JobView[]}>(`/api/projects/${id}/jobs?type=image.ai_post`,{poll:5000});
  const [estimate,setEstimate]=useState<number|null>(null);
  useEffect(()=>{let active=true;api<{estimateMicro:number}>(`/api/projects/${id}/campaigns/v2`,{body:{action:"ai_quote"}}).then(r=>{if(active)setEstimate(r.estimateMicro);}).catch(()=>{});return()=>{active=false;};},[id]);
  const failures=(data?.jobs??[]).filter(j=>j.status==="failed"&&(j.failureCode==="COPY_FACTS_REJECTED"||/Rédaction IA non conforme aux faits confirmés|AI copy inconsistent with confirmed facts/i.test(j.error??""))).slice(0,3);
  return <div data-copy-failure-history>{failures.map(j=><CopyCorrection key={j.id} projectId={id} jobId={j.id} quote={estimate} onResumed={()=>{void reload();void reloadProject();}}/>)}</div>;
}

/** The rejected passage and explicit free correction are recoverable after reload. No automatic generation. */
export function CopyCorrection({projectId,jobId,quote,onResumed}:{projectId:string;jobId:string;quote:number|null;onResumed:()=>void}) {
  const t=useT(),toast=useToast(),budget=useBudgetPct(),sending=useRef(false);
  const {data,reload}=useApi<{available:boolean;review:(CopyReview&{edits:CopyTexts;correctionVersion:string|null})|null}>(`/api/projects/${projectId}/images/copy-review?jobId=${encodeURIComponent(jobId)}`);
  const [edits,setEdits]=useState<CopyTexts|null>(null),[busy,setBusy]=useState(false),[saved,setSaved]=useState(false);
  useEffect(()=>{setEdits(data?.review?.edits??null);},[data]);
  useEffect(()=>{setSaved(false);},[jobId,data?.review?.version]);
  const labels={headline:t("Titre","Headline"),subline:t("Sous-ligne","Subline"),cta:t("Appel à l’action","Call to action")};
  const reasons={COMMERCIAL_NUMBER_UNCONFIRMED:t("Nombre commercial non confirmé pour ce sujet.","Commercial number not confirmed for this subject."),COMMERCIAL_NUMBER_NOT_REQUESTED:t("Nombre commercial confirmé, mais absent de cette demande.","Commercial number confirmed, but absent from this request."),CLAIM_EVIDENCE_REQUIRED:t("Promesse ou preuve à documenter avant utilisation.","Claim or evidence to document before use.")};
  const act=async(action:"save"|"resume")=>{
    if(!edits||!data?.review||sending.current)return;
    sending.current=true;setBusy(true);
    try {
      await api(`/api/projects/${projectId}/images/copy-review`,{body:{jobId,version:data.review.version,correctionVersion:data.review.correctionVersion,action,edits,approvedEstimateMicro:action==="resume"?quote:undefined}});
      if(action==="resume")onResumed();else{await reload();setSaved(true);}
      toast("ok",action==="save"?t("Correction enregistrée gratuitement. Aucune génération lancée.","Correction saved for free. No generation started."):t("Reprise demandée : la rédaction acquise sera réutilisée.","Resume requested: acquired copy will be reused."));
    }catch(e){toast("bad",(e as Error).message);}finally{sending.current=false;setBusy(false);}
  };
  if(!data?.available||!data.review||!edits)return null;
  const review=data.review;
  return <div className="mt-3 grid min-w-0 gap-3 rounded-xl border border-line bg-card p-4" data-copy-correction>
    <p className="font-medium">{t("Corriger le texte acquis","Correct acquired copy")}</p>
    <p className="text-sm">{t("La rédaction est conservée. Les champs facultatifs sans fait confirmé peuvent être retirés. La proposition ci-dessous attend votre validation ; le concept et la scène restent conservés.","Copy is kept. Optional fields without confirmed facts can be removed. The proposal below awaits your approval; the concept and scene are kept.")}</p>
    {review.issues.map((issue,i)=><div key={i} className="min-w-0 text-sm" data-copy-issue><p className="font-medium">{labels[issue.field]} — {reasons[issue.code]}</p><blockquote className="break-words border-l-2 border-warn pl-3">{review.original[issue.field]}</blockquote><code className="text-xs">{issue.code}</code></div>)}
    {(["headline","subline","cta"] as const).map(field=><label key={field} className="grid gap-1 text-sm">{labels[field]}<Input value={edits[field]} maxLength={field==="headline"?120:field==="subline"?200:40} data-copy-field={field} onChange={e=>{setEdits({...edits,[field]:e.target.value});setSaved(false);}}/></label>)}
    {saved&&<p role="status" data-copy-saved>{t("Correction enregistrée, sans appel IA.","Correction saved, without an AI call.")}</p>}
    <div className="flex flex-wrap gap-2"><Button size="sm" className="h-auto min-h-9 min-w-0 max-w-full py-2" variant="secondary" loading={busy} disabled={busy} onClick={()=>act("save")} data-copy-save><span className="min-w-0 whitespace-normal">{t("Enregistrer gratuitement","Save for free")}</span></Button><Button size="sm" className="h-auto min-h-9 min-w-0 max-w-full py-2" disabled={busy||quote==null} onClick={()=>act("resume")} data-copy-resume><span className="min-w-0 whitespace-normal">{t("Valider et reprendre l’image","Approve and resume image")}{quote!=null?` · ${budget.label(quote)}`:""}</span></Button></div>
    <p className="text-xs text-muted">{t("Reprendre peut consommer le budget pour l’image et ses contrôles. Le plafond initial est conservé. Aucun texte n’est réécrit par un nouvel appel payant.","Resuming can use budget for the image and its checks. The original cap is kept. No text is rewritten by a new paid call.")}</p>
  </div>;
}
