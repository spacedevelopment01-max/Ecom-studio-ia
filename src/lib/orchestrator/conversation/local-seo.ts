/** Exact native metadata edits; no content generation, supplier, or publication. */
import {HttpError,ownedProject,type User} from '../../auth';
import {id,now} from '../../db';
import {stableHash} from '../../brain/hash';
import {currentTheme,saveThemeVersion,themeVersion} from '../../projects';
import {requirePlan} from '../../plan-gates';
import {unsafeContentReason} from '../../theme/content-security';
import {updatePage} from '../../theme/pages';
import {localSiteEnabled} from './local-site';
import type {ThemeSpec} from '../../theme/spec';
import type {ConversationRow,ConversationState} from './contract';
export type SeoProposal={id:string;versionId:string;fingerprint:string;target:string;field:'title'|'description';before:string;after:string;label:string;expiresAt:number};
export type SeoPresentation={schema:'syna-local-seo-1';state:'ambiguous'|'proposed'|'applied';message:string;projectId:string;financialConsent:false;costEur:0;providerCalls:0;publication:false;confirmationRequired:boolean;actionsExecuted:boolean;proposalId?:string;field?:'title'|'description';target?:string;label?:string;diff?:{before:string;after:string};receiptId?:string;version?:{id:string;parentId:string;number:number};previewHref?:string};
export const localSeoEnabled=localSiteEnabled;
export const localSeoCandidate=(text:string)=>/^(?:remplace|change|modifie|mets?)\b/iu.test(text.trim())&&/\bSEO\b|m[ée]tadescription/iu.test(text.replace(/[«“"][^»”"]*[»”"]/gu,''));
const fp=(spec:ThemeSpec)=>stableHash('native-seo-exact-1',spec);
const present=(c:ConversationRow,state:SeoPresentation['state'],message:string,extra:Partial<SeoPresentation>={}):SeoPresentation=>({schema:'syna-local-seo-1',state,message,projectId:c.project_id!,financialConsent:false,costEur:0,providerCalls:0,publication:false,confirmationRequired:false,actionsExecuted:false,...extra});
function current(user:User,c:ConversationRow){
 if(!localSeoEnabled())throw new HttpError(404,'Retouches SEO gratuites indisponibles.');
 if(!c.project_id)throw new HttpError(409,'Rattachez un projet avec un site enregistré.');ownedProject(user,c.project_id);requirePlan(user,c.project_id);
 const cur=currentTheme(c.project_id);if(!cur||cur.spec.imported)throw new HttpError(409,'Un site natif enregistré est nécessaire ; les métadonnées des thèmes importés ne sont pas raccordées.');return cur;
}
function apply(spec:ThemeSpec,p:Pick<SeoProposal,'target'|'field'|'after'>):ThemeSpec{
 const next=structuredClone(spec),seo=p.target==='/'?next.store.seo:next.store.pages.find(pg=>'/pages/'+pg.handle===p.target)?.seo;
 const metadata={title:seo?.title??'',description:seo?.description??'',[p.field]:p.after};
 if(p.target==='/'){next.store.seo=metadata;return next;}
 const r=updatePage(next,p.target.slice('/pages/'.length),{seo:metadata});return r.spec;
}
export function proposeLocalSeo(user:User,c:ConversationRow,m:ConversationState,text:string):SeoPresentation{
 delete m.localSeoProposal;const cur=current(user,c);
 const match=/^(?:remplace|change|modifie|mets?) (?:le titre SEO|la (?:m[ée]tadescription|description SEO)) de (?:la page d[’']accueil|l[’']accueil|la page [«“"]([^»”"\r\n]+)[»”"]) (?:par|pour|[àa]) [«“"]([^»”"\r\n]+)[»”"]\s*[.!]?$/iu.exec(text.trim());
 if(!match)return present(c,'ambiguous','Indiquez la page et le texte SEO exact, par exemple : Remplace le titre SEO de la page d’accueil par « Votre titre ». Le titre visible d’une section est distinct ; aucun texte ni devis IA ne sera généré.');
 const field=/^\S+ le titre SEO/iu.test(text.trim())?'title':'description',after=match[2].trim();
 if(!after||after.length>(field==='title'?70:320)||unsafeContentReason(after))return present(c,'ambiguous',`Texte SEO exact attendu : ${field==='title'?70:320} caractères maximum, sans contenu actif. Rien ne sera tronqué ni modifié.`);
 let target='/',label='Accueil';
 if(match[1]){const name=match[1].trim(),byHandle=cur.spec.store.pages.filter(pg=>pg.handle===name||'/pages/'+pg.handle===name),pages=byHandle.length?byHandle:cur.spec.store.pages.filter(pg=>pg.title===name);if(pages.length!==1)return present(c,'ambiguous','Page absente ou ambiguë : précisez son identifiant natif unique. Aucun changement.');target='/pages/'+pages[0].handle;label=pages[0].title;}
 const metadata=target==='/'?cur.spec.store.seo:cur.spec.store.pages.find(pg=>'/pages/'+pg.handle===target)!.seo,before=metadata?.[field]??'';
 if(before===after)return present(c,'ambiguous','Ce texte SEO est déjà enregistré. Aucun changement ni nouvelle version.');
 const proposal:SeoProposal={id:id(),versionId:cur.version.id,fingerprint:fp(cur.spec),target,field,before,after,label,expiresAt:now()+15*60000};
 // Validate the native page operation before presenting an agreement, never truncate.
 const next=apply(cur.spec,proposal),read=target==='/'?next.store.seo:next.store.pages.find(pg=>'/pages/'+pg.handle===target)?.seo;if(read?.[field]!==after||read?.[field==='title'?'description':'title']!==(metadata?.[field==='title'?'description':'title']??''))throw new HttpError(422,'Le moteur natif ne conserve pas ce texte exactement.');
 m.localSeoProposal=proposal;return present(c,'proposed','Vérifiez le texte SEO exact et la page. Après accord gratuit, une nouvelle version native sera enregistrée ; aucun contenu visible, autre métadonnée, site publié ni document éditorial acquis ne sera remplacé.',{proposalId:proposal.id,field,target,label,diff:{before,after},confirmationRequired:true});
}
export function confirmLocalSeo(user:User,c:ConversationRow,m:ConversationState,proposalId:string,requestId:string):SeoPresentation{
 const cur=current(user,c),p=m.localSeoProposal;if(!p||p.id!==proposalId||p.expiresAt<now()||p.versionId!==cur.version.id||p.fingerprint!==fp(cur.spec))throw new HttpError(409,'Le site ou la proposition SEO a changé. Préparez un nouvel accord gratuit.');
 const next=apply(cur.spec,p),v=saveThemeVersion(c.project_id!,next,'SYNA — texte SEO exact : '+p.label,'user',undefined,p.versionId),saved=themeVersion(c.project_id!,v.id);
 if(!saved||fp(saved.spec)!==fp(next))throw new HttpError(409,'Enregistrement SEO natif non confirmé.');delete m.localSeoProposal;
 return present(c,'applied','Texte SEO enregistré et relu dans une nouvelle version native. Aucun appel IA ni publication.',{proposalId:p.id,field:p.field,target:p.target,label:p.label,diff:{before:p.before,after:p.after},receiptId:requestId,version:{id:v.id,parentId:p.versionId,number:v.number},previewHref:`/preview/${c.project_id}/v/${v.id}${p.target}`,actionsExecuted:true});
}
