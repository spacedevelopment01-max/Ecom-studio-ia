/** Native working-site pages. Deterministic models, existing plan rights, explicit free agreement; never publish. */
import {HttpError,ownedProject,type User} from '../../auth';
import {id,now} from '../../db';
import {stableHash} from '../../brain/hash';
import {currentTheme,loadProject,saveThemeVersion,themeVersion} from '../../projects';
import {requirePlan,assertPageModels} from '../../plan-gates';
import {unsafeContentReason} from '../../theme/content-security';
import {validateSpec} from '../../theme/ops';
import {addPage,duplicatePage,updatePage,removePage,setNavigation,inNavigation,PageError} from '../../theme/pages';
import {PAGE_MODELS,modelById,buildContext,buildModelTemplate} from '../../theme/page-templates';
import {localSiteEnabled} from './local-site';
import type {ThemeSpec} from '../../theme/spec';
import type {ConversationRow,ConversationState} from './contract';
type PageRequest={kind:'create';title:string;model:string}|{kind:'rename';handle:string;title:string}|{kind:'navigation';handle:string;show:boolean}|{kind:'duplicate'|'remove';handle:string};
export type PagesProposal={id:string;versionId:string;fingerprint:string;resultFingerprint:string;request:PageRequest;expiresAt:number;diff:{before:string;after:string};path:string};
export type PagesPresentation={schema:'syna-local-pages-1';state:'ambiguous'|'proposed'|'applied';message:string;projectId:string;financialConsent:false;costEur:0;providerCalls:0;publication:false;confirmationRequired:boolean;actionsExecuted:boolean;proposalId?:string;command?:PageRequest['kind'];diff?:{before:string;after:string};target?:string;models?:{id:string;label:string;previewHref:string}[];modelId?:string;modelPreviewHref?:string;sourceVersionId?:string;receiptId?:string;version?:{id:string;parentId:string;number:number};previewHref?:string};
export const localPagesEnabled=()=>localSiteEnabled();
export const localPagesCandidate=(text:string)=>/^(?:ajoute|cr[ée]e|renomme|rebaptise|duplique|supprime|retire|enl[èe]ve|masque|affiche|quels?|liste|montre)\b/iu.test(text.trim())&&/\bpages?\b/iu.test(text.replace(/[«“"][^»”"]*[»”"]/gu,''));
const fp=(spec:ThemeSpec)=>stableHash('native-pages-exact-1',spec);
const present=(c:ConversationRow,state:PagesPresentation['state'],message:string,extra:Partial<PagesPresentation>={}):PagesPresentation=>({schema:'syna-local-pages-1',state,message,projectId:c.project_id!,financialConsent:false,costEur:0,providerCalls:0,publication:false,confirmationRequired:false,actionsExecuted:false,...extra});
function current(user:User,c:ConversationRow){if(!localPagesEnabled())throw new HttpError(404,'Pages natives gratuites indisponibles.');if(!c.project_id)throw new HttpError(409,'Rattachez un projet avec un site natif enregistré.');ownedProject(user,c.project_id);requirePlan(user,c.project_id);const cur=currentTheme(c.project_id);if(!cur||cur.spec.imported)throw new HttpError(409,'Les modèles de pages nécessitent un site natif enregistré ; le thème importé se modifie dans son éditeur.');return cur;}
const normal=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const modelAnswer=(text:string)=>text.trim().replace(/^(?:(?:je choisis|je prends|utilise) (?:le )?mod[èe]le|le mod[èe]le)\s*/iu,'').replace(/^[«“"]|[»”"]\s*[.!]?$/gu,'').trim();
export const pagesModelReplyCandidate=(text:string)=>/^(?:(?:je choisis|je prends|utilise) (?:le )?mod[èe]le|le mod[èe]le)\b/iu.test(text.trim())||PAGE_MODELS.some(x=>x.kind==='page'&&[normal(x.id),normal(x.name.fr)].includes(normal(modelAnswer(text))));
export const hasPagesModelReply=(m:ConversationState,text:string)=>!!m.localPagesClarification&&pagesModelReplyCandidate(text);
function target(spec:ThemeSpec,name:string){const direct=spec.store.pages.filter(p=>p.handle===name||'/pages/'+p.handle===name),matches=direct.length?direct:spec.store.pages.filter(p=>p.title===name);return matches.length===1?matches[0]:null;}
function apply(c:ConversationRow,spec:ThemeSpec,r:PageRequest){
 const next=structuredClone(spec),project=loadProject(c.project_id!);let handle:string;
 if(r.kind==='create'){
  assertPageModels(c.project_id!);const model=modelById(r.model);if(!model||model.kind!=='page')throw new HttpError(422,'Modèle natif de page inconnu.');
  const template=buildModelTemplate(spec,project,model,buildContext(spec,project));if(!template.order.length)throw new HttpError(422,'Ce modèle ne produit aucune section compatible avec ce site.');
  const result=addPage(spec,{title:r.title,model:model.id,template,status:'draft',inNav:false});return{spec:result.spec,handle:result.handle};
 }
 const page=next.store.pages.find(p=>p.handle===r.handle);if(!page)throw new HttpError(409,'La page native a changé.');handle=page.handle;
 if(r.kind==='rename')return{spec:updatePage(spec,handle,{title:r.title}).spec,handle};
 if(r.kind==='duplicate'){assertPageModels(c.project_id!);return duplicatePage(spec,handle);}
 if(r.kind==='navigation'){
  if(r.show&&page.status==='draft')throw new HttpError(409,'Cette page est un brouillon. Sa publication et son ajout au menu sont distincts ; aucun lien vers le brouillon ne sera ajouté.');
  setNavigation(next,handle,r.show);return{spec:next,handle};
 }
 const check=removePage(spec,handle,false);if(check.deps.buttons||check.deps.booking)throw new HttpError(409,'Des boutons ou liens de réservation visent cette page. Modifiez leurs destinations avant de la supprimer ; aucun lien ne sera cassé silencieusement.');
 return{spec:removePage(spec,handle,true).spec,handle};
}
export function proposeLocalPages(user:User,c:ConversationRow,m:ConversationState,text:string):PagesPresentation{
 const pending=m.localPagesClarification;delete m.localPagesProposal;delete m.localPagesClarification;const cur=current(user,c),models=PAGE_MODELS.filter(x=>x.kind==='page').map(x=>({id:x.id,label:x.name.fr,previewHref:`/preview/${c.project_id}/v/model-${x.id}`}));
 const question=(message:string)=>present(c,'ambiguous',message,{models});
 let input=text.trim();if(pending&&pagesModelReplyCandidate(input)){if(pending.expiresAt<now()||pending.versionId!==cur.version.id||pending.tab!==(m.activeContextTab??null))return question('Le site ou le contexte a changé depuis le choix du modèle. Redonnez la page et son modèle ; aucun changement.');input=`Ajoute une page «${pending.title}» avec le modèle «${modelAnswer(input)}»`;}let request:PageRequest|undefined;
 const nav=/^(masque|retire|enl[èe]ve|ajoute|affiche) la page [«“"]([^»”"\r\n]+)[»”"] (?:du|au|dans le) menu\s*[.!]?$/iu.exec(input);
 const create=/^(?:ajoute|cr[ée]e) une(?: nouvelle)? page [«“"]([^»”"\r\n]+)[»”"](?: (?:avec|en utilisant) le mod[èe]le [«“"]?([^»”"\r\n]+?)[»”"]?)?\s*[.!]?$/iu.exec(input);
 const rename=/^(?:renomme|rebaptise) la page [«“"]([^»”"\r\n]+)[»”"] (?:en|comme) [«“"]([^»”"\r\n]+)[»”"]\s*[.!]?$/iu.exec(input);
 const other=/^(duplique|supprime) la page [«“"]([^»”"\r\n]+)[»”"]\s*[.!]?$/iu.exec(input);
 let source:string|undefined;
 if(nav){source=nav[2].trim();request={kind:'navigation',handle:'',show:/ajoute|affiche/iu.test(nav[1])};}
 else if(create){
  const title=create[1].trim();if(!title||title.length>120||unsafeContentReason(title))return question('Nom exact de page attendu : 120 caractères maximum, sans contenu actif ni troncature.');
  if(!create[2]){m.localPagesClarification={title,versionId:cur.version.id,expiresAt:now()+15*60000,tab:m.activeContextTab??null};return question('Quel modèle natif souhaitez-vous pour cette nouvelle page ? Aucun contenu ne sera inventé. Indiquez par exemple : Ajoute une page « Notre entreprise » avec le modèle « À propos ». La page sera créée en brouillon, hors du menu, sans publication.');}
  const name=normal(create[2].trim()),matches=PAGE_MODELS.filter(x=>x.kind==='page'&&(normal(x.id)===name||normal(x.name.fr)===name));if(matches.length!==1){m.localPagesClarification={title,versionId:cur.version.id,expiresAt:now()+15*60000,tab:m.activeContextTab??null};return question('Modèle absent ou ambigu : choisissez parmi les modèles natifs proposés. Aucun autre modèle ne sera substitué.');}request={kind:'create',title,model:matches[0].id};
 }
 else if(rename){source=rename[1].trim();const title=rename[2].trim();if(!title||title.length>120||unsafeContentReason(title))return question('Nom exact attendu : 120 caractères maximum, sans contenu actif ni troncature.');request={kind:'rename',handle:'',title};}
 else if(other){source=other[2].trim();request={kind:/duplique/i.test(other[1])?'duplicate':'remove',handle:''};}
 if(!request)return question('Précisez la page et une opération native : ajout avec modèle, renommage, duplication, retrait/ajout au menu ou suppression. Masquer au menu ne dépublie pas la page. Aucun devis ni publication automatique.');
 if(source){const page=target(cur.spec,source);if(!page)return question('Page absente ou ambiguë : précisez son adresse native /pages/identifiant.');if(request.kind!=='create')request.handle=page.handle;}
 let result:ReturnType<typeof apply>;try{result=apply(c,cur.spec,request);}catch(e){if(e instanceof HttpError&&[409,422].includes(e.status)||e instanceof PageError)return question(e.message);throw e;}
 if(validateSpec(result.spec).length)throw new HttpError(422,'La page proposée échoue à la validation native. Aucun accord disponible.');
 if(fp(result.spec)===fp(cur.spec))return question('Cette page est déjà dans cet état. Aucun accord ni nouvelle version.');
 const page=result.spec.store.pages.find(p=>p.handle===result.handle),prior=cur.spec.store.pages.find(p=>p.handle===result.handle);
 const describe=(p:typeof page,s:ThemeSpec)=>p?`${p.title} · /pages/${p.handle} · ${p.status==='draft'?'brouillon':'page existante'} · ${inNavigation(structuredClone(s),p.handle)?'dans le menu':'hors du menu'}`:'Page absente';
 const diff={before:describe(prior,cur.spec),after:describe(page,result.spec)},p:PagesProposal={id:id(),versionId:cur.version.id,fingerprint:fp(cur.spec),resultFingerprint:fp(result.spec),request,expiresAt:now()+15*60000,diff,path:'/pages/'+result.handle};m.localPagesProposal=p;
 return present(c,'proposed','Vérifiez cette opération dans la version de travail. Après accord gratuit, une version native sera enregistrée, avec historique conservé. Les nouvelles pages et copies restent en brouillon hors du menu ; aucun appel IA ni mise en ligne.',{proposalId:p.id,command:request.kind,target:p.path,diff,confirmationRequired:true,sourceVersionId:cur.version.id,...(request.kind==='create'?{modelId:request.model,modelPreviewHref:`/preview/${c.project_id}/v/model-${request.model}`}:{})});
}
export function confirmLocalPages(user:User,c:ConversationRow,m:ConversationState,proposalId:string,requestId:string):PagesPresentation{
 const cur=current(user,c),p=m.localPagesProposal;if(!p||p.id!==proposalId||p.expiresAt<now()||p.versionId!==cur.version.id||p.fingerprint!==fp(cur.spec))throw new HttpError(409,'Le site ou la proposition de page a changé. Préparez un nouvel accord gratuit.');
 const result=apply(c,cur.spec,p.request);if(fp(result.spec)!==p.resultFingerprint||validateSpec(result.spec).length)throw new HttpError(409,'Les informations du projet ou le résultat du modèle ont changé. Relisez une nouvelle proposition.');
 const v=saveThemeVersion(c.project_id!,result.spec,'SINA — page native : '+p.request.kind,'user',undefined,p.versionId),saved=themeVersion(c.project_id!,v.id);if(!saved||fp(saved.spec)!==p.resultFingerprint)throw new HttpError(409,'Enregistrement natif de page non confirmé.');delete m.localPagesProposal;
 return present(c,'applied','Opération de page enregistrée et relue dans une version native. Aucun fournisseur ni publication.',{proposalId:p.id,command:p.request.kind,target:p.path,diff:p.diff,receiptId:requestId,version:{id:v.id,parentId:p.versionId,number:v.number},previewHref:p.request.kind==='remove'?`/studio/${c.project_id}/boutique`:`/preview/${c.project_id}/v/${v.id}${p.path}`,actionsExecuted:true});
}
