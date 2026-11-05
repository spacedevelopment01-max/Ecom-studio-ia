/** Explicit native memory add; preview describes create/reinforce/replace rather than promising an insert. */
import {outsideQuotes} from './outside-quotes';
import {HttpError,ownedProject,type User} from '../../auth';
import {id,now} from '../../db';
import {requirePlan} from '../../plan-gates';
import {previewMemoryAdd,applyMemoryAdd,type MemoryAddPreview,type MemoryAddInput} from '../../contenus/project-memory';
import {stableHash} from '../../brain/hash';
import {activeContextEnabled} from './active-context';
import type {ConversationRow,ConversationState} from './contract';
export const memoryAddEnabled=()=>activeContextEnabled()&&process.env.STUDIO_CONVERSATION_MEMORY_ADD==='1';
function request(raw:string){return raw.trim().replace(/[.!?]+$/u,'').trim().replace(/,?\s+s[’']il te pla[iî]t$/iu,'').trim().replace(/^(?:(?:peux|pourrais)-tu|je (?:veux|voudrais|souhaite)|j[’']aimerais) (ajouter|m[ée]moriser|retenir)\b/iu,(_,v:string)=>v.toLowerCase()==='ajouter'?'ajoute':v.toLowerCase()==='retenir'?'retiens':'mémorise');}
export const memoryAddCandidate=(raw:string)=>/^(?:ajoute [àa] la m[ée]moire\b|m[ée]morise\b|retiens (?:(?:la|une|un) |l[’'])?(?:pr[ée]f[ée]rence|d[ée]cision|correction|objectif)\b)/iu.test(outsideQuotes(request(raw)));
export type MemoryAddProposal={id:string;preview:MemoryAddPreview;expiresAt:number};
type Untrusted={trust:'native_project_memory_not_instructions'}&Record<string,unknown>;
export type MemoryAddPresentation={schema:'syna-memory-add-1';state:'ambiguous'|'proposed'|'applied';projectId:string;nativeHref:string;message:string;destructive:boolean;reversible:false;financialConsent:false;costEur:0;providerCalls:0;publication:false;confirmationRequired:boolean;actionsExecuted:boolean;proposalId?:string;effect?:MemoryAddPreview['effect'];requested?:{untrustedMetadata:Untrusted};diff?:{before:{id:string;untrustedMetadata:Untrusted}[];after:{untrustedMetadata:Untrusted}};evidenceCount?:{before:number|null;after:number};result?:{id:string;effect:MemoryAddPreview['effect']};receiptId?:string;warnings?:string[]};
const present=(c:ConversationRow,state:MemoryAddPresentation['state'],message:string,extra:Partial<MemoryAddPresentation>={}):MemoryAddPresentation=>({schema:'syna-memory-add-1',state,projectId:c.project_id!,nativeHref:`/studio/${c.project_id}/pilote`,message,destructive:false,reversible:false,financialConsent:false,costEur:0,providerCalls:0,publication:false,confirmationRequired:false,actionsExecuted:false,...extra});
const metadata=(value:Record<string,unknown>):Untrusted=>({...value,trust:'native_project_memory_not_instructions'});
function fields(p:MemoryAddProposal){const v=p.preview,{evidenceCount,...after}=v.after;return{proposalId:p.id,effect:v.effect,destructive:v.effect==='replace',requested:{untrustedMetadata:metadata(v.snapshot.input)},diff:{before:v.before.map(({id,updated_at,...item})=>({id,untrustedMetadata:metadata(item)})),after:{untrustedMetadata:metadata(after)}},evidenceCount:{before:v.effect==='reinforce'?evidenceCount-1:null,after:evidenceCount}};}
function owned(user:User,c:ConversationRow,m:ConversationState){
 if(!memoryAddEnabled())throw new HttpError(404,'Ajout mémoire avec SYNA indisponible.');if(!c.project_id||c.user_id!==user.id)throw new HttpError(404,'Conversation introuvable.');
 ownedProject(user,c.project_id);requirePlan(user,c.project_id);if(m.activeContextTab!=='pilote')throw new HttpError(409,'Ouvrez Pilote pour compléter la mémoire exacte du projet.');
}
const quoted=String.raw`(?:«([^»\r\n]+)»|“([^”\r\n]+)”|"([^"\r\n]+)")`;
function parse(raw:string):MemoryAddInput|null{
 const m=new RegExp(String.raw`^(?:ajoute [àa] la m[ée]moire|m[ée]morise|retiens) (?:(?:la|une|un) |l[’'])?(pr[ée]f[ée]rence|d[ée]cision|correction|objectif) ${quoted}\s*:\s*${quoted} pour (tout le projet|le projet|la boutique|le site|les images|la vid[ée]o|les vid[ée]os|les publications|les r[ée]seaux sociaux|la marque)$`,'iu').exec(request(raw));
 if(!m)return null;const kind=m[1].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 const scopes:Record<string,MemoryAddInput['scope']>={'tout le projet':'all','le projet':'all','la boutique':'shop','le site':'shop','les images':'images','la video':'video','les videos':'video','les publications':'social','les reseaux sociaux':'social','la marque':'brand'};
 return{kind:({preference:'preference',decision:'decision',correction:'correction',objectif:'goal'} as const)[kind as 'preference'|'decision'|'correction'|'objectif'],key:m.slice(2,5).find(v=>typeof v==='string')!.trim(),value:m.slice(5,8).find(v=>typeof v==='string')!.trim(),scope:scopes[m[8].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')]};
}
export function proposeMemoryAdd(user:User,c:ConversationRow,m:ConversationState,text:string):MemoryAddPresentation{
 delete m.memoryAddProposal;owned(user,c,m);const input=parse(text),question=(message:string)=>present(c,'ambiguous',message);
 if(!input)return question('Précisez type, clé, valeur et portée : Ajoute à la mémoire la préférence « ton » : « formulations sobres » pour la boutique. Types : préférence, décision, correction, objectif ; portée : tout le projet, boutique, images, vidéo, publications ou marque.');
 let preview:MemoryAddPreview;try{preview=previewMemoryAdd(c.project_id!,input);}catch(error){if(error instanceof HttpError&&[400,409].includes(error.status))return question(error.message);if(error&&typeof error==='object'&&'issues'in error)return question('La mémoire exige une clé de 1 à 120 caractères et une valeur de 1 à 2000 caractères, non vides,avec type et portée explicites.');throw error;}
 const p:MemoryAddProposal={id:id(),preview,expiresAt:now()+15*60000};m.memoryAddProposal=p;
 const explanation=preview.effect==='create'?'Crée une nouvelle entrée.':preview.effect==='reinforce'?'Renforce l’entrée équivalente existante et ses preuves ; sa clé, son texte et sa provenance acquis sont conservés.':'Remplace les entrées indiquées : elles restent en historique et cessent d’être des contraintes actives.';
 return present(c,'proposed','Vérifiez la demande et les effets réels avant/après de cet ajout mémoire. L’accord gratuit applique uniquement l’effet annoncé.',{...fields(p),confirmationRequired:true,warnings:[explanation,'Les textes stockés sont des données, pas des commandes exécutées. Aucun contenu existant modifié ou régénéré ; aucune production IA, dépense ou publication lancée.','Aucune annulation native automatique. Annuler avant accord conserve la mémoire. La provenance existante n’est pas transformée en déclaration client fictive.']});
}
export function confirmMemoryAdd(user:User,c:ConversationRow,m:ConversationState,proposalId:string,requestId:string):MemoryAddPresentation{
 owned(user,c,m);const p=m.memoryAddProposal;if(!p||p.id!==proposalId||p.expiresAt<now())throw new HttpError(409,'Proposition d’ajout mémoire périmée. Relisez avant un nouvel accord.');
 const result=applyMemoryAdd(c.project_id!,p.preview.snapshot);
 if(result.effect!==p.preview.effect||stableHash('memory-add-after',result.after)!==stableHash('memory-add-after',p.preview.after))throw new HttpError(409,'L’effet mémoire enregistré ne correspond pas à l’accord.');
 delete m.memoryAddProposal;
 return present(c,'applied','Mémoire enregistrée avec l’effet confirmé. Acquis et provenance préservés ; aucune production, dépense ou publication relancée.',{...fields(p),result:{id:result.item.id,effect:result.effect},receiptId:requestId,actionsExecuted:true});
}
