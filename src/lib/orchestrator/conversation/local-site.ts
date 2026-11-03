/** B1 : proposition et application gratuites ; aucune cognition, aucun devis financier. */
import {HttpError,type User} from '../../auth';
import {id,now,one,json} from '../../db';
import {currentTheme,loadProject,saveThemeVersion,themeVersion} from '../../projects';
import {containerOf,sectionSchema,type ThemeSpec} from '../../theme/spec';
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
import {previewNativeThemeUndo,themeToolsRegistry} from './theme-tool-execution';
import {themeTargetPaths} from './theme-tool-context';
import type {ConversationRow,ConversationState} from './contract';

export type LocalSiteProposal={id:string;kind:'title'|'move'|'color'|'faq'|'undo';request:NativeLocalRequest;address:NativeLocalAddress;pin?:ContextPin;versionId:string;fingerprint:string;resultFingerprint:string;ops:ThemeOp[];diff:{before:unknown;after:unknown};expiresAt:number;undo?:{turnId?:string;toolReceiptId?:string;receiptId:string;receiptFingerprint:string;targetVersionId:string;sourceFingerprint?:string}};
export type LocalSiteScope={projectId:string;versionId:string;template:string;section:string;block?:string;key?:string;label:string;pagePaths:string[];labels:Record<string,string>};
export type LocalSitePresentation={command?:'title'|'move'|'color'|'faq'|'undo';receiptId?:string;sourceReceiptId?:string;scope?:LocalSiteScope;schema:'syna-local-site-1';state:'ambiguous'|'proposed'|'applied'|'error';message:string;financialConsent:false;costEur:0;providerCalls:0;confirmationRequired:boolean;proposalId?:string;diff?:{before:unknown;after:unknown};version?:{id:string;number:number;parentId:string;fingerprint:string};previewHref?:string;restore?:{endpoint:string;versionId:string;manual:true};actionsExecuted:boolean};
const present=(state:LocalSitePresentation['state'],message:string,extra:Partial<LocalSitePresentation>={}):LocalSitePresentation=>({schema:'syna-local-site-1',state,message,financialConsent:false,costEur:0,providerCalls:0,confirmationRequired:false,actionsExecuted:false,...extra});
export const localSiteCandidate=(text:string)=>nativeLocalRequest(text).candidate;
export const localSiteEnabled=()=>activeContextEnabled()&&process.env.STUDIO_CONVERSATION_LOCAL_SITE==='1';
const fp=(spec:unknown)=>stableHash('syna-local-site-native-1',spec);
const fail=(message:string):never=>{throw new HttpError(422,message,'conversation_local_unsupported');};
/** Effective colours, not merely scheme IDs: shared private schemes must not recolour other sections. */
function colours(spec:ThemeSpec,template:string,sid:string){const section=containerOf(spec,template)!.sections[sid],schemes=spec.settings.color_schemes as Record<string,{settings:Record<string,unknown>}>|undefined;const key=String(section.settings.color_scheme??'scheme-1');return schemes?.[key]?.settings??schemes?.['scheme-1']?.settings??Object.values(schemes??{})[0]?.settings??{};}
type UndoReceipt={reference:{turnId?:string;toolReceiptId?:string};receiptId:string;s:LocalSitePresentation;fingerprint:string};
function receipt(user:User,c:ConversationRow,ref?:{turnId?:string;toolReceiptId?:string}):UndoReceipt|null{
 const cur=currentTheme(c.project_id!);if(!cur)return null;
 if(!ref?.toolReceiptId){
  const row=ref?.turnId?one<{id:string;request_id:string;response_json:string}>('SELECT id,request_id,response_json FROM agent_conversation_turns WHERE id=? AND conversation_id=?',ref.turnId,c.id):one<{id:string;request_id:string;response_json:string}>("SELECT id,request_id,response_json FROM agent_conversation_turns WHERE conversation_id=? AND json_extract(response_json,'$.localSite.actionsExecuted')=1 AND json_extract(response_json,'$.localSite.command')!='undo' ORDER BY revision DESC LIMIT 1",c.id);
  if(row){const view=json<{projectId?:string;localSite?:LocalSitePresentation}>(row.response_json,{}),s=view.localSite;if(view.projectId===c.project_id&&s?.state==='applied'&&s.actionsExecuted&&s.version?.id===cur.version.id&&s.scope)return{reference:{turnId:row.id},receiptId:row.request_id,s,fingerprint:stableHash('local-site-undo-receipt-1',row)};}
  if(ref?.turnId)return null;
 }
 // Reuse existing delivered/current D2 receipts; keep both native receipt stores distinct.
 try{const r=themeToolsRegistry(user,c.id).receipts.find(r=>r.kind==='edit'&&r.delivered&&r.version?.isCurrent&&r.version.id===cur.version.id&&(!ref?.toolReceiptId||r.id===ref.toolReceiptId));if(!r?.version?.parentId)return null;
  const first=r.changes.find(d=>containerOf(cur.spec,d.template)?.sections[d.section]);if(!first)return null;
  const section=containerOf(cur.spec,first.template)!.sections[first.section],scope:LocalSiteScope={projectId:c.project_id!,versionId:cur.version.id,template:first.template,section:first.section,label:String(section.settings.heading??section.settings.title??first.section),pagePaths:[...new Set(r.changes.flatMap(d=>themeTargetPaths(cur.spec,d.template)))],labels:{},...(first.block?{block:first.block}:{}),key:first.key};
  const value=(side:'before'|'after')=>JSON.stringify(r.changes.map(d=>({template:d.template,section:d.section,block:d.block,key:d.key,value:d[side]})),null,2),s=present('applied','Reçu natif de retouche livré.',{scope,diff:{before:value('before'),after:value('after')},version:{id:r.version.id,number:r.version.number,parentId:r.version.parentId,fingerprint:fp(cur.spec)},actionsExecuted:true});
  return{reference:{toolReceiptId:r.id},receiptId:r.id,s,fingerprint:stableHash('native-tool-undo-receipt-1',{id:r.id,version:r.version,changes:r.changes,job:r.job?.id})};
 }catch(e){if(e instanceof HttpError&&e.status===404)return null;throw e;}
}

function preview(user:User,c:ConversationRow,p:LocalSiteProposal){
 if(!localSiteEnabled())throw new HttpError(404,'Retouches locales SYNA indisponibles.','conversation_local_disabled');
 requirePlan(user,c.project_id!);
 const cur=currentTheme(c.project_id!);if(!cur||cur.version.id!==p.versionId||fp(cur.spec)!==p.fingerprint)throw new ContextConflict(c);
 if(p.kind==='undo'){
  const saved=p.undo?receipt(user,c,p.undo):null;
  if(!saved||saved.fingerprint!==p.undo!.receiptFingerprint||saved.s.version!.id!==cur.version.id||saved.s.version!.fingerprint!==fp(cur.spec)||saved.s.version!.parentId!==p.undo!.targetVersionId)fail('Le reçu de la dernière retouche ne correspond plus à la version courante.');
  const native=localFirst(cur.spec,(p.request as Extract<NativeLocalRequest,{kind:'undo'|'color'|'faq'}>).text,null,[],loadProject(c.project_id!).business,()=>null,projectKind(loadProject(c.project_id!)));
  if(!native?.revert)fail('Le moteur natif ne reconnaît pas cette annulation.');
  const restored=previewNativeThemeUndo(user,c.project_id!,{beforeVersionId:p.versionId,targetVersionId:p.undo!.targetVersionId,undoSourceFingerprint:p.undo!.sourceFingerprint,changes:[]});p.undo!.sourceFingerprint=restored.undoSourceFingerprint;
  return{cur,spec:restored.spec,ops:[] as ThemeOp[]};
 }
 if(!p.pin)fail('Désignez une cible native.');checkedContextPin(c,p.pin);
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
 if(p.request.kind==='color'){
  if(native!.ops.some(op=>op.op!=='section_colors'||op.template!==a.template||op.section!==a.section))fail('Couleur globale ou cible ambiguë : précisez la section entière.');
 }
 if(p.request.kind==='faq'&&native!.ops.some(op=>op.op!=='add_section'||op.template!==a.template||op.position?.after!==a.section||!/faq|collapsible/.test(op.type)))fail('La FAQ ne peut pas être ajoutée exactement après la section désignée.');
 // Les règles d'abonnement restent celles des opérations conversationnelles existantes.
 assertThemeOperations(c.project_id!,cur.spec,native!.ops,true);
 const applied=applyOps(cur.spec,native!.ops,{storeKind:projectKind(project)});
 if(p.request.kind==='title'){const s=containerOf(applied.spec,a.template)!.sections[a.section];if((a.block?s.blocks![a.block].settings:s.settings)[a.key!]!==p.request.value)fail('Le moteur ne conserve pas ce texte exactement.');}
 if(p.request.kind==='color')for(const template of ['group:header','group:footer',...Object.keys(cur.spec.templates)]){const other=containerOf(cur.spec,template);for(const sid of other?.order??[])if((template!==a.template||sid!==a.section)&&stableHash('colours',colours(cur.spec,template,sid))!==stableHash('colours',colours(applied.spec,template,sid)))fail('Le schéma partagé toucherait une autre section. Aucun changement ; utilisez les réglages natifs pour isoler la section.');}
 if(applied.rejected.length||validateSpec(applied.spec).length)fail('Opération refusée par la validation native.');
 if(fp(applied.spec)===fp(cur.spec))fail('La section est déjà à cette position. Aucune nouvelle version.');
 return{cur,spec:applied.spec,ops:native!.ops};
}
const plain=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/^(?:le|la|les)\s+|^l['’]\s*/,'');
export function proposeLocalSite(user:User,c:ConversationRow,m:ConversationState,text:string):LocalSitePresentation{
 delete m.localSiteProposal;
 const command=nativeLocalRequest(text).request?.kind;
 if(!localSiteEnabled())return present('error','Les retouches gratuites ne sont pas activées ici. Aucun appel IA lancé.',{command});
 try{
  const parsed=nativeLocalRequest(text);if(!parsed.request)return present('ambiguous','Précisez gratuitement une seule retouche déterministe : titre exact, couleur de cette section ou FAQ après cette section. Les titres SEO sont distincts.');
  if(parsed.request.kind==='color'&&/\b(site|global|globale|principale|entire|whole)\b/iu.test(text))return present('ambiguous','La couleur globale de tout le site est distincte de celle d’une section. Précisez une section entière et son fond ou ses textes ; aucune couleur globale ne sera remplacée par une retouche de section.',{command:'color'});
  if(parsed.request.kind==='undo'){
   const cur=currentTheme(c.project_id!),saved=receipt(user,c);if(!cur||!saved||saved.s.version!.id!==cur.version.id||saved.s.version!.fingerprint!==fp(cur.spec)||!saved.s.version!.parentId)return present('ambiguous','Aucune dernière retouche avec reçu encore courante à annuler. Une modification manuelle plus récente ne sera pas effacée ; utilisez les versions natives.',{command:'undo'});
   const scope=saved.s.scope!,p:LocalSiteProposal={id:id(),kind:'undo',request:parsed.request,address:{template:scope.template,section:scope.section,...(scope.block?{block:scope.block}:{}),...(scope.key?{key:scope.key}:{})},versionId:cur.version.id,fingerprint:fp(cur.spec),resultFingerprint:'',ops:[],diff:{before:saved.s.diff?.after,after:saved.s.diff?.before},expiresAt:now()+15*60000,undo:{...saved.reference,receiptId:saved.receiptId,receiptFingerprint:saved.fingerprint,targetVersionId:saved.s.version!.parentId}};
   const result=preview(user,c,p);p.resultFingerprint=fp(result.spec);m.localSiteProposal=p;return present('proposed','Annuler la dernière retouche de ce reçu en restaurant son contenu précédent dans une nouvelle version native ; historique conservé. Vérifiez avant/après puis confirmez gratuitement.',{command:'undo',sourceReceiptId:saved.receiptId,scope:proposalScope(c,p),proposalId:p.id,diff:p.diff,confirmationRequired:true});
  }
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
  }else if(request.kind==='move'){
   if(target.kind!=='theme-section'||target.block)fail('Désignez la section entière à déplacer.');
   const container=containerOf(cur.spec,target.template)!;
   const ids=container.order.filter(sid=>{const section=container.sections[sid];const labels=[sid,sectionSchema(cur.spec,section.type)?.name,...['heading','title'].map(key=>section.settings[key])].filter((s):s is string=>typeof s==='string');return labels.some(s=>plain(s)===plain(request.anchor));});
   if(ids.length!==1||ids[0]===target.section)fail('Destination absente, ambiguë ou identique. Donnez un ID natif unique sur la même page.');address.anchorId=ids[0];
  }
  if(request.kind==='color'||request.kind==='faq'){delete address.block;delete address.key;}
  const p:LocalSiteProposal={id:id(),kind:request.kind,request,address,pin:pin!,versionId:cur.version.id,fingerprint:fp(cur.spec),resultFingerprint:'',ops:[],diff:{before:null,after:null},expiresAt:now()+15*60000};
  const result=preview(user,c,p);p.ops=result.ops;p.resultFingerprint=fp(result.spec);
  const section=containerOf(cur.spec,address.template)!.sections[address.section],changed=containerOf(result.spec,address.template)!.sections[address.section];
  p.diff=request.kind==='color'?{before:JSON.stringify(colours(cur.spec,address.template,address.section),null,2),after:JSON.stringify(colours(result.spec,address.template,address.section),null,2)}:request.kind==='faq'?{before:'Ordre : '+containerOf(cur.spec,address.template)!.order.join(' → '),after:'FAQ après '+address.section+' — contenu de départ à compléter : '+JSON.stringify(containerOf(result.spec,address.template)!.order.filter(s=>!containerOf(cur.spec,address.template)!.sections[s]).map(s=>({id:s,...containerOf(result.spec,address.template)!.sections[s]})),null,2)}:request.kind==='title'?{before:(address.block?section.blocks![address.block].settings:section.settings)[address.key!],after:(address.block?changed.blocks![address.block].settings:changed.settings)[address.key!]}:{before:containerOf(cur.spec,address.template)!.order,after:containerOf(result.spec,address.template)!.order};
  m.localSiteProposal=p;return present('proposed',request.kind==='color'?'Alternative native explicite : couleur principale des textes de cette section, ou son fond selon la demande. Certains boutons utilisent aussi cette couleur de texte. Le titre seul n’est pas ciblé ; un changement de fond adapte aussi les accents, textes secondaires, surfaces et textes des boutons si leur contraste devient insuffisant (hors couleurs explicitement demandées et thèmes importés). Aucune autre section ni couleur globale ne change. Vérifiez les couleurs avant/après puis confirmez gratuitement.':request.kind==='faq'?'FAQ native après cette section, avec questions/réponses de départ à compléter, rien d’inventé. Vérifiez avant/après puis confirmez gratuitement.':'Modification comprise. Vérifiez cet aperçu puis confirmez gratuitement.',{command:p.kind,scope:proposalScope(c,p),proposalId:p.id,diff:p.diff,confirmationRequired:true});
 }catch(e){if(e instanceof ContextConflict)throw e;if(e instanceof HttpError)return present(e.status===422?'ambiguous':'error',e.message);throw e;}
}
/** Présentation native uniquement : aucune nouvelle opération ni autorisation. */
function proposalScope(c:ConversationRow,p:LocalSiteProposal):LocalSiteScope{
 const spec=themeVersion(c.project_id!,p.versionId)!.spec,container=containerOf(spec,p.address.template)!;
 const labels=Object.fromEntries(container.order.map(sid=>{const section=container.sections[sid];return[sid,String(section.settings.heading||section.settings.title||sectionSchema(spec,section.type)?.name||sid)];}));
 return{projectId:c.project_id!,versionId:p.versionId,...p.address,label:labels[p.address.section],pagePaths:themeTargetPaths(spec,p.address.template),labels};
}
export function confirmLocalSite(user:User,c:ConversationRow,m:ConversationState,proposalId:string,requestId?:string):LocalSitePresentation{
 const p=m.localSiteProposal;if(!p||p.id!==proposalId||p.expiresAt<now())throw new HttpError(409,'Cette proposition gratuite est périmée. Reformulez la demande.','conversation_local_stale');
 const result=preview(user,c,p);if(fp(result.spec)!==p.resultFingerprint||stableHash('ops',result.ops)!==stableHash('ops',p.ops))throw new ContextConflict(c);
 const v=saveThemeVersion(c.project_id!,result.spec,'SYNA — retouche locale gratuite : '+p.kind,'user',undefined,p.versionId),saved=themeVersion(c.project_id!,v.id);
 if(!saved||fp(saved.spec)!==p.resultFingerprint||currentTheme(c.project_id!)?.version.id!==v.id)throw new HttpError(409,'Écriture native non confirmée.','conversation_local_result_missing');
 delete m.localSiteProposal;
 // La cible reste conservée, explicitement périmée jusqu'à la revalidation A2.
 const path=themeTargetPaths(saved.spec,p.address.template)[0];
 return present('applied','Version native enregistrée et relue. Aucun crédit consommé.',{command:p.kind,...(requestId?{receiptId:requestId}:{}),scope:proposalScope(c,p),proposalId:p.id,diff:p.diff,version:{id:v.id,number:v.number,parentId:p.versionId,fingerprint:fp(saved.spec)},previewHref:`/preview/${c.project_id}/v/${v.id}${path==='/'?'':path}`,restore:{endpoint:`/api/projects/${c.project_id}/theme/restore`,versionId:p.versionId,manual:true},actionsExecuted:true});
}

/** Revoke only the proposal; native versions and the A2 selection remain untouched. */
export function cancelLocalSite(m:ConversationState,proposalId:string){if(!localSiteEnabled())throw new HttpError(404,'Retouches gratuites indisponibles.');if(m.localSiteProposal?.id!==proposalId)throw new HttpError(409,'Proposition gratuite périmée.');delete m.localSiteProposal;delete m.localSite;}
