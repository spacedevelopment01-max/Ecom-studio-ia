/** D2 : adaptateur des opérations/versions natives, sans second moteur de thème ni appel IA local. */
import {z} from 'zod';
import {HttpError,type User} from '../../auth';
import {all,id,json,now,one,tx} from '../../db';
import {currentTheme,loadProject,remember,saveThemeVersion,themeVersion,type ThemeVersion} from '../../projects';
import {requirePlan} from '../../plan-gates';
import {applyOps,validateSpec} from '../../theme/ops';
import {containerOf,sectionSchema,type ThemeSpec} from '../../theme/spec';
import {projectKind} from '../../theme/project-kind';
import {assertThemeOperations} from '../../theme/plan-access';
import {unsafeContentReason} from '../../theme/content-security';
import {getAsset} from '../../library';
import {themeFileName} from '../../engine/shop';
import {applyWordingDeep,loadWordingRules} from '../../client-wording';
import {stableHash} from '../../brain/hash';
import {enqueue,getJob,publicJob,type JobContext} from '../../jobs';
import {withAiDisabled} from '../../ai/access';
import {stateOf} from '../../preparation/store';
import {ownedConversation,metaOf} from './store';
import {cognitiveContext} from './intelligence-context';
import {conversationThemeToolsEnabled,conversationCompositionEnabled} from './tool-flags';
import {CompositionPlanSchema,type CompositionPlan} from '../../theme/composition/contract';
import {previewNativeComposition} from '../../theme/composition/server';
import {compositionSnapshot} from '../../theme/composition/presentation';
import {ThemeToolPlanSchema,type ThemeToolPlan,type ThemeToolCommand} from './theme-tool-contract';
import {themeTargetPaths} from './theme-tool-context';

type Diff={template:string;section:string;block?:string;key:string;before:unknown;after:unknown;media?:{beforeAssetId:string|null;afterAssetId:string|null}};
type Meta={schema:1;id:string;conversationId:string;kind:'edit'|'compose'|'undo';sourceReceiptId?:string;revision:number;projectRevision:number;beforeVersionId:string;targetVersionId?:string;plan?:ThemeToolPlan;compositionPlan?:CompositionPlan;previewFingerprint:string;changes:Diff[];summary:string;expiresAt:number;createdAt:number;jobId?:string;resultVersionId?:string;resultFingerprint?:string};
const fingerprint=(spec:ThemeSpec)=>stableHash('agent-theme-native-version-v1',spec);
const enabled=()=>{if(!conversationThemeToolsEnabled())throw new HttpError(404,'Retouches Site de SYNA indisponibles.','conversation_theme_tools_disabled');};
function owned(user:User,cid:string){enabled();const c=ownedConversation(user,cid);if(!c.project_id)throw new HttpError(409,'Créez le projet et choisissez son thème avant cette retouche.');return{c,pid:c.project_id};}
function save(pid:string,m:Meta){remember(pid,{kind:'artifact',key:`agent.theme.tool.${m.id}`,value:JSON.stringify(m),source:'local',origin:'system',status:'inferred'});}
function read(pid:string,qid:string){return json<Meta|null>(one<{value:string}>("SELECT value FROM memory WHERE project_id=? AND kind='artifact' AND key=?",pid,`agent.theme.tool.${qid}`)?.value,null);}
function ownedMeta(user:User,cid:string,qid:string){const{c,pid}=owned(user,cid),m=read(pid,qid);if(!m||m.conversationId!==c.id)throw new HttpError(404,'Retouche introuvable.');return{c,pid,m};}
function current(pid:string,expected?:string){const cur=currentTheme(pid);if(!cur)throw new HttpError(409,'Aucun thème existant à retoucher.');if(expected&&cur.version.id!==expected)throw new HttpError(409,'Le thème a changé. Vos versions sont conservées ; préparez une nouvelle proposition.','agent_theme_conflict');return cur;}
function setting(spec:ThemeSpec,op:{template:string;section:string;block?:string;key:string}){if(op.key==='$composition')return compositionSnapshot(spec,op.template);const section=containerOf(spec,op.template)?.sections[op.section];return op.block?section?.blocks?.[op.block]?.settings[op.key]:section?.settings[op.key];}
function validateExisting(spec:ThemeSpec){const problems=validateSpec(spec);if(problems.length)throw new HttpError(409,problems.join(' ; '),'agent_theme_invalid');}
function previewEdit(user:User,cid:string,pid:string,plan:ThemeToolPlan){
  requirePlan(user,pid);const cur=current(pid,plan.versionId),p=loadProject(pid),c=ownedConversation(user,cid);
  assertThemeOperations(pid,cur.spec,plan.ops,true);
  const sources=cognitiveContext(c).sources;
  for(const op of plan.ops){
    const section=containerOf(cur.spec,op.template)?.sections[op.section],schema=section?sectionSchema(cur.spec,section.type):null;
    const defs=op.block?schema?.blocks.find(b=>b.type===section?.blocks?.[op.block!]?.type)?.settings:schema?.settings;
    const def=defs?.find(d=>d.id===op.key);
    if(section?.disabled||op.block&&section?.blocks?.[op.block]?.disabled)throw new HttpError(409,'Cette section ou ce bloc est masqué. Utilisez les contrôles manuels pour le rendre visible avant retouche.');
    if(!themeTargetPaths(cur.spec,op.template).length)throw new HttpError(409,'Ce modèle n’est relié à aucune page prévisualisable. Aucune modification annoncée comme visible.');
    if(op.op==='set_setting'){
      if(!def||op.key.endsWith('_asset')||!['text','textarea','richtext','inline_richtext'].includes(def.type))throw new HttpError(400,'Cette retouche ne modifie que des champs de texte natifs.');
      if(!op.value.trim()||!sources.some(s=>s.text.includes(op.value)))throw new HttpError(409,'Fournissez le texte exact à utiliser : le copywriting libre n’est pas raccordé à cette retouche.','agent_theme_exact_text_required');
      if(unsafeContentReason(op.value))throw new HttpError(400,'Contenu actif non autorisé.');
    }else{
      if(def?.type!=='image_picker')throw new HttpError(400,'Ce champ n’est pas une image native.');
      const a=getAsset(op.assetId);if(!a||a.project_id!==pid||a.kind!=='image'||a.deleted_at||a.status==='rejected')throw new HttpError(404,'Image du projet introuvable ou indisponible.');
    }
  }
  // Aucun targeted/overrideLocks : une sélection par le modèle ne déverrouille jamais un acquis client.
  const applied=applyOps(cur.spec,plan.ops,{storeKind:projectKind(p),mediaFile:assetId=>{const a=getAsset(assetId);return a&&a.project_id===pid&&a.kind==='image'&&!a.deleted_at&&a.status!=='rejected'?{filename:themeFileName(a,a.role??'media')}:null;}});
  // Le moteur ne compte pas les réglages déjà identiques parmi les écritures.
  // Ils satisfont déjà la demande : leur présence ne rend pas le reste du lot invalide.
  // Toute vraie opération rejetée refuse en revanche le lot entier, avant sauvegarde.
  if(applied.rejected.length)throw new HttpError(409,applied.rejected.map(r=>r.reason).join(' ; '),'agent_theme_rejected');
  const spec=applyWordingDeep(applied.spec,loadWordingRules(pid));validateExisting(spec);
  const changes:Diff[]=plan.ops.map(op=>{const key=op.op==='use_media'&&!op.key.endsWith('_asset')?`${op.key}_asset`:op.key,effective={...op,key},before=setting(cur.spec,effective),after=setting(spec,effective);return{template:op.template,section:op.section,...(op.block?{block:op.block}:{}),key,before,after,...(op.op==='use_media'?{media:{beforeAssetId:typeof before==='string'?cur.spec.files[before]??null:null,afterAssetId:typeof after==='string'?spec.files[after]??null:null}}:{})};});
  if(changes.every(d=>d.media?d.media.beforeAssetId===d.media.afterAssetId:JSON.stringify(d.before)===JSON.stringify(d.after)))throw new HttpError(409,'Ces textes et images sont déjà en place. Aucun nouvel appel ni version inutile.','agent_theme_unchanged');
  return{cur,spec,changes};
}
function previewCompose(user:User,pid:string,plan:CompositionPlan){
  if(!conversationCompositionEnabled())throw new HttpError(404,'Composition de pages avec SYNA indisponible.');
  const cur=current(pid,plan.versionId),preview=previewNativeComposition(user,pid,plan);
  const spec=applyWordingDeep(preview.spec,loadWordingRules(pid));validateExisting(spec);
  const changes:Diff[]=plan.pages.map(page=>({template:page.template,section:'$page',key:'$composition',before:compositionSnapshot(cur.spec,page.template),after:compositionSnapshot(spec,page.template)}));
  if(plan.pages.every(page=>JSON.stringify(cur.spec.templates[page.template])===JSON.stringify(spec.templates[page.template])))throw new HttpError(409,'Cette composition est déjà en place ; aucune version inutile.');
  return{cur,spec,changes};
}
function previewUndo(user:User,pid:string,m:Meta){
  requirePlan(user,pid);const cur=current(pid,m.beforeVersionId),target=m.targetVersionId?themeVersion(pid,m.targetVersionId):null;
  if(!target)throw new HttpError(404,'Version précédente introuvable.');
  const qc=json<{gate?:{verdict?:string}}>(target.version.qc,{});if(['REJECTED','RETRY'].includes(qc.gate?.verdict??''))throw new HttpError(409,'Cette version précédente n’est pas utilisable ; vos versions restent conservées.');
  const spec=applyWordingDeep(target.spec,loadWordingRules(pid));validateExisting(spec);
  for(const assetId of Object.values(spec.files)){const a=getAsset(assetId);if(!a||a.project_id!==pid||a.deleted_at||a.status==='rejected')throw new HttpError(409,'Un média de la version précédente n’est plus disponible. Le thème actuel est conservé.');}
  return{cur,spec,changes:m.changes.map(d=>{const before=setting(cur.spec,d),after=setting(spec,d);return{...d,before,after,...(d.media?{media:{beforeAssetId:typeof before==='string'?cur.spec.files[before]??null:null,afterAssetId:typeof after==='string'?spec.files[after]??null:null}}:{})};})};
}
function publicQuote(m:Meta){return{id:m.id,kind:m.kind,costPct:0,confirmationRequired:true,expiresAt:m.expiresAt,summary:m.summary,changes:m.changes,beforeVersionId:m.beforeVersionId,expectedResult:'Une version native du thème, sans publication ni nouvel appel IA.',actionsExecuted:false};}
export function quoteThemeChange(user:User,cid:string,cmd:Extract<ThemeToolCommand,{action:'quote'}>){return tx(()=>{
  const{c,pid}=owned(user,cid),a=metaOf(c).intelligence;
  if(c.revision!==cmd.revision||stateOf(pid)?.revision!==cmd.projectRevision||a?.lastReceiptId!==cmd.proposalReceiptId||a.sourceRevision!==c.revision||a.sourceProjectRevision!==cmd.projectRevision||!a.lastReply||!(a.lastReply.proposedTools.includes('theme.edit')&&a.lastReply.themePlan||a.lastReply.proposedTools.includes('theme.compose')&&a.lastReply.compositionPlan))throw new HttpError(409,'La proposition ou le contexte a changé. Relisez la conversation.','agent_theme_proposal_stale');
  const compositionPlan=a.lastReply.compositionPlan?CompositionPlanSchema.parse(a.lastReply.compositionPlan):undefined,plan=!compositionPlan?ThemeToolPlanSchema.parse(a.lastReply.themePlan):undefined,preview=compositionPlan?previewCompose(user,pid,compositionPlan):previewEdit(user,cid,pid,plan!),at=now();
  const m:Meta={schema:1,id:id(),conversationId:cid,kind:compositionPlan?'compose':'edit',sourceReceiptId:cmd.proposalReceiptId,revision:c.revision,projectRevision:cmd.projectRevision,beforeVersionId:preview.cur.version.id,plan,compositionPlan,previewFingerprint:fingerprint(preview.spec),changes:preview.changes,summary:(compositionPlan??plan!).summary,createdAt:at,expiresAt:at+15*60000};save(pid,m);return publicQuote(m);
});}
export function quoteThemeUndo(user:User,cid:string,cmd:Extract<ThemeToolCommand,{action:'quote-undo'}>){return tx(()=>{
  const{c,pid,m:original}=ownedMeta(user,cid,cmd.receiptId);
  if(!original.resultVersionId||!original.resultFingerprint)throw new HttpError(409,'Aucune version appliquée à annuler.');
  const saved=themeVersion(pid,original.resultVersionId);if(!saved||fingerprint(saved.spec)!==original.resultFingerprint)throw new HttpError(409,'La preuve de cette version manque.');
  const cur=current(pid,cmd.currentVersionId);if(cur.version.id!==original.resultVersionId)throw new HttpError(409,'Une modification est passée depuis : annulation refusée pour préserver vos derniers changements.','agent_theme_conflict');
  const at=now(),m:Meta={schema:1,id:id(),conversationId:cid,kind:'undo',revision:c.revision,projectRevision:stateOf(pid)?.revision??0,beforeVersionId:cur.version.id,targetVersionId:original.beforeVersionId,changes:original.changes.map(d=>({...d,before:d.after,after:d.before})),previewFingerprint:'',summary:'Annuler cette retouche en créant une nouvelle version ; historique conservé.',createdAt:at,expiresAt:at+15*60000};
  const preview=previewUndo(user,pid,m);m.previewFingerprint=fingerprint(preview.spec);m.changes=preview.changes;save(pid,m);return publicQuote(m);
});}
function recheck(user:User,cid:string,pid:string,m:Meta){
  const c=ownedConversation(user,cid);if(m.expiresAt<now()||c.revision!==m.revision||stateOf(pid)?.revision!==m.projectRevision)throw new HttpError(409,'Ce devis de retouche est périmé ou son contexte a changé.','agent_theme_quote_stale');
  const preview=m.kind==='edit'?previewEdit(user,cid,pid,ThemeToolPlanSchema.parse(m.plan)):m.kind==='compose'?previewCompose(user,pid,CompositionPlanSchema.parse(m.compositionPlan)):previewUndo(user,pid,m);
  if(preview.cur.version.id!==m.beforeVersionId||fingerprint(preview.spec)!==m.previewFingerprint)throw new HttpError(409,'Le contenu, les médias ou les consignes ont changé. Préparez un nouveau devis local.','agent_theme_conflict');return preview;
}
export function confirmThemeChange(user:User,cid:string,cmd:Extract<ThemeToolCommand,{action:'confirm'}>){return tx(()=>{
  const{pid,m}=ownedMeta(user,cid,cmd.quoteId);if(m.jobId)return themeChangeReceipt(user,cid,m.id);
  recheck(user,cid,pid,m);
  const job=enqueue({userId:user.id,projectId:pid,type:'agent.theme.change',label:m.kind==='undo'?'Annulation de la retouche':m.kind==='compose'?'Composition native des pages':'Retouche ciblée du thème',payload:{conversationId:cid,quoteId:m.id,aiOff:true},maxAttempts:1,idempotencyKey:`agent-theme:${m.id}`});
  m.jobId=job.id;save(pid,m);return themeChangeReceipt(user,cid,m.id);
});}
/** Toute dépense IA est interdite ici même si un futur appel venait à être ajouté au traitement. */
export async function runThemeChange(ctx:JobContext){return withAiDisabled('Opération exacte de thème confirmée, sans nouvel appel IA',async()=>{
  const payload=z.object({conversationId:z.string(),quoteId:z.string(),aiOff:z.literal(true),lang:z.string().max(20).optional(),strategyVersion:z.string().nullable().optional(),strategyInputDigest:z.string().nullable().optional()}).strict().parse(ctx.payload),user=one<User>('SELECT * FROM users WHERE id=?',ctx.job.user_id);if(!user)throw new HttpError(404,'Compte introuvable.');
  const result=tx(()=>{const{pid,m}=ownedMeta(user,payload.conversationId,payload.quoteId);if(pid!==ctx.job.project_id||m.jobId!==ctx.job.id)throw new HttpError(404,'Tâche de retouche introuvable.');
    if(m.resultVersionId){const acquired=themeVersion(pid,m.resultVersionId);if(!acquired||fingerprint(acquired.spec)!==m.resultFingerprint)throw new HttpError(409,'Preuve native manquante.');return{versionId:acquired.version.id,number:acquired.version.number,fingerprint:m.resultFingerprint,reused:true};}
    const preview=recheck(user,payload.conversationId,pid,m);
    const v=saveThemeVersion(pid,preview.spec,m.kind==='edit'?`SYNA — ${m.summary}`:m.summary,'user',undefined,m.beforeVersionId);
    const actual=themeVersion(pid,v.id)!;m.resultVersionId=v.id;m.resultFingerprint=fingerprint(actual.spec);save(pid,m);
    return{versionId:v.id,number:v.number,fingerprint:m.resultFingerprint,reused:false};
  });ctx.progress(1,'Version du thème enregistrée ; aucune publication.');return result;
});}
export function themeChangeReceipt(user:User,cid:string,qid:string){const{pid,m}=ownedMeta(user,cid,qid),job=m.jobId?getJob(m.jobId):null;if(job&&(job.user_id!==user.id||job.project_id!==pid))throw new HttpError(404,'Tâche introuvable.');
  const version=m.resultVersionId?themeVersion(pid,m.resultVersionId):null,recorded=!!version&&fingerprint(version.spec)===m.resultFingerprint;
  const result=json<{versionId?:string;fingerprint?:string}>(job?.result,{}),delivered=recorded&&job?.status==='done'&&result.versionId===m.resultVersionId&&result.fingerprint===m.resultFingerprint;
  const cur=currentTheme(pid),paths=recorded?[...new Set(m.changes.flatMap(d=>themeTargetPaths(version!.spec,d.template)))]:[];return{id:m.id,kind:m.kind,summary:m.summary,sourceReceiptId:m.sourceReceiptId??null,state:delivered?'delivered':recorded?'version_recorded_job_unfinished':job?.status==='done'?'result_missing':job?.status??'quoted',delivered,recorded,job:job?publicJob(job):null,costPct:0,composition:m.kind==='compose'?{mode:m.compositionPlan?.mode,quality:'not_measured',platformInstallation:'not_tested'}:null,changes:m.changes,version:recorded?{id:version!.version.id,number:version!.version.number,parentId:version!.version.parent_id,fingerprint:m.resultFingerprint,isCurrent:cur?.version.id===version!.version.id}:null,previewHref:recorded?`/preview/${pid}/v/${version!.version.id}${paths[0]==='/'?'':paths[0]??''}`:null,previewHrefs:paths.map(path=>({path,href:`/preview/${pid}/v/${version!.version.id}${path==='/'?'':path}`})),siteHref:`/studio/${pid}/boutique`,canUndo:recorded&&cur?.version.id===version!.version.id,actionsExecuted:recorded};
}
export function themeToolsRegistry(user:User,cid:string){const{pid,c}=owned(user,cid),cur=currentTheme(pid);return{projectId:pid,currentVersionId:cur?.version.id??null,available:!!cur,mode:conversationCompositionEnabled()?'native_composition_and_exact_edits':'exact_client_text_or_owned_media_only',costPct:0,receipts:all<{value:string}>("SELECT value FROM memory WHERE project_id=? AND kind='artifact' AND key LIKE 'agent.theme.tool.%' ORDER BY created_at DESC,rowid DESC LIMIT 100",pid).map(r=>json<Meta|null>(r.value,null)).filter((m):m is Meta=>!!m&&m.conversationId===c.id&&!!m.jobId).slice(0,10).map(m=>themeChangeReceipt(user,cid,m.id)),siteHref:`/studio/${pid}/boutique`};}
