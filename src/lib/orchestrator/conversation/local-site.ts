/** B1 : proposition et application gratuites ; aucune cognition, aucun devis financier. */
import {HttpError,type User} from '../../auth';
import {id,now} from '../../db';
import {currentTheme,loadProject,saveThemeVersion,themeVersion} from '../../projects';
import {containerOf,sectionSchema} from '../../theme/spec';
import {applyOps,validateSpec,type ThemeOp} from '../../theme/ops';
import {projectKind} from '../../theme/project-kind';
import {assertThemeOperations} from '../../theme/plan-access';
import {unsafeContentReason} from '../../theme/content-security';
import {managedSections} from '../../contenus';
import {stableHash} from '../../brain/hash';
import {localFirst,nativeLocalRequest,type NativeLocalRequest,type NativeLocalAddress} from '../../engine/local-first';
import {requirePlan} from '../../plan-gates';
import {checkedContextPin,type ContextPin,ContextConflict} from './context-session';
import {resolveActiveContext,activeContextEnabled} from './active-context';
import {themeTargetPaths} from './theme-tool-context';
import type {ConversationRow,ConversationState} from './contract';

export type LocalSiteProposal={id:string;kind:'title'|'move';request:NativeLocalRequest;address:NativeLocalAddress;pin:ContextPin;versionId:string;fingerprint:string;resultFingerprint:string;ops:ThemeOp[];diff:{before:unknown;after:unknown};expiresAt:number};
export type LocalSitePresentation={schema:'syna-local-site-1';state:'ambiguous'|'proposed'|'applied'|'error';message:string;financialConsent:false;costEur:0;providerCalls:0;confirmationRequired:boolean;proposalId?:string;diff?:{before:unknown;after:unknown};version?:{id:string;number:number;parentId:string;fingerprint:string};previewHref?:string;restore?:{endpoint:string;versionId:string;manual:true};actionsExecuted:boolean};
const present=(state:LocalSitePresentation['state'],message:string,extra:Partial<LocalSitePresentation>={}):LocalSitePresentation=>({schema:'syna-local-site-1',state,message,financialConsent:false,costEur:0,providerCalls:0,confirmationRequired:false,actionsExecuted:false,...extra});
export const localSiteCandidate=(text:string)=>nativeLocalRequest(text).candidate;
export const localSiteEnabled=()=>activeContextEnabled()&&process.env.STUDIO_CONVERSATION_LOCAL_SITE==='1';
const fp=(spec:unknown)=>stableHash('syna-local-site-native-1',spec);
const fail=(message:string):never=>{throw new HttpError(422,message,'conversation_local_unsupported');};
function preview(user:User,c:ConversationRow,p:LocalSiteProposal){
 if(!localSiteEnabled())throw new HttpError(404,'Retouches locales SYNA indisponibles.','conversation_local_disabled');
 requirePlan(user,c.project_id!);checkedContextPin(c,p.pin);
 const cur=currentTheme(c.project_id!);if(!cur||cur.version.id!==p.versionId||fp(cur.spec)!==p.fingerprint)throw new ContextConflict(c);
 const a=p.address;if(!cur.spec.templates[a.template])fail('Désignez une section de page, pas un groupe global partagé.');
 const container=containerOf(cur.spec,a.template),section=container?.sections[a.section];
 if(!section||section.disabled||!container?.order.includes(a.section)||!themeTargetPaths(cur.spec,a.template).length)fail('Section indisponible ou page incompatible.');
 const managed=managedSections(cur.spec,c.project_id!);
 for(const sid of [a.section,...(a.anchorId?[a.anchorId]:[])]){
  if(cur.spec.locks.includes(`${a.template}:${sid}`)||managed.has(`${a.template}:${sid}`))fail('Section protégée ou issue de contenus métier : utilisez son espace natif.');
  if(!container?.order.includes(sid)||container.sections[sid]?.disabled)fail('Section de destination absente ou masquée.');
 }
 const project=loadProject(c.project_id!),native=localFirst(cur.spec,'',null,[],project.business,()=>null,projectKind(project),{request:p.request,address:a});
 if(!native||native.revert||native.direction||native.ops.length!==1)fail('Le moteur local ne peut pas appliquer cette demande exactement.');
 if(p.request.kind==='title'){
  const target=resolveActiveContext(c,{projectId:c.project_id!,tab:'boutique',target:{kind:'theme-field',versionId:cur.version.id,template:a.template,section:a.section,block:a.block,key:a.key!}});
  if(target.kind!=='theme-field'||!target.contentRead||target.text===null||!['heading','title','heading_line1'].includes(a.key!)||!['text','inline_richtext'].includes(target.fieldType))fail('Désignez un champ de titre natif court et lisible.');
  if(p.request.value.length>500)fail('Titre demandé trop long : 500 caractères maximum, sans troncature.');
  if('text'in target&&target.text===p.request.value)fail('Ce titre est déjà en place. Aucune nouvelle version.');
  if(unsafeContentReason(p.request.value))fail('Le titre contient du contenu actif non autorisé.');
 }
 // Les règles d'abonnement restent celles des opérations conversationnelles existantes.
 assertThemeOperations(c.project_id!,cur.spec,native!.ops,true);
 const applied=applyOps(cur.spec,native!.ops,{storeKind:projectKind(project)});
 if(p.request.kind==='title'){const s=containerOf(applied.spec,a.template)!.sections[a.section];if((a.block?s.blocks![a.block].settings:s.settings)[a.key!]!==p.request.value)fail('Le moteur ne conserve pas ce texte exactement.');}
 if(applied.rejected.length||validateSpec(applied.spec).length)fail('Opération refusée par la validation native.');
 if(fp(applied.spec)===fp(cur.spec))fail('La section est déjà à cette position. Aucune nouvelle version.');
 return{cur,spec:applied.spec,ops:native!.ops};
}
const plain=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/^(?:le|la|les)\s+|^l['’]\s*/,'');
export function proposeLocalSite(user:User,c:ConversationRow,m:ConversationState,text:string):LocalSitePresentation{
 delete m.localSiteProposal;
 if(!localSiteEnabled())return present('error','Les retouches gratuites ne sont pas activées ici. Aucun appel IA lancé.');
 try{
  const parsed=nativeLocalRequest(text);if(!parsed.request)return present('ambiguous','Précisez gratuitement : « Remplace le titre de cette section par “Texte exact” » ou « Place cette section avant ID ou libellé unique ».');
  const pin=checkedContextPin(c);if(!pin?.selection.target)fail('Désignez d’abord une section ou un champ natif du site.');
  const t=pin!.selection.target!;if(t.kind!=='theme-field'&&t.kind!=='theme-section')fail('Désignez une section ou un champ natif sur la page concernée.');
  const target=t as Extract<typeof t,{kind:'theme-field'|'theme-section'}>,cur=currentTheme(c.project_id!)!,address:NativeLocalAddress={template:target.template,section:target.section,...(target.block?{block:target.block}:{})};
  if(managedSections(cur.spec,c.project_id!).has(`${address.template}:${address.section}`))fail('Section issue de contenus métier : utilisez son espace natif.');
  const request=parsed.request;
  if(request.kind==='title'){
   if(target.kind==='theme-field')address.key=target.key;
   else{
    const s=containerOf(cur.spec,target.template)?.sections[target.section],schema=s?sectionSchema(cur.spec,s.type):null,defs=target.block?schema?.blocks.find(b=>b.type===s?.blocks?.[target.block!]?.type)?.settings:schema?.settings;
    const titles=defs?.filter(d=>['heading','title','heading_line1'].includes(d.id??'')&&['text','inline_richtext'].includes(d.type))??[];
    if(titles.length!==1)fail('Titre absent ou ambigu : désignez sa clé native.');address.key=titles[0].id;
   }
  }else{
   if(target.kind!=='theme-section'||target.block)fail('Désignez la section entière à déplacer.');
   const container=containerOf(cur.spec,target.template)!;
   const ids=container.order.filter(sid=>{const section=container.sections[sid];const labels=[sid,sectionSchema(cur.spec,section.type)?.name,...['heading','title'].map(key=>section.settings[key])].filter((s):s is string=>typeof s==='string');return labels.some(s=>plain(s)===plain(request.anchor));});
   if(ids.length!==1||ids[0]===target.section)fail('Destination absente, ambiguë ou identique. Donnez un ID natif unique sur la même page.');address.anchorId=ids[0];
  }
  const p:LocalSiteProposal={id:id(),kind:request.kind,request,address,pin:pin!,versionId:cur.version.id,fingerprint:fp(cur.spec),resultFingerprint:'',ops:[],diff:{before:null,after:null},expiresAt:now()+15*60000};
  const result=preview(user,c,p);p.ops=result.ops;p.resultFingerprint=fp(result.spec);
  const section=containerOf(cur.spec,address.template)!.sections[address.section],changed=containerOf(result.spec,address.template)!.sections[address.section];
  p.diff=request.kind==='title'?{before:(address.block?section.blocks![address.block].settings:section.settings)[address.key!],after:(address.block?changed.blocks![address.block].settings:changed.settings)[address.key!]}:{before:containerOf(cur.spec,address.template)!.order,after:containerOf(result.spec,address.template)!.order};
  m.localSiteProposal=p;return present('proposed','Modification comprise. Vérifiez cet aperçu puis confirmez gratuitement.',{proposalId:p.id,diff:p.diff,confirmationRequired:true});
 }catch(e){if(e instanceof ContextConflict)throw e;if(e instanceof HttpError)return present(e.status===422?'ambiguous':'error',e.message);throw e;}
}
export function confirmLocalSite(user:User,c:ConversationRow,m:ConversationState,proposalId:string):LocalSitePresentation{
 const p=m.localSiteProposal;if(!p||p.id!==proposalId||p.expiresAt<now())throw new HttpError(409,'Cette proposition gratuite est périmée. Reformulez la demande.','conversation_local_stale');
 const result=preview(user,c,p);if(fp(result.spec)!==p.resultFingerprint||stableHash('ops',result.ops)!==stableHash('ops',p.ops))throw new ContextConflict(c);
 const v=saveThemeVersion(c.project_id!,result.spec,'SYNA — retouche locale gratuite : '+p.kind,'user',undefined,p.versionId),saved=themeVersion(c.project_id!,v.id);
 if(!saved||fp(saved.spec)!==p.resultFingerprint||currentTheme(c.project_id!)?.version.id!==v.id)throw new HttpError(409,'Écriture native non confirmée.','conversation_local_result_missing');
 delete m.localSiteProposal;
 // La cible reste conservée, explicitement périmée jusqu'à la revalidation A2.
 const path=themeTargetPaths(saved.spec,p.address.template)[0];
 return present('applied','Version native enregistrée et relue. Aucun crédit consommé.',{proposalId:p.id,diff:p.diff,version:{id:v.id,number:v.number,parentId:p.versionId,fingerprint:fp(saved.spec)},previewHref:`/preview/${c.project_id}/v/${v.id}${path==='/'?'':path}`,restore:{endpoint:`/api/projects/${c.project_id}/theme/restore`,versionId:p.versionId,manual:true},actionsExecuted:true});
}
