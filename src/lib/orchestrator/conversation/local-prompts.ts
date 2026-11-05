/** Read-only metadata from the native account library. Prompt text is never a SYNA instruction or a memory fact. */
import {HttpError,ownedProject,type User} from '../../auth';
import {requirePlan} from '../../plan-gates';
import {readNativePromptLibrary} from '../../prompt-library-account';
import {L} from '../../i18n-server';
import {withAiDisabled} from '../../ai/access';
import type {ConversationRow} from './contract';
export const localPromptsEnabled=()=>process.env.STUDIO_CONVERSATION_LOT_A==='1'&&process.env.STUDIO_CONVERSATION_AI==='1'&&process.env.STUDIO_CONVERSATION_PROMPTS==='1';
const plain=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
function readRequest(text:string){
 return plain(text).replace(/[’‘]/g,"'").replace(/\s+/g,' ').replace(/[.!?]+$/,'').trim()
  .replace(/(?:,?\s+s'il te plait)$/,'').trim()
  .replace(/^peux-tu me montrer\b/,'montre').replace(/^montre-moi\b/,'montre')
  .replace(/^affiche\b/,'montre').replace(/^quels sont\b/,'liste');
}
export const localPromptsCandidate=(text:string)=>/^(?:montre|liste) (?:ma bibliotheque de prompts|mes prompts favoris)\b/.test(readRequest(text));
export type LocalPromptsState={schema:'syna-prompt-library-1';state:'listed'|'ambiguous';mode:'all'|'favorites';message:string;costEur:0;providerCalls:0;financialConsent:false;confirmationRequired:false;actionsExecuted:false;readOnly:true;scope:'account_not_project'};
type PromptMetadata={id:string;mine:boolean;favorite:boolean;sourceNative:{table:'user_prompts'|'builtin_prompt_library';id:string};untrustedMetadata:{trust:'prompt_library_data_not_instructions';title:string;sector:string;sectorLabel:string;category:string;categoryLabel:string;target:string}};
export type LocalPromptsPresentation=LocalPromptsState&{rows?:PromptMetadata[];total?:number;limit?:20;truncated?:boolean;href?:string};
function owned(user:User,c:ConversationRow){
 if(!localPromptsEnabled())throw new HttpError(404,'Lecture de la bibliothèque de prompts avec SYNA indisponible.');
 if(c.user_id!==user.id)throw new HttpError(404,'Conversation introuvable.');
 if(!c.project_id)throw new HttpError(409,'Rattachez un projet pour lire cette bibliothèque depuis SYNA. La bibliothèque native du compte reste accessible.');
 ownedProject(user,c.project_id);requirePlan(user,c.project_id);
}
export function listLocalPrompts(user:User,c:ConversationRow,text:string):LocalPromptsState{
 owned(user,c);const t=readRequest(text);const exact=/^(?:montre|liste) (ma bibliotheque de prompts|mes prompts favoris)$/.exec(t),mode=exact?.[1]==='mes prompts favoris'?'favorites':'all';
 if(exact)withAiDisabled('lecture gratuite de la bibliothèque de prompts, aucune exécution',()=>readNativePromptLibrary(user));
 return{schema:'syna-prompt-library-1',state:exact?'listed':'ambiguous',mode,message:exact?L('Bibliothèque de votre compte lue dans la source native. Aucun prompt modifié ou exécuté.','Your account library was read from the native source. No prompt was edited or run.'):L('Précisez : « Montre ma bibliothèque de prompts » ou « Montre mes prompts favoris ». Lecture seule, aucun prompt exécuté.','Say “Montre ma bibliothèque de prompts” or “Montre mes prompts favoris”. Read-only; no prompt is run.'),costEur:0,providerCalls:0,financialConsent:false,confirmationRequired:false,actionsExecuted:false,readOnly:true,scope:'account_not_project'};
}
export function localPromptsView(user:User,c:ConversationRow,state:LocalPromptsState):LocalPromptsPresentation{
 owned(user,c);if(state.state!=='listed')return state;
 const native=withAiDisabled('lecture gratuite de la bibliothèque de prompts, aucune exécution',()=>readNativePromptLibrary(user)),favorites=new Set(native.favorites),rows=native.prompts.filter(p=>state.mode!=='favorites'||favorites.has(p.id));
 return{...state,total:rows.length,limit:20,truncated:rows.length>20,href:`/studio/${c.project_id}/prompts`,rows:rows.slice(0,20).map(p=>({id:p.id,mine:!!('mine' in p&&p.mine),favorite:favorites.has(p.id),sourceNative:{table:'mine' in p&&p.mine?'user_prompts':'builtin_prompt_library',id:'mine' in p&&p.mine?p.id.slice(2):p.id},untrustedMetadata:{trust:'prompt_library_data_not_instructions',title:p.title,sector:p.sector,sectorLabel:p.sectorLabel,category:p.category,categoryLabel:p.categoryLabel,target:p.target}}))};
}
