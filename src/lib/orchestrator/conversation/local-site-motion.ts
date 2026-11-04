/** Native global motion settings. Exact local operations, no CSS rewrite or invented visual outcome. */
import {HttpError,ownedProject,type User} from '../../auth';
import {id,now} from '../../db';
import {stableHash} from '../../brain/hash';
import {currentTheme,loadProject,saveThemeVersion} from '../../projects';
import {requirePlan} from '../../plan-gates';
import {assertThemeOperations} from '../../theme/plan-access';
import {applyOps,validateSpec,type ThemeOp} from '../../theme/ops';
import {projectKind} from '../../theme/project-kind';
import {localSiteEnabled} from './local-site';
import type {ConversationRow,ConversationState} from './contract';
type MotionKey='motion_enabled'|'motion_intensity'|'motion_parallax';
export type MotionProposal={id:string;key:MotionKey;value:boolean|string;versionId:string;fingerprint:string;resultFingerprint:string;before:boolean|string;expiresAt:number};
export type MotionPresentation={schema:'syna-local-site-motion-1';state:'ambiguous'|'proposed'|'applied';projectId:string;message:string;financialConsent:false;costEur:0;providerCalls:0;publication:false;confirmationRequired:boolean;actionsExecuted:boolean;proposalId?:string;key?:MotionKey;diff?:{before:boolean|string;after:boolean|string};receiptId?:string;version?:{id:string;parentId:string;number:number};previewHref?:string};
export const localSiteMotionEnabled=()=>localSiteEnabled();
export const localSiteMotionCandidate=(text:string)=>/^(?:active|d[ée]sactive|change|modifie|r[èe]gle|mets?|passe|r[ée]duis|coupe|arr[êe]te|diminue|stoppe)\b/iu.test(text.trim())&&/\b(?:animations?|parallaxe)\b/iu.test(text);
const fp=(s:unknown)=>stableHash('native-site-motion-1',s);
const present=(c:ConversationRow,state:MotionPresentation['state'],message:string,extra:Partial<MotionPresentation>={}):MotionPresentation=>({schema:'syna-local-site-motion-1',state,projectId:c.project_id!,message,financialConsent:false,costEur:0,providerCalls:0,publication:false,confirmationRequired:false,actionsExecuted:false,...extra});
function current(user:User,c:ConversationRow,m:ConversationState){if(!localSiteMotionEnabled())throw new HttpError(404,'Réglages gratuits du site indisponibles.');if(!c.project_id)throw new HttpError(409,'Rattachez un projet avec un site natif.');ownedProject(user,c.project_id);requirePlan(user,c.project_id);if(m.activeContextTab!=='boutique')throw new HttpError(409,'Ouvrez Site pour régler ses animations.');const cur=currentTheme(c.project_id);if(!cur||cur.spec.imported)throw new HttpError(409,'Ces réglages concernent un thème natif ; le thème importé conserve son propre éditeur.');return cur;}
function apply(c:ConversationRow,cur:NonNullable<ReturnType<typeof currentTheme>>,key:MotionKey,value:boolean|string){const ops:ThemeOp[]=[{op:'set_global',key,value}];assertThemeOperations(c.project_id!,cur.spec,ops,true);const result=applyOps(cur.spec,ops,{storeKind:projectKind(loadProject(c.project_id!))});if(result.rejected.length||result.applied.length!==1)throw new HttpError(422,result.rejected.map(r=>r.reason).join(' ; ')||'Réglage natif non applicable.');if(validateSpec(result.spec).length)throw new HttpError(422,'Le réglage échoue à la validation native.');return result.spec;}
export function proposeLocalSiteMotion(user:User,c:ConversationRow,m:ConversationState,text:string):MotionPresentation{
 delete m.localSiteMotionProposal;const cur=current(user,c,m),question=(message:string)=>present(c,'ambiguous',message);
 const toggle=/^(active|d[ée]sactive) (les animations|la parallaxe)(?: du site)?\s*[.!]?$/iu.exec(text.trim()),intensity=/^(?:mets?|r[èe]gle|passe) l[’']intensit[ée] des animations(?: du site)? (?:[àa]|en|sur) (discr[èe]te|normale|expressive)\s*[.!]?$/iu.exec(text.trim());
 let key:MotionKey,value:boolean|string;
 if(toggle){key=/parallaxe/iu.test(toggle[2])?'motion_parallax':'motion_enabled';value=/^active$/iu.test(toggle[1]);}
 else if(intensity){key='motion_intensity';value=/discr/iu.test(intensity[1])?'subtle':/normale/iu.test(intensity[1])?'normal':'expressive';}
 else return question('Précisez un réglage natif : Désactive les animations du site ; Active la parallaxe ; Mets l’intensité des animations à discrète, normale ou expressive. Aucun autre réglage ni publication ne sera déduit.');
 if(key!=='motion_enabled'&&cur.spec.settings.motion_enabled===false)return question('Les animations sont désactivées. Activez-les par un accord distinct avant de régler leur intensité ou parallaxe, comme dans le menu natif.');
 const before=key==='motion_intensity'?String(cur.spec.settings[key]??'normal'):cur.spec.settings[key]!==false;if(before===value)return question('Ce réglage est déjà enregistré. Aucune nouvelle version.');
 let result:ReturnType<typeof apply>;try{result=apply(c,cur,key,value);}catch(e){if(e instanceof HttpError&&e.status===422)return question(e.message);throw e;}
 const p:MotionProposal={id:id(),key,value,versionId:cur.version.id,fingerprint:fp(cur.spec),resultFingerprint:fp(result),before,expiresAt:now()+15*60000};m.localSiteMotionProposal=p;
 return present(c,'proposed','Vérifiez ce réglage global du site de travail. Après accord gratuit, une version restaurable sera enregistrée. Le choix « réduire les animations » du visiteur reste respecté ; aucun achat, média ou contenu modifié.',{proposalId:p.id,key,diff:{before,after:value},confirmationRequired:true,previewHref:`/preview/${c.project_id}/v/${cur.version.id}`});
}
export function confirmLocalSiteMotion(user:User,c:ConversationRow,m:ConversationState,proposalId:string,requestId:string):MotionPresentation{
 const cur=current(user,c,m),p=m.localSiteMotionProposal;if(!p||p.id!==proposalId||p.expiresAt<now()||cur.version.id!==p.versionId||fp(cur.spec)!==p.fingerprint)throw new HttpError(409,'Le site ou le réglage a changé ; préparez un nouvel accord gratuit.');const result=apply(c,cur,p.key,p.value);if(fp(result)!==p.resultFingerprint)throw new HttpError(409,'Le résultat natif a changé.');const v=saveThemeVersion(c.project_id!,result,'Réglage gratuit : '+p.key,'user',undefined,p.versionId),read=currentTheme(c.project_id!)!;if(read.version.id!==v.id||fp(read.spec)!==p.resultFingerprint)throw new HttpError(409,'Réglage natif non confirmé.');delete m.localSiteMotionProposal;return present(c,'applied','Réglage d’animation du site enregistré et relu. Une seule valeur native modifiée, version précédente conservée. Aucune génération ni publication.',{proposalId:p.id,key:p.key,diff:{before:p.before,after:p.value},receiptId:requestId,version:{id:v.id,parentId:p.versionId,number:v.number},previewHref:`/preview/${c.project_id}/v/${v.id}`,actionsExecuted:true});
}
