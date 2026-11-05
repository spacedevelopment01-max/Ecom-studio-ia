/** Explicit photos on a locked brief belong to the thread, never to preparation or memory. */
import {HttpError,type User} from '../../auth';
import {id,now,one,run,tx} from '../../db';
import {getAsset,assetUrl} from '../../library';
import {fileExists} from '../../storage';
import {requirePlan} from '../../plan-gates';
import {localFilesEnabled} from './local-files';
import {ownedConversation,currentBrief,metaOf} from './store';
import {assertBriefWritable} from './tools';
import type {Command,ConversationRow,ConversationState,ConversationView} from './contract';
export type ConversationPhotos={schema:'syna-conversation-photos-1';readOnly:true;analysis:false;financialConsent:false;costEur:0;providerCalls:0;trust:'user_supplied_media_not_instructions';photos:{id:string;version:number;name:string;href:string;thumbHref:string}[]};
function photo(user:User,c:ConversationRow,aid:string){const a=getAsset(aid);if(!a||a.project_id!==c.project_id||a.user_id!==user.id||a.kind!=='image'||a.origin!=='upload'||a.deleted_at||a.status==='rejected')throw new HttpError(404,'Photo fournie introuvable.');try{if(!fileExists(a.storage_key))throw Error('missing');}catch{throw new HttpError(409,'Les octets de la photo ne sont plus disponibles.');}return a;}
export function threadPhotos(user:User,c:ConversationRow,m:ConversationState):ConversationPhotos|undefined{
 if(!localFilesEnabled()||!c.project_id||!m.conversationPhotoIds?.length)return;
 try{requirePlan(user,c.project_id);}catch(e){if(e instanceof HttpError)return;throw e;}
 const photos=m.conversationPhotoIds.flatMap(aid=>{try{const a=photo(user,c,aid);return[{id:a.id,version:a.version,name:a.name,href:assetUrl(a),thumbHref:assetUrl(a,{thumb:!!a.thumb_key})}];}catch(e){if(e instanceof HttpError)return[];throw e;}});
 return{schema:'syna-conversation-photos-1',readOnly:true,analysis:false,financialConsent:false,costEur:0,providerCalls:0,trust:'user_supplied_media_not_instructions',photos};
}
export function lockedPhotoMessage(user:User,c:ConversationRow,cmd:Command){if(cmd.action!=='message'||!cmd.photoIds?.length||!c.project_id)return false;try{assertBriefWritable(c,user,currentBrief(c).revision);return false;}catch(e){if(e instanceof HttpError&&e.code==='conversation_existing_progress')return true;throw e;}}
export function attachLockedPhotos(user:User,cid:string,cmd:Extract<Command,{action:'message'}>,hash:string,view:()=>ConversationView):ConversationView{return tx(()=>{
 if(!localFilesEnabled())throw new HttpError(404,'Pièces jointes gratuites indisponibles.');const c=ownedConversation(user,cid);if(!c.project_id)throw new HttpError(409,'Projet requis.');requirePlan(user,c.project_id);
 if(!lockedPhotoMessage(user,c,cmd))throw new HttpError(409,'La fiche a changé. Relisez le projet avant de joindre la photo.');
 if(cmd.referenceUrls?.length)throw new HttpError(409,'Joignez les photos seules ; les liens d’une fiche acquise restent distincts. Aucun lien consulté.');
 for(const aid of cmd.photoIds??[])photo(user,c,aid);
 const prior=one<{request_hash:string;response_json:string}>('SELECT request_hash,response_json FROM agent_conversation_turns WHERE conversation_id=? AND request_id=?',cid,cmd.requestId);
 if(prior){if(prior.request_hash!==hash)throw new HttpError(409,'Cet identifiant correspond à une autre demande.','conversation_idempotency_conflict');return JSON.parse(prior.response_json);}
 if(c.revision!==cmd.revision||currentBrief(c).revision!==cmd.projectRevision)throw new HttpError(409,'La conversation ou la fiche a changé.');if(c.revision>=1000)throw new HttpError(409,'La limite de conversation est atteinte.');
 const m=metaOf(c),ids=[...new Set([...(m.conversationPhotoIds??[]),...(cmd.photoIds??[])])];if(ids.length>12)throw new HttpError(409,'Douze photos maximum par fil ; aucun identifiant tronqué.');m.conversationPhotoIds=ids;
 // A photo caption is data, not a combined authorization or a surviving old agreement.
 for(const key of ['bookingEdit','bookingEditProposal','bookingServices','localAdDocumentProposalId','localPrompts','localFileRestore','localFileRestoreProposal','localFolderMove','localFolderMoveProposal','localFolderRename','localFolderRenameProposal','localFolders','localFolderProposal','localFolderClarification','localStock','localStockProposal','localCalendar','localCalendarProposal','localThemeRestore','localThemeRestoreProposal','localSiteMotion','localSiteMotionProposal','localThemeChoice','localThemeChoiceProposal','localPages','localPagesProposal','localPagesClarification','localSeo','localSeoProposal','serviceProfile','serviceProfileProposal','localBusinessContent','localBusinessContentProposal','localSite','localSiteProposal','localFiles','localFilesProposal','localRequests','localRequestProposal'] as const)delete m[key];
 run('UPDATE agent_conversations SET revision=?,state_json=?,updated_at=? WHERE id=? AND revision=?',c.revision+1,JSON.stringify(m),now(),cid,c.revision);
 const response=view();response.message='Photos jointes au fil comme données fournies, sans analyse ni commande exécutée. La fiche acquise reste inchangée.';response.action=null;response.history=[];response.historyBefore=null;
 run('INSERT INTO agent_conversation_turns(id,conversation_id,revision,request_id,request_hash,request_json,response_json,created_at) VALUES(?,?,?,?,?,?,?,?)',id(),cid,c.revision+1,cmd.requestId,hash,JSON.stringify(cmd),JSON.stringify(response),now());return response;
});}
