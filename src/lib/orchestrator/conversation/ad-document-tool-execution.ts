/** Bounded free adapter over the existing local editor, renderer, jobs and native CAS. */
import {createHash} from 'node:crypto';
import {HttpError,type User} from '../../auth';
import {id,json,now,one,all,tx,readSnapshot} from '../../db';
import {remember} from '../../projects';
import {requirePlan} from '../../plan-gates';
import {stateOf} from '../../preparation/store';
import {withAiDisabled} from '../../ai/access';
import {stableHash} from '../../brain/hash';
import {enqueue,getJob,publicJob,type JobContext} from '../../jobs';
import {getAsset,assetData} from '../../library';
import {localAdEdit} from '../../ad-doc/local-edit';
import {AdDocumentSchema,latestDoc,versionDoc,listVersions,exportDoc,saveAndRender,foreignAssets,type DocVersion} from '../../ad-doc/store';
import {LockedLayerError} from '../../ad-doc/ops';
import type {AdDocument,TextLayer,Layer} from '../../ad-doc/types';
import {conversationToolsEnabled,conversationContextEnabled} from './tool-flags';
import {checkedContextPin,type ContextPin} from './context-session';
import {ownedConversation} from './store';
import type {AdDocumentToolCommand} from './ad-document-tool-contract';
const TYPE='agent.ad-document.local',key=(p:string)=>`agent.ad-document.local.${p}`;
const digest=(doc:AdDocument)=>stableHash('native-ad-document-local-1',doc),sha=(data:Buffer)=>createHash('sha256').update(data).digest('hex');
export const adDocumentToolsEnabled=()=>process.env.STUDIO_CONVERSATION_AD_DOCUMENT_LOCAL==='1'&&conversationToolsEnabled()&&conversationContextEnabled();
type Output={version:DocVersion;sha256:string};
type Effect={field:string;before:number|null;after:number|null;layerId?:string;layerName?:string;role?:Layer["role"];secondary?:boolean;property?:string};
type Proposal={cancelledAt?:number;cancelRequestId?:string;effects:Effect[];effectsDigest?:string;pin:ContextPin;schema:1;id:string;conversationId:string;revision:number;projectRevision:number;docKey:string;layerId:string;baseVersion:number;sourceDigest:string;resultDigest:string;expiresAt:number;before:number;after:number;jobId?:string;requestId?:string;output?:Output};
function owned(u:User,cid:string){if(!adDocumentToolsEnabled())throw new HttpError(404,'Retouches gratuites de créations indisponibles.');const c=ownedConversation(u,cid);if(!c.project_id)throw new HttpError(409,'Désignez une création enregistrée dans votre projet.');requirePlan(u,c.project_id);return{c,pid:c.project_id};}
function save(pid:string,m:Proposal){remember(pid,{kind:'artifact',key:key(m.id),value:JSON.stringify(m),source:'local',origin:'system',status:'inferred'});}
function located(u:User,cid:string,qid:string){const{c,pid}=owned(u,cid),m=json<Proposal|null>(one<{value:string}>("SELECT value FROM memory WHERE project_id=? AND kind='artifact' AND key=?",pid,key(qid))?.value,null);if(!m||m.conversationId!==cid)throw new HttpError(404,'Proposition de création introuvable.');return{c,pid,m};}
const alternative='Alternative gratuite : réduisez l’accroche dans l’éditeur natif, ou choisissez une taille de titre plus petite, puis redésignez le titre. Aucun appel IA nécessaire.';
function impossible(message:string):never{throw new HttpError(422,message+' '+alternative,'ad_doc_local_alternative');}
const geometry=(l:Layer):Record<string,number|null>=>({x:l.x,y:l.y,w:l.w,h:l.h,...l.kind==='text'?{'font.size':l.font.size,'autoFit.minSize':l.autoFit?.minSize??null}:{}});
function invariantLayer(l:Layer,primary:boolean){const value=JSON.parse(JSON.stringify(l));delete value.userEdited;for(const key of primary?['x','y','w','h']:['y'])delete value[key];if(primary&&value.kind==='text'){delete value.font.size;if(value.autoFit)delete value.autoFit.minSize;}return stableHash('ad-edit-unaffected-fields-1',value);}
function result(pid:string,m:Pick<Proposal,'docKey'|'baseVersion'|'layerId'>){
 const cur=latestDoc(pid,m.docKey);if(!cur||cur.version.version!==m.baseVersion)throw new HttpError(409,'La création enregistrée a changé. Désignez-la à nouveau.','ad_doc_version_conflict');
 const titles=cur.doc.layers.filter(l=>l.role==='title'),layer=titles[0];
 if(titles.length!==1||layer?.kind!=='text'||layer.id!==m.layerId||layer.locked||!layer.visible)throw new HttpError(422,'Désignez un titre textuel unique, visible et modifiable.');
 if(foreignAssets(pid,cur.doc).length)throw new HttpError(422,'Média de la création indisponible.');
 let edit:ReturnType<typeof localAdEdit>;try{edit=localAdEdit(cur.doc,'agrandis le titre');}catch(e){if(e instanceof LockedLayerError)impossible('Un calque verrouillé empêche cet agrandissement.');throw e;}
 if(!edit.local||!edit.ops.length)impossible('Le moteur local ne peut pas agrandir ce titre.');
 const native=edit as Extract<ReturnType<typeof localAdEdit>,{local:true}>;
 if(native.ops.some(op=>!('id'in op)||!['update','move','resize','font'].includes(op.op)))impossible('Cette retouche dépasserait les ajustements géométriques annoncés.');
 if(!AdDocumentSchema.safeParse(native.doc).success)impossible('Le résultat natif ne respecte pas le format du document.');
 const next=native.doc;
 if(next.layers.length!==cur.doc.layers.length||next.layers.some((l,i)=>l.id!==cur.doc.layers[i].id))impossible('Le moteur ajouterait, supprimerait ou réordonnerait un calque.');
 const withoutLayers=(d:AdDocument)=>({...d,layers:[],meta:{...d.meta,source:null}});
 if(stableHash('ad-document-frame',withoutLayers(cur.doc))!==stableHash('ad-document-frame',withoutLayers(next)))impossible('Le format ou les métadonnées de la création changeraient.');
 const effects:Effect[]=[];
 for(const before of cur.doc.layers){
  const after=next.layers.find(l=>l.id===before.id)!;if(stableHash('layer',before)===stableHash('layer',after))continue;
  const primary=before.id===m.layerId;
  if(before.locked||!before.visible||(!primary&&(before.kind!=='text'&&before.kind!=='button'||before.id==='brand'||before.name==='Marque'||!['subtitle','body','cta'].includes(before.role))))impossible('Cette retouche déplacerait un calque protégé ou non textuel.');
  if(invariantLayer(before,primary)!==invariantLayer(after,primary))impossible('Cette retouche modifierait un texte, une image ou un réglage non annoncé.');
  if(after.x<0||after.y<0||after.x+after.w>next.width+1||after.y+after.h>next.height+1)impossible('Le déplacement nécessaire sortirait un calque du cadre.');
  const a=geometry(before),b=geometry(after);
  for(const property of Object.keys(a))if(a[property]!==b[property])effects.push({field:primary?property:before.id+'.'+property,property,before:a[property],after:b[property],layerId:before.id,layerName:before.name,role:before.role,secondary:!primary});
 }
 // A locked layer may be skipped by the native editor: never silently cover it.
 const overlap=(a:Layer,b:Layer)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
 const oldTitle=layer,newTitle=next.layers.find(l=>l.id===m.layerId)!;
 for(const other of cur.doc.layers)if(other.id!==m.layerId&&other.visible&&other.locked&&(other.kind==='text'||other.kind==='button')){
  const afterOther=next.layers.find(l=>l.id===other.id)!;
  if(overlap(newTitle,afterOther)>overlap(oldTitle,other)+1)impossible('Un calque verrouillé serait recouvert par le titre agrandi.');
 }
 const after=next.layers.find(l=>l.id===m.layerId) as TextLayer;
 if(after.font.size===layer.font.size||!effects.length)throw new HttpError(422,'Cette retouche ne change pas le titre.');
 return{before:cur.doc,after:next,beforeSize:layer.font.size,afterSize:after.font.size,effects};
}

function recheck(u:User,cid:string,pid:string,m:Proposal){if(m.cancelledAt)throw new HttpError(409,'Cette proposition gratuite a été annulée.');const{c}=owned(u,cid);if(c.revision!==m.revision||stateOf(pid)?.revision!==m.projectRevision||m.expiresAt<now())throw new HttpError(409,'La proposition a changé ou expiré.');checkedContextPin(c,m.pin);const r=result(pid,m);if(digest(r.before)!==m.sourceDigest||digest(r.after)!==m.resultDigest||m.effectsDigest&&stableHash('ad-native-effects-1',r.effects)!==m.effectsDigest||m.effectsDigest&&stableHash('ad-native-effects-1',m.effects)!==m.effectsDigest)throw new HttpError(409,'La création ou le moteur local a changé.');return r;}
export async function proposeAdDocument(u:User,cid:string,cmd:Extract<AdDocumentToolCommand,{action:'propose'}>){return withAiDisabled('Proposition gratuite de titre natif',async()=>{const{c,pid}=owned(u,cid);if(cmd.operation!=='title-larger')throw new HttpError(422,'Retouche non prise en charge.');if(c.revision!==cmd.revision||stateOf(pid)?.revision!==cmd.projectRevision)throw new HttpError(409,'La conversation ou le projet a changé.');
 const pin=checkedContextPin(c),target=pin?.selection.target;if(!pin||target?.kind!=='ad-document-text'||target.docKey!==cmd.docKey||target.layerId!==cmd.layerId||target.version!==cmd.expectedVersion)throw new HttpError(409,'Sélectionnez ce calque natif dans le contexte partagé avant la proposition.');
 const input={docKey:cmd.docKey,layerId:cmd.layerId,baseVersion:cmd.expectedVersion},r=result(pid,input),m:Proposal={effects:r.effects,effectsDigest:stableHash('ad-native-effects-1',r.effects),pin,schema:1,id:id(),conversationId:cid,revision:c.revision,projectRevision:cmd.projectRevision,...input,sourceDigest:digest(r.before),resultDigest:digest(r.after),expiresAt:now()+15*60000,before:r.beforeSize,after:r.afterSize};
 const before=await exportDoc(pid,r.before,'jpeg'),after=await exportDoc(pid,r.after,'jpeg');tx(()=>{recheck(u,cid,pid,m);save(pid,m);});return{schema:'syna-ad-document-local-1',state:'proposed',proposalId:m.id,target:input,diff:{before:m.before,after:m.after},nativeEffects:m.effects,previews:{before:`data:image/jpeg;base64,${before.data.toString('base64')}`,after:`data:image/jpeg;base64,${after.data.toString('base64')}`},costEur:0,providerCalls:0,financialConsent:false,confirmationRequired:true,actionsExecuted:false};});}
export function confirmAdDocument(u:User,cid:string,cmd:Extract<AdDocumentToolCommand,{action:'confirm'}>){return withAiDisabled('Confirmation gratuite de titre natif',()=>tx(()=>{if(cmd.confirmation!==true)throw new HttpError(422,'Confirmation gratuite requise.');const{pid,m}=located(u,cid,cmd.proposalId);if(m.cancelledAt)throw new HttpError(409,'Cette proposition gratuite a été annulée.');if(m.jobId){if(m.requestId!==cmd.requestId)throw new HttpError(409,'Cette proposition a déjà été confirmée.');return adDocumentReceipt(u,cid,m.id);}if(one("SELECT id FROM memory WHERE project_id=? AND key LIKE 'agent.ad-document.local.%' AND json_extract(value,'$.conversationId')=? AND json_extract(value,'$.requestId')=?",pid,cid,cmd.requestId))throw new HttpError(409,'Identifiant de confirmation déjà utilisé.');recheck(u,cid,pid,m);const job=enqueue({userId:u.id,projectId:pid,type:TYPE,label:'SYNA — agrandir gratuitement le titre',payload:{conversationId:cid,proposalId:m.id,aiOff:true},idempotencyKey:`agent-ad-document:${m.id}`,maxAttempts:1});m.jobId=job.id;m.requestId=cmd.requestId;save(pid,m);return adDocumentReceipt(u,cid,m.id);}));}
function validOutput(u:User,pid:string,m:Proposal,o:Output){const v=listVersions(pid,m.docKey).find(v=>v.id===o.version.id),doc=v?versionDoc(pid,m.docKey,v.version):null,a=v?.renderedAssetId?getAsset(v.renderedAssetId):null;if(!v||v.version!==m.baseVersion+1||!doc||digest(doc)!==m.resultDigest||!a||a.project_id!==pid||a.user_id!==u.id||a.deleted_at||a.status==='rejected'||a.mime!=='image/jpeg'||a.origin!=='generated')return false;const p=json<{adDoc?:{operation?:unknown}}>(a.meta,{}).adDoc?.operation;if(stableHash('ad-local-proof',p)!==stableHash('ad-local-proof',{...proof(m),renderSha256:o.sha256,version:v.version}))return false;try{return sha(assetData(a))===o.sha256;}catch{return false;}}
const proof=(m:Proposal)=>({jobId:m.jobId!,proposalId:m.id,sourceDigest:m.sourceDigest,resultDigest:m.resultDigest,baseVersion:m.baseVersion});
export async function runAdDocument(ctx:JobContext){return withAiDisabled('Retouche locale confirmée : aucun fournisseur autorisé',async()=>{const p=ctx.payload as{conversationId:string;proposalId:string;aiOff?:boolean},u=one<User>('SELECT * FROM users WHERE id=?',ctx.job.user_id);if(!u||p.aiOff!==true)throw new HttpError(404,'Retouche locale introuvable.');const{pid,m}=located(u,p.conversationId,p.proposalId);if(ctx.job.type!==TYPE||ctx.job.project_id!==pid||m.jobId!==ctx.job.id)throw new HttpError(404,'Tâche locale incohérente.');
 // Recover an exact committed native proof before checking the now-advanced head.
 const acquired=all<{id:string}>("SELECT id FROM assets WHERE project_id=? AND json_extract(meta,'$.adDoc.operation.jobId')=?",pid,ctx.job.id);
 if(acquired.length>1)throw new HttpError(409,'Plusieurs résultats incompatibles ; aucune relance automatique.');
 if(m.output||acquired.length){let output=m.output;if(!output&&acquired.length===1){const v=listVersions(pid,m.docKey).find(v=>v.renderedAssetId===acquired[0].id);if(v){const a=getAsset(acquired[0].id)!;const savedProof=json<{adDoc?:{operation?:{renderSha256?:string}}}>(a.meta,{}).adDoc?.operation;output={version:v,sha256:savedProof?.renderSha256??''};}}if(!output||!validOutput(u,pid,m,output))throw new HttpError(409,'Résultat acquis absent ou modifié ; aucun remplacement automatique.');m.output=output;save(pid,m);return{proposalId:m.id,...output,reused:true};}
 const r=recheck(u,p.conversationId,pid,m);await saveAndRender(pid,u.id,m.docKey,r.after,'SYNA — titre agrandi gratuitement',{expectedVersion:m.baseVersion,validate:()=>{recheck(u,p.conversationId,pid,m);},strategyStamp:r.before.meta.marketingStrategy??null,operation:proof(m),commit:(version,sha256)=>{m.output={version,sha256};save(pid,m);}});const committed=located(u,p.conversationId,p.proposalId).m.output;if(!committed||!validOutput(u,pid,m,committed))throw new HttpError(409,'Enregistrement natif non confirmé.');return{proposalId:m.id,...committed,reused:false};});}
export function adDocumentReceipt(u:User,cid:string,qid:string){return readSnapshot(()=>{const{pid,m}=located(u,cid,qid),job=m.jobId?getJob(m.jobId):null;if(job&&(job.user_id!==u.id||job.project_id!==pid||job.type!==TYPE))throw new HttpError(404,'Reçu local introuvable.');let staleNotice:string|null=null;if(!m.jobId&&!m.cancelledAt){try{recheck(u,cid,pid,m);}catch(e){if(!(e instanceof HttpError))throw e;staleNotice=e.message;}}const recorded=!!m.output&&validOutput(u,pid,m,m.output),r=json<{proposalId?:string;version?:DocVersion;sha256?:string}>(job?.result,{}),delivered=recorded&&job?.status==='done'&&r.proposalId===m.id&&r.version?.id===m.output!.version.id&&r.sha256===m.output!.sha256;return{schema:'syna-ad-document-local-1',id:m.id,state:m.cancelledAt?'cancelled':staleNotice?'stale':delivered?'saved':recorded?'recorded_job_unfinished':job?.status??'proposed',recorded,delivered,...(m.cancelledAt?{cancelledAt:m.cancelledAt,cancelRequestId:m.cancelRequestId}:{}),...(staleNotice?{notice:staleNotice}:{}),costEur:0,providerCalls:0,financialConsent:false,confirmationRequired:false,actionsExecuted:recorded,target:{docKey:m.docKey,layerId:m.layerId,baseVersion:m.baseVersion},diff:{before:m.before,after:m.after},nativeEffects:m.effects,version:recorded?m.output!.version:null,job:job?publicJob(job):null,exportHref:recorded?`/api/projects/${pid}/ads/docs/${encodeURIComponent(m.docKey)}?export=png&version=${m.output!.version.version}`:null};});}
/** Exact local speech dispatch, deliberately no classifier or inferred target. */
export const adDocumentCandidate=(text:string)=>/^agrandis le titre de la creation selectionnee[.!]?$/i.test(text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim());
export function bindAdDocumentProposal(u:User,cid:string,qid:string,nextRevision:number){const{c,pid,m}=located(u,cid,qid);recheck(u,cid,pid,m);if(nextRevision!==c.revision+1)throw new HttpError(409,'La conversation a changé.');m.revision=nextRevision;save(pid,m);}
export function adDocumentPresentation(u:User,cid:string,qid:string){const{m}=located(u,cid,qid),receipt=adDocumentReceipt(u,cid,qid),base=`/api/studio-agent/conversations/${cid}/ad-documents?receipt=${encodeURIComponent(qid)}`;return{...receipt,proposalId:m.id,expiresAt:m.expiresAt,confirmationRequired:!m.jobId&&!m.cancelledAt&&receipt.state!=='stale'&&m.expiresAt>=now(),previews:{before:base+'&preview=before',after:base+'&preview=after'}};}
export async function adDocumentPreview(u:User,cid:string,qid:string,side:'before'|'after'){return withAiDisabled('Aperçu natif gratuit',async()=>{const{pid,m}=located(u,cid,qid);if(m.cancelledAt)throw new HttpError(409,'Cette proposition gratuite a été annulée.');let doc:AdDocument;if(m.output&&validOutput(u,pid,m,m.output)){const stored=versionDoc(pid,m.docKey,side==='before'?m.baseVersion:m.output.version.version);if(!stored)throw new HttpError(404,'Version de l’aperçu introuvable.');if(digest(stored)!==(side==='before'?m.sourceDigest:m.resultDigest))throw new HttpError(409,'Version de l’aperçu modifiée.');doc=stored;}else{const r=recheck(u,cid,pid,m);doc=side==='before'?r.before:r.after;}return exportDoc(pid,doc,'jpeg');});}

/** Revocation of an unconfirmed proposal, not an undo of a native job or result. */
export function cancelAdDocument(u:User,cid:string,cmd:Extract<AdDocumentToolCommand,{action:'cancel'}>){return withAiDisabled('Annulation gratuite sans rendu ni écriture métier',()=>tx(()=>{const{pid,m}=located(u,cid,cmd.proposalId);if(m.jobId)throw new HttpError(409,'Cette proposition a déjà été confirmée. Son annulation n’est pas une restauration.');if(m.cancelledAt)return adDocumentReceipt(u,cid,m.id);if(one("SELECT id FROM memory WHERE project_id=? AND key LIKE 'agent.ad-document.local.%' AND json_extract(value,'$.conversationId')=? AND json_extract(value,'$.cancelRequestId')=?",pid,cid,cmd.requestId))throw new HttpError(409,'Identifiant d’annulation déjà utilisé.');m.cancelledAt=now();m.cancelRequestId=cmd.requestId;save(pid,m);return adDocumentReceipt(u,cid,m.id);}));}
