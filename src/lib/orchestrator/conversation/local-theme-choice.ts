/** Native gallery choice: retained inactive native preview, then a separate free agreement. */
import {outsideQuotes} from './outside-quotes';
import {HttpError,ownedProject,type User} from '../../auth';
import {all,id,now} from '../../db';
import {stableHash} from '../../brain/hash';
import {currentTheme,loadProject,themeVersion,saveThemeVersion} from '../../projects';
import {requirePlan,assertThemeAllowed} from '../../plan-gates';
import {buildShop,compositionBaseline} from '../../engine/shop';
import {DIRECTIONS,type DirectionId} from '../../theme/directions';
import {themeRecommendation} from '../../theme/theme-recommendation';
import {validateSpec} from '../../theme/ops';
import {conversationThemeToolsEnabled,conversationContextEnabled} from './tool-flags';
import type {ConversationRow,ConversationState} from './contract';
export type ThemeChoiceProposal={id:string;direction:DirectionId;sourceVersionId:string;sourceFingerprint:string;previewVersionId:string;previewFingerprint:string;expiresAt:number};
export type ThemeChoicePresentation={schema:'syna-local-theme-choice-1';state:'ambiguous'|'proposed'|'applied';projectId:string;message:string;financialConsent:false;costEur:0;providerCalls:0;publication:false;confirmationRequired:boolean;actionsExecuted:boolean;proposalId?:string;direction?:string;diff?:{before:string;after:string};preview?:{beforeHref:string;afterHref:string;retainedInactive:true};choices?:{id:string;name:string}[];receiptId?:string;version?:{id:string;parentId:string;number:number};previewHref?:string};
export type PreparedThemeChoice={proposal?:ThemeChoiceProposal;presentation:ThemeChoicePresentation};
export const localThemeChoiceEnabled=()=>conversationThemeToolsEnabled()&&conversationContextEnabled();
export const localThemeChoiceCandidate=(text:string)=>/^(?:choisis|s[ée]lectionne|applique|adopte|change)\b/iu.test(text.trim())&&/\bth[èe]me\b/iu.test(outsideQuotes(text));
const present=(c:ConversationRow,state:ThemeChoicePresentation['state'],message:string,extra:Partial<ThemeChoicePresentation>={}):ThemeChoicePresentation=>({schema:'syna-local-theme-choice-1',state,projectId:c.project_id!,message,financialConsent:false,costEur:0,providerCalls:0,publication:false,confirmationRequired:false,actionsExecuted:false,...extra});
function current(user:User,c:ConversationRow,tab:string|null|undefined){if(!localThemeChoiceEnabled())throw new HttpError(404,'Choix de thème indisponible.');if(!c.project_id)throw new HttpError(409,'Rattachez un projet avec un site natif.');ownedProject(user,c.project_id);requirePlan(user,c.project_id);if(tab!=='boutique')throw new HttpError(409,'Ouvrez Site pour choisir un thème.');const cur=currentTheme(c.project_id);if(!cur||cur.spec.imported)throw new HttpError(409,'Le choix gratuit nécessite un site natif existant. Le thème importé reste dans son éditeur.');return cur;}
const source=(pid:string)=>stableHash('native-theme-choice-source-1',{project:loadProject(pid),current:currentTheme(pid),assets:all('SELECT * FROM assets WHERE project_id=? ORDER BY id',pid),memory:all('SELECT * FROM memory WHERE project_id=? ORDER BY id',pid),documents:all('SELECT * FROM content_documents WHERE project_id=? ORDER BY id',pid)});
const previewHash=(pid:string,vid:string)=>stableHash('native-theme-choice-preview-1',themeVersion(pid,vid));
const normal=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export async function prepareLocalThemeChoice(user:User,c:ConversationRow,text:string,tab:string|null|undefined):Promise<PreparedThemeChoice>{
 const cur=current(user,c,tab),p=loadProject(c.project_id!),eligible=themeRecommendation(p,'fr').eligible,choices=DIRECTIONS.filter(x=>eligible.includes(x.id)).map(x=>({id:x.id,name:x.name}));
 const question=(message:string):PreparedThemeChoice=>({presentation:present(c,'ambiguous',message,{choices})});
 if(!p.brand)return question('La marque du projet doit être définie dans le parcours natif avant de composer un thème. Aucun contenu ou logo ne sera inventé.');
 const match=/^(?:choisis|s[ée]lectionne|applique|adopte) le th[èe]me [«“"]?([^»”"\r\n]+?)[»”"]?(?: pour mon site)?\s*[.!]?$/iu.exec(text.trim());if(!match)return question('Quel thème exact de la galerie souhaitez-vous ? Un aperçu natif sera conservé sans changer le site courant, puis un accord gratuit séparé sera nécessaire. Aucune génération ni publication.');
 const name=normal(match[1]),found=DIRECTIONS.filter(x=>normal(x.id)===name||normal(x.name)===name);if(found.length!==1)return question('Thème inconnu ou ambigu : choisissez un identifiant exact de la galerie. Aucun autre thème substitué.');
 const direction=found[0].id;if(!eligible.includes(direction))return question('Ce thème n’est pas disponible pour la catégorie de ce projet dans la galerie native. Le site existant est conservé.');assertThemeAllowed(p.id,direction,cur.spec.direction);
 if(direction===cur.spec.direction)return question('Ce thème est déjà installé. Aucune recomposition ni nouvelle version.');
 if(!compositionBaseline(p.id,cur.version.number))return question('La composition automatique de référence manque. Les retouches manuelles ne peuvent pas être identifiées avec certitude ;le site courant est conservé,aucun remplacement proposé.');
 const fingerprint=source(p.id);
 // Same native builder and preservation rules; no brand mutation, media preparation or AI for reference themes.
 const result=await buildShop(null,p.id,{direction,useAi:false,prepareOnly:true}),preview=themeVersion(p.id,result.versionId);
 if(source(p.id)!==fingerprint||currentTheme(p.id)?.version.id!==cur.version.id)throw new HttpError(409,'Les sources ou le site ont changé pendant la préparation. L’aperçu inactif est conservé, aucun site remplacé.');
 if(!preview||preview.spec.direction!==direction||validateSpec(preview.spec).length)throw new HttpError(409,'L’aperçu natif n’a pas été validé ; site courant conservé.');
 const carry=preview.spec.meta?.carryOver as {dropped?:unknown[]}|undefined;if(carry?.dropped?.length)return question('Le moteur natif signale des réglages manuels non reportés dans cet aperçu. Le site courant et toutes ses retouches sont conservés ; aucune confirmation de remplacement disponible. Consultez les versions et le rapport natif avant de poursuivre.');
 const qc=JSON.parse(preview.version.qc||'null');if(['REJECTED','RETRY'].includes(qc?.gate?.verdict))return question('Le contrôle natif exige une correction de cet aperçu inactif avant utilisation ; aucun accord de bascule disponible.');
 const proposal:ThemeChoiceProposal={id:id(),direction,sourceVersionId:cur.version.id,sourceFingerprint:fingerprint,previewVersionId:preview.version.id,previewFingerprint:previewHash(p.id,preview.version.id),expiresAt:now()+15*60000};
 return{proposal,presentation:present(c,'proposed','Aperçu natif conservé dans les versions inactives, sans remplacement du site courant. Vérifiez l’ensemble du nouveau thème, les réglages reportés et les éléments masqués/incomplets. Après accord gratuit, il remplacera le site de travail ; historique, médias et identité de marque conservés. Aucune publication ni génération.',{proposalId:proposal.id,direction,diff:{before:cur.spec.name,after:preview.spec.name},preview:{beforeHref:`/preview/${p.id}/v/${cur.version.id}`,afterHref:`/preview/${p.id}/v/${preview.version.id}`,retainedInactive:true},confirmationRequired:true})};
}
export function confirmLocalThemeChoice(user:User,c:ConversationRow,m:ConversationState,proposalId:string,requestId:string):ThemeChoicePresentation{
 const cur=current(user,c,m.activeContextTab),p=m.localThemeChoiceProposal;if(!p||p.id!==proposalId||p.expiresAt<now()||cur.version.id!==p.sourceVersionId||source(c.project_id!)!==p.sourceFingerprint||previewHash(c.project_id!,p.previewVersionId)!==p.previewFingerprint)throw new HttpError(409,'Le site, les sources ou l’aperçu ont changé. Préparez un nouvel accord gratuit.');
 assertThemeAllowed(c.project_id!,p.direction,cur.spec.direction);const target=themeVersion(c.project_id!,p.previewVersionId)!;const qc=JSON.parse(target.version.qc||'null');if(['REJECTED','RETRY'].includes(qc?.gate?.verdict)||validateSpec(target.spec).length)throw new HttpError(409,'Cet aperçu nécessite une correction native.');
 const v=saveThemeVersion(c.project_id!,target.spec,'Choix gratuit du thème '+target.spec.name,'user',qc,cur.version.id),read=currentTheme(c.project_id!)!;
 if(read.version.id!==v.id||stableHash('theme-readback',read.spec)!==stableHash('theme-readback',target.spec))throw new HttpError(409,'Thème de travail non confirmé.');delete m.localThemeChoiceProposal;
 return present(c,'applied','Thème du site de travail enregistré et relu. Version précédente et aperçu conservés ; identité, médias et créations acquis conservés. Vérifiez les reports/incompatibilités dans l’aperçu. Aucune publication ni dépense.',{proposalId:p.id,direction:p.direction,diff:{before:cur.spec.name,after:read.spec.name},receiptId:requestId,version:{id:v.id,parentId:cur.version.id,number:v.number},previewHref:`/preview/${c.project_id}/v/${v.id}`,actionsExecuted:true});
}

export function acceptPreparedThemeChoice(user:User,c:ConversationRow,m:ConversationState,prepared:PreparedThemeChoice){current(user,c,m.activeContextTab);if(prepared.proposal&&source(c.project_id!)!==prepared.proposal.sourceFingerprint)throw new HttpError(409,'Les sources ont changé depuis cet aperçu.');delete m.localThemeChoiceProposal;if(prepared.proposal)m.localThemeChoiceProposal=prepared.proposal;return prepared.presentation;}
