/** D9 : même devis/mémoire/budget/job/bibliothèque et moteur Image V2 ; aucune insertion automatique. */
import {HttpError,type User} from '../../auth';
import {all,id,json,now,one,run,tx,readSnapshot} from '../../db';
import {loadProject,remember} from '../../projects';
import {requireCreationPlan} from '../../plan-gates';
import {assertAiAllowed} from '../../ai/access';
import {assertCanSpend} from '../../billing';
import {budgetPctOf} from '../../ai/budget-pct';
import {bindAgentJob,boundPublic,createOrReadBound,type AgentBound} from '../../ai/request-bounds';
import {enqueue,getJob,publicJob,UserFacingError,type JobContext} from '../../jobs';
import {stateOf} from '../../preparation/store';
import {getAsset,assetUrl} from '../../library';
import {imageCreationQuote,type ImageCreationInput} from '../../image-v2/creation-quote';
import {imageBindingHash,pinImageAsset,pinImageDiagnostic,resolveImageBinding} from '../../image-v2/request-binding';
import {runImageEngineV2,type ImageRunResult} from '../../image-v2/engine';
import type {ImageV2Deps} from '../../image-v2/deps';
import {listProducts} from '../../products/catalog';
import {L} from '../../i18n-server';
import {imageDelivery} from '../../media/delivery-check';
import {ownedConversation,metaOf} from './store';
import {cognitiveContext} from './intelligence-context';
import {conversationImagesEnabled} from './tool-flags';
import {validateImageToolProposal} from './image-tool-validation';
import type {ImageToolCommand} from './image-tool-contract';
type CostPlan=ReturnType<typeof imageCreationQuote>;
type Saved={schema:1;id:string;conversationId:string;sourceReceiptId:string;revision:number;projectRevision:number;createdAt:number;expiresAt:number;bindingDigest:string;input:ImageCreationInput;cost:CostPlan;boundId:string;jobId?:string;frames:{index:number;result:ImageRunResult;outputs:ReturnType<typeof pinImageAsset>[];diagnostics?:ReturnType<typeof pinImageDiagnostic>[]}[]};
const prefix='agent.images.tool.';
function owned(u:User,cid:string){if(!conversationImagesEnabled())throw new HttpError(404,L('Création d’images avec SYNA indisponible.','Image creation with SYNA unavailable.'));const c=ownedConversation(u,cid);if(!c.project_id)throw new HttpError(409,L('Créez d’abord le projet.','Create the project first.'));requireCreationPlan(u,c.project_id,'images');return{c,pid:c.project_id};}
function read(pid:string,qid:string){return json<Saved|null>(one<{value:string}>("SELECT value FROM memory WHERE project_id=? AND kind='artifact' AND key=?",pid,prefix+qid)?.value,null);}
function save(pid:string,m:Saved){const value=JSON.stringify(m);if(value.length>2000000)throw new HttpError(409,L('La demande dépasse le volume de versionnement. Rien n’est tronqué ni lancé.','Request exceeds versioning capacity. Nothing truncated or started.'));remember(pid,{kind:'artifact',key:prefix+m.id,value,source:'local',origin:'system',status:'inferred'});}
function records(pid:string,cid:string){return all<{value:string}>("SELECT value FROM memory WHERE project_id=? AND kind='artifact' AND key LIKE 'agent.images.tool.%' ORDER BY created_at DESC,rowid DESC LIMIT 100",pid).map(r=>json<Saved|null>(r.value,null)).filter((m):m is Saved=>!!m&&m.conversationId===cid);}
function located(u:User,cid:string,qid:string){const{c,pid}=owned(u,cid),m=read(pid,qid);if(!m||m.conversationId!==cid)throw new HttpError(404,L('Reçu images introuvable.','Image receipt not found.'));return{c,pid,m};}
function recheck(u:User,cid:string,pid:string,m:Saved,accepted=false){
 const{c}=owned(u,cid);if(m.cost.capMicro>0)assertAiAllowed(u.id,pid);
 if(c.revision!==m.revision||stateOf(pid)?.revision!==m.projectRevision)throw new HttpError(409,L('La conversation ou la fiche commune a changé. Acquis conservés ; relisez une proposition.','Conversation or shared brief changed. Acquired work kept; review a proposal.'));
 const limit=accepted&&m.jobId?(getJob(m.jobId)?.created_at??m.createdAt)+15*60000:m.expiresAt;
 if(now()>limit||resolveImageBinding(loadProject(pid),m.input.binding).digest!==m.bindingDigest)throw new HttpError(409,L('Le devis ou les références ont changé. Aucun nouvel appel.','Quote or references changed. No new request.'));
}
function publicQuote(u:User,pid:string,m:Saved){const selected=resolveImageBinding(loadProject(pid),m.input.binding),subject=selected.service?.name??(selected.project.product.name||selected.project.name);const estimatePct=budgetPctOf(u.id,m.cost.estimateMicro,pid),maximumPct=budgetPctOf(u.id,m.cost.capMicro,pid);if(estimatePct==null||maximumPct==null||!Number.isFinite(maximumPct))throw new HttpError(409,L('Budget indisponible.','Budget unavailable.'));return{id:m.id,operation:m.input.binding.edit?'edit' as const:'create' as const,instruction:m.input.instruction,edit:m.input.binding.edit?{source:{...m.input.binding.edit.source,href:assetUrl({id:m.input.binding.edit.source.assetId})},style:m.input.binding.edit.style?{...m.input.binding.edit.style,href:assetUrl({id:m.input.binding.edit.style.assetId})}:null}:null,estimatePct,maximumPct,maximumCalls:m.cost.maximumCalls,expiresAt:m.expiresAt,confirmationRequired:true,count:m.input.frames.length,subject,reused:m.cost.reused,aspect:m.input.aspect,frames:m.input.frames,reference:m.input.binding.references[0]?{...m.input.binding.references[0],href:assetUrl({id:m.input.binding.references[0].assetId})}:null,route:{provider:m.cost.requests.find(r=>r.quotedRoutes)?.quotedRoutes?.image.provider??L('Bibliothèque acquise','Acquired library'),reason:m.cost.routeReason,authenticationTested:false},expectedResult:m.input.binding.edit?L('Une nouvelle image retouchée, liée à sa source conservée. Le style concerne le décor et la lumière, pas les couleurs du produit réel. Une génération et un contrôle strict au plus, sans reprise automatique ni insertion dans le Site.','One new edited image linked to its preserved source. Style applies to the background and light, not the real product colours. At most one generation and one strict check, without automatic retry or Site insertion.'):L('Une proposition d’image par composition, enregistrée dans votre bibliothèque et à relire. Les acquis identiques sont réutilisés ; au plus une génération et un contrôle par composition manquante. Aucune reprise, suppression ni insertion dans le Site.','One image proposal per composition saved to your library for review. Matching acquired work is reused; at most one generation and one check per missing composition. No retry, deletion or Site insertion.'),peoplePolicy:L('Aucune personne. Les références contenant une personne ne sont pas raccordées à ce parcours.','No people. References containing a person are not connected to this workflow.'),actionsExecuted:false};}
export function quoteImageCreation(u:User,cid:string,cmd:Extract<ImageToolCommand,{action:'quote'}>){return tx(()=>{
 const{c,pid}=owned(u,cid),a=metaOf(c).intelligence;
 if(c.revision!==cmd.revision||stateOf(pid)?.revision!==cmd.projectRevision||!a?.lastReply?.imagePlan||a.lastReceiptId!==cmd.proposalReceiptId||a.sourceRevision!==c.revision||a.sourceProjectRevision!==cmd.projectRevision)throw new HttpError(409,L('La proposition d’images a changé.','Image proposal changed.'));
 const previous=records(pid,cid).find(m=>m.sourceReceiptId===cmd.proposalReceiptId);if(previous?.jobId)return{kind:'receipt' as const,receipt:imageToolReceipt(u,cid,previous.id)};
 const ctx=cognitiveContext(c),validated=validateImageToolProposal(c,a.lastReply.imagePlan,{sources:ctx.sources,lastClientRequest:ctx.context.lastClientRequest}),input:ImageCreationInput={binding:validated.binding,kind:validated.request.kind,aspect:validated.request.aspect,instruction:validated.instruction,frames:validated.request.frames},cost=imageCreationQuote(loadProject(pid),input);
 if(cost.capMicro>0){assertAiAllowed(u.id,pid);assertCanSpend(u.id,cost.capMicro,pid);}
 if(previous&&previous.expiresAt>now()&&previous.cost.fingerprint===cost.fingerprint)return{kind:'quote' as const,quote:publicQuote(u,pid,previous)};
 const b=createOrReadBound(cid,u.id,cost.capMicro),at=now(),m:Saved={schema:1,id:id(),conversationId:cid,sourceReceiptId:cmd.proposalReceiptId,revision:c.revision,projectRevision:cmd.projectRevision,createdAt:at,expiresAt:Math.min(at+15*60000,b.deadline_at??Infinity),bindingDigest:resolveImageBinding(loadProject(pid),input.binding).digest,input,cost,boundId:b.id,frames:[]};save(pid,m);return{kind:'quote' as const,quote:publicQuote(u,pid,m)};
});}
export function confirmImageCreation(u:User,cid:string,cmd:Extract<ImageToolCommand,{action:'confirm'}>){return tx(()=>{
 const{pid,m}=located(u,cid,cmd.quoteId);if(m.jobId)return imageToolReceipt(u,cid,m.id);recheck(u,cid,pid,m);
 if(imageCreationQuote(loadProject(pid),m.input).fingerprint!==m.cost.fingerprint)throw new HttpError(409,L('Route, tarif ou contexte du contrôle modifié. Actualisez le devis sans générer.','Route, price or review context changed. Refresh the quote without generating.'));
 if(m.cost.capMicro>0)assertCanSpend(u.id,m.cost.capMicro,pid);
 const b=one<AgentBound>('SELECT * FROM agent_request_bounds WHERE id=? AND user_id=?',m.boundId,u.id);
 if(!b||b.max_calls+m.cost.maximumCalls>20||b.deadline_at!=null&&b.deadline_at<now())throw new HttpError(409,L('La limite commune de cette demande est atteinte. Acquis conservés.','Shared request limit reached. Acquired work kept.'));
 if(one("SELECT 1 FROM ai_reservations r JOIN agent_request_jobs aj ON aj.job_id=r.job_id WHERE aj.bound_id=? AND r.status='uncertain'",b.id))throw new HttpError(409,L('Un résultat incertain doit être vérifié avant tout nouvel appel.','An uncertain result must be checked before any new request.'));
 run('UPDATE agent_request_bounds SET cap_micro=cap_micro+?,max_calls=max_calls+? WHERE id=?',m.cost.capMicro,m.cost.maximumCalls,b.id);
 const j=enqueue({userId:u.id,projectId:pid,type:'image.v2',label:L('Créer les images proposées avec SYNA','Create proposed images with SYNA'),payload:{projectId:pid,agentImageQuote:{conversationId:cid,quoteId:m.id},costCapMicro:m.cost.capMicro},idempotencyKey:`agent-images:${m.id}`,maxAttempts:1});
 bindAgentJob(b.id,u.id,j.id,'images');m.jobId=j.id;save(pid,m);return imageToolReceipt(u,cid,m.id);
});}
export async function runAgentImageCreation(ctx:JobContext,injected?:ImageV2Deps){
 const quote=ctx.payload.agentImageQuote as {conversationId:string;quoteId:string}|undefined,u=one<User>('SELECT * FROM users WHERE id=?',ctx.job.user_id);if(!u||!quote)throw new HttpError(404,'image_quote_missing');
 const{pid,m}=located(u,quote.conversationId,quote.quoteId);if(m.jobId!==ctx.job.id||pid!==ctx.job.project_id||ctx.job.type!=='image.v2')throw new HttpError(404,'image_quote_job_mismatch');
 recheck(u,m.conversationId,pid,m,true);
 for(let index=0;index<m.cost.requests.length;index++){
  recheck(u,m.conversationId,pid,m,true);
  const frame=await ctx.step(`agent-image-${index}`,async()=>{
   const result=await runImageEngineV2(ctx,pid,{...m.cost.requests[index],maxCostEur:m.cost.capMicro/1e6},injected),outputs=result.outcomes.flatMap(o=>{const a=o.assetId?getAsset(o.assetId):null;return a?[pinImageAsset(u.id,pid,a.id,a.version)]:[];});
   const diagnostics=result.outcomes.flatMap(o=>{const a=o.diagnosticAssetId?getAsset(o.diagnosticAssetId):null;return a?[pinImageDiagnostic(u.id,pid,a.id,a.version)]:[];});
   return{index,result,outputs,diagnostics};
  });
  for(const pin of frame.outputs)if(imageBindingHash(pinImageAsset(u.id,pid,pin.assetId,pin.version))!==imageBindingHash(pin))throw new UserFacingError(L('Un acquis a changé. Aucun remplacement ni nouvelle génération automatique.','Acquired work changed. No automatic replacement or regeneration.'),'image_output_changed');
  for(const pin of frame.diagnostics??[])if(imageBindingHash(pinImageDiagnostic(u.id,pid,pin.assetId,pin.version))!==imageBindingHash(pin))throw new UserFacingError(L('Un essai conservé a changé. Aucun nouvel appel.','A retained trial changed. No new request.'),'image_diagnostic_changed');
  if(!m.frames.some(f=>f.index===index)){m.frames.push(frame);save(pid,m);}
  ctx.progress(.9*(index+1)/m.cost.requests.length,L('Proposition enregistrée ; vos originaux sont conservés.','Proposal saved; originals are kept.'));
  if(frame.result.stoppedByCostCap)break;
 }
 const finals=m.frames.flatMap(f=>f.result.outcomes.filter(o=>o.verdict==='FINAL').map(o=>o.assetId));
 const delivery=await imageDelivery(pid,finals,{expected:m.input.frames.length,reasons:m.frames.flatMap(f=>f.result.outcomes.map(o=>o.reason))});
 return{quoteId:m.id,frames:m.frames.map(f=>({index:f.index,outputs:f.outputs,verdicts:f.result.outcomes.map(o=>o.verdict)})),expected:m.input.frames.length,delivery};
}
export function imageToolReceipt(u:User,cid:string,qid:string){return readSnapshot(()=>{
 const{pid,m}=located(u,cid,qid),j=m.jobId?getJob(m.jobId):null;if(j&&(j.user_id!==u.id||j.project_id!==pid||j.type!=='image.v2'))throw new HttpError(404,'image_receipt_job_mismatch');
 const saved=j?.result?json<{quoteId?:string;frames?:unknown}>(j.result,{}):null;
 const outputs=m.frames.flatMap(f=>f.outputs.map(pin=>{let present=false;try{present=imageBindingHash(pinImageAsset(u.id,pid,pin.assetId,pin.version))===imageBindingHash(pin);}catch{}const outcome=f.result.outcomes.find(o=>o.assetId===pin.assetId);return{...pin,index:f.index+1,present,verdict:outcome?.verdict??'UNPROVED',href:present?assetUrl({id:pin.assetId}):null,downloadHref:present?assetUrl({id:pin.assetId},{download:true}):null,reason:outcome?.reason??'',origin:outcome?.origin??'none'};}));
 const trials=m.frames.flatMap(f=>(f.diagnostics??[]).map(pin=>{let present=false;try{present=imageBindingHash(pinImageDiagnostic(u.id,pid,pin.assetId,pin.version))===imageBindingHash(pin);}catch{}const outcome=f.result.outcomes.find(o=>o.diagnosticAssetId===pin.assetId),gate=json<{gate?:{checked?:boolean}}>(getAsset(pin.assetId)?.meta,{}).gate;
  // Le détail technique reste dans la tâche et son contrôle natifs ; l'interface explique l'effet réel.
  const failure=f.result.stoppedByCostCap?{kind:'review_budget_cap' as const,message:L('Le plafond de cette demande a arrêté la relecture. Cet essai reste non validé ; aucun nouvel appel n’est lancé.','This request’s cap stopped the review. This trial remains unvalidated; no new request is started.')}:gate?.checked===false?{kind:'review_incomplete' as const,message:L('Le contrôle visuel n’a pas abouti. Cet essai reste conservé, sans validation ni relance automatique.','Visual review did not finish. This trial is kept, without validation or automatic retry.')}:null;
  return{...pin,index:f.index+1,present,verdict:outcome?.verdict??'UNPROVED',reason:failure?.message??outcome?.reason??'',failure,href:present?assetUrl({id:pin.assetId}):null,downloadHref:present?assetUrl({id:pin.assetId},{download:true}):null,diagnosticOnly:true as const,reusable:false as const};}));
 const failure=trials.find(t=>t.failure)?.failure??null;
 const complete=!!j&&j.status==='done'&&saved?.quoteId===m.id&&Array.isArray(saved.frames)&&imageBindingHash(saved.frames)===imageBindingHash(m.frames.map(f=>({index:f.index,outputs:f.outputs,verdicts:f.result.outcomes.map(o=>o.verdict)})))&&outputs.length===m.input.frames.length&&outputs.every(o=>o.present&&o.verdict==='FINAL');
 return{id:m.id,sourceReceiptId:m.sourceReceiptId,expected:m.input.frames.length,state:complete?'review':j?.status==='done'?outputs.length?'partial':'result_missing':j?.status??'quoted',delivered:complete,outputs,trials,failure,job:j?publicJob(j):null,requestBounds:boundPublic(m.boundId),clientApproved:false,siteChanged:false,href:`/studio/${pid}/images`,message:complete?L('Propositions natives enregistrées et contrôlées automatiquement, à relire. La qualité créative réelle et l’accord du client ne sont pas prouvés par ce reçu.','Native proposals saved and automatically checked, for review. Real creative quality and client approval are not proved by this receipt.'):L('Livraison complète non prouvée. Les images acquises et les originaux restent conservés ; aucune relance automatique.','Complete delivery not proved. Acquired images and originals are kept; no automatic retry.')};
});}
export function imageToolRegistry(u:User,cid:string){return readSnapshot(()=>{const{pid}=owned(u,cid);return{projectId:pid,receipts:records(pid,cid).filter(m=>m.jobId).slice(0,10).map(m=>imageToolReceipt(u,cid,m.id)),scope:'create_and_edit_photos',manualHref:`/studio/${pid}/images`,realProviderQualified:false};});}
export function imageToolKnowledge(c:ReturnType<typeof ownedConversation>){if(!c.project_id)return null;return{scope:'metadata_only_not_vision',products:listProducts(c.project_id).slice(0,50).map(p=>({id:p.id,version:p.version,title:p.data.title,images:p.data.images,variants:p.variants.slice(0,20).map(v=>({id:v.id,version:v.version,options:v.options,image:v.image}))})),assets:all<{id:string;name:string;version:number;origin:string;role:string;created_at:number;meta:string}>("SELECT id,name,version,origin,role,created_at,meta FROM assets WHERE project_id=? AND user_id=? AND kind='image' AND deleted_at IS NULL AND status!='rejected' AND role!='theme-render-capture' ORDER BY created_at DESC,rowid DESC LIMIT 50",c.project_id,c.user_id).map(({meta,...a})=>({...a,hasPerson:json<{hasPerson?:boolean}>(meta,{}).hasPerson??null})),services:loadProject(c.project_id).services.services.map(s=>({key:s.key,name:s.name,description:s.description})),receipts:records(c.project_id,c.id).filter(m=>m.jobId).slice(0,10).map(m=>({id:m.id,target:{product:m.input.binding.product??null,service:m.input.binding.service??null},outputs:m.frames.map(f=>({index:f.index+1,assets:f.outputs}))})),limits:'Les 50 médias et 50 produits récents,20 variantes par produit seulement. Aucune lecture visuelle, aucune couleur ou personne déduite de ces métadonnées. Création de 1–5 compositions distinctes et retouche photo d’une source avec style facultatif. Pas de logo ni insertion de page automatique.'};}
