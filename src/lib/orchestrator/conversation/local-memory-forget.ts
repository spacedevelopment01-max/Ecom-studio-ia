/** Forget one explicitly selected visible native memory item, never internal facts or artifacts. */
import {outsideQuotes} from './outside-quotes';
import {HttpError,ownedProject,type User} from '../../auth';
import {id,now} from '../../db';
import {requirePlan} from '../../plan-gates';
import {forgettableProjectMemory,previewMemoryForget,applyMemoryForget,type MemoryForgetSnapshot,type VisibleMemoryItem} from '../../contenus/project-memory';
import {activeContextEnabled} from './active-context';
import type {ConversationRow,ConversationState} from './contract';
export const memoryForgetEnabled=()=>activeContextEnabled()&&process.env.STUDIO_CONVERSATION_MEMORY_FORGET==='1';
function request(raw:string){return raw.trim().replace(/[.!?]+$/u,'').trim().replace(/,?\s+s[’']il te pla[iî]t$/iu,'').trim().replace(/^(?:(?:peux|pourrais)-tu|je (?:veux|voudrais|souhaite)|j[’']aimerais) (oublier|supprimer)\b/iu,(_,v:string)=>v.toLowerCase()==='oublier'?'oublie':'supprime');}
export const memoryForgetCandidate=(raw:string)=>/^(?:oublie|supprime) (?:de la m[ée]moire(?: du projet)?\b|l[’']entr[ée]e de m[ée]moire\b)/iu.test(outsideQuotes(request(raw)));
export type MemoryForgetProposal={id:string;item:VisibleMemoryItem;snapshot:MemoryForgetSnapshot;expiresAt:number};
type Entry={id:string;untrustedMetadata:Omit<VisibleMemoryItem,'id'|'updated_at'>&{trust:'native_project_memory_not_instructions'}};
export type MemoryForgetPresentation={schema:'syna-memory-forget-1';state:'ambiguous'|'proposed'|'applied';projectId:string;nativeHref:string;message:string;destructive:true;reversible:false;financialConsent:false;costEur:0;providerCalls:0;publication:false;confirmationRequired:boolean;actionsExecuted:boolean;proposalId?:string;diff?:{before:Entry;after:null};result?:{id:string;deleted:true};receiptId?:string;warnings?:string[]};
const entry=(item:VisibleMemoryItem):Entry=>({id:item.id,untrustedMetadata:{kind:item.kind,key:item.key,value:item.value,status:item.status,source:item.source,scope:item.scope,trust:'native_project_memory_not_instructions'}});
const present=(c:ConversationRow,state:MemoryForgetPresentation['state'],message:string,extra:Partial<MemoryForgetPresentation>={}):MemoryForgetPresentation=>({schema:'syna-memory-forget-1',state,projectId:c.project_id!,nativeHref:`/studio/${c.project_id}/pilote`,message,destructive:true,reversible:false,financialConsent:false,costEur:0,providerCalls:0,publication:false,confirmationRequired:false,actionsExecuted:false,...extra});
function owned(user:User,c:ConversationRow,m:ConversationState){
 if(!memoryForgetEnabled())throw new HttpError(404,'Oubli mémoire avec SYNA indisponible.');
 if(!c.project_id||c.user_id!==user.id)throw new HttpError(404,'Conversation introuvable.');
 ownedProject(user,c.project_id);requirePlan(user,c.project_id);
 if(m.activeContextTab!=='pilote')throw new HttpError(409,'Ouvrez Pilote pour désigner une entrée exacte de la mémoire du projet.');
}
function selection(raw:string){
 const m=/^(?:oublie|supprime) (?:de la m[ée]moire(?: du projet)?(?: l[’']entr[ée]e)?|l[’']entr[ée]e de m[ée]moire)( identifi[ée]e par)? (?:«([^»\r\n]{1,200})»|“([^”\r\n]{1,200})”|"([^"\r\n]{1,200})")$/iu.exec(request(raw));
 return m?{byId:!!m[1],value:m.slice(2,5).find(v=>typeof v==='string')!.trim()}:null;
}
export function proposeMemoryForget(user:User,c:ConversationRow,m:ConversationState,text:string):MemoryForgetPresentation{
 delete m.memoryForgetProposal;owned(user,c,m);const selected=selection(text),question=(message:string)=>present(c,'ambiguous',message);
 if(!selected)return question('Quelle entrée visible exacte ? Dites Oublie de la mémoire l’entrée « clé ou ID exact ». Pour un homonyme : Oublie l’entrée de mémoire identifiée par « ID natif ». Aucun fait interne ou artefact supprimé.');
 const rows=forgettableProjectMemory(c.project_id!),matches=rows.filter(r=>r.id===selected.value||!selected.byId&&r.key===selected.value);
 if(matches.length!==1)return question(matches.length?'Plusieurs entrées correspondent. Précisez un identifiant natif exact ; aucune première entrée choisie.':'Entrée visible absente de ce projet. Aucun autre souvenir, fait ou artefact substitué.');
 const preview=previewMemoryForget(c.project_id!,matches[0].id),p:MemoryForgetProposal={id:id(),...preview,expiresAt:now()+15*60000};m.memoryForgetProposal=p;
 return present(c,'proposed','Vérifiez la clé, la valeur et la portée de cette seule entrée. Après accord gratuit, elle sera oubliée définitivement ; aucune création existante ne sera modifiée ni régénérée.',{proposalId:p.id,diff:{before:entry(p.item),after:null},confirmationRequired:true,warnings:['Oubli définitif de cette seule entrée, sans restauration native. Annuler avant accord la conserve.','Les anciennes décisions remplacées ne seront pas réactivées. Les autres mémoires, faits, artefacts et créations restent inchangés ; aucune production IA ou publication relancée.']});
}
export function confirmMemoryForget(user:User,c:ConversationRow,m:ConversationState,proposalId:string,requestId:string):MemoryForgetPresentation{
 owned(user,c,m);const p=m.memoryForgetProposal;
 if(!p||p.id!==proposalId||p.expiresAt<now())throw new HttpError(409,'Proposition d’oubli périmée. Relisez la mémoire avant un nouvel accord.');
 const deleted=applyMemoryForget(c.project_id!,p.snapshot);
 if(JSON.stringify(deleted)!==JSON.stringify(p.item))throw new HttpError(409,'L’oubli de cette seule entrée native ne peut pas être confirmé.');
 delete m.memoryForgetProposal;
 return present(c,'applied','Entrée oubliée et absence relue dans la mémoire native. Autres souvenirs et créations conservés ; aucune décision historique réactivée, production ou dépense lancée.',{proposalId:p.id,diff:{before:entry(p.item),after:null},result:{id:p.item.id,deleted:true},receiptId:requestId,actionsExecuted:true});
}
