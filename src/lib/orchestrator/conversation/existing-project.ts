import {proposeBookingClosures,confirmBookingClosures} from './local-booking-closures';
import {proposeBookingHours,confirmBookingHours} from './local-booking-hours';
import {bookingRecordsCandidate,listBookingRecords,bookingRecordsView} from './local-booking-records';
/** A1 : projection des acquis natifs, sans analyse, initialisation ni écriture budgétaire.
 * Les seules écritures métier optionnelles sont les retouches locales sous drapeau et accord explicite.
 * Aucun historique shop.chat n'est interprété comme un fait client.
 */
import { HttpError, type User } from '../../auth';
import { all, one, id, now, run, tx, readSnapshot } from '../../db';
import { loadProject } from '../../projects';
import { stableHash } from '../../brain/hash';
import { L } from '../../i18n-server';
import { ownedConversation, turnsOf, isExistingProjectRead } from './store';
import type { Command, ConversationRow, ConversationView } from './contract';
import {activeContextEnabled,observedActiveContext,resolveActiveContext} from './active-context';
import {contextPresentation} from './context-session';
import {metaOf} from './store';
import {existingLocalCapabilities,existingLocalOperation,existingLocalReads,type ExistingLocalCapabilities,type ExistingLocalReadCapabilities} from './existing-local-policy';
import {proposeLocalSite,confirmLocalSite,cancelLocalSite} from './local-site';
import {proposeLocalFiles,confirmLocalFiles} from './local-files';
import {proposeFolderRename,confirmFolderRename} from './local-folder-rename';
import {proposeFolderMove,confirmFolderMove} from './local-folder-move';
import {localPromptsCandidate,listLocalPrompts,localPromptsView} from './local-prompts';

const reason=(local?:ExistingLocalCapabilities|null)=>local?L('La fiche et les outils IA restent en lecture seule. Seules les retouches locales indiquées sont proposées à 0 €, puis appliquées après votre confirmation explicite. Aucun contenu n’est régénéré.', 'The brief and AI tools remain read-only. Only the listed local edits can be proposed at €0 and applied after your explicit confirmation. No content is regenerated.'):L('Projet existant repris en lecture seule. Le site, les médias, les droits et l’ancienne discussion sont conservés. Vous pouvez enregistrer des messages ; aucune réponse IA ni modification métier n’est activée dans A1.', 'Existing project resumed read-only. The site, media, entitlements and previous discussion are preserved. You may save messages; A1 enables no AI reply or business change.');

/** Noms contrôlés côté serveur ; ne crée pas les tables métier à la demande. */
const nativeTables=['studio_products','studio_variants','content_documents','blog_articles','posts','campaigns','biens','carte_items','realisations','salon_appointments','restaurant_reservations','cabinet_appointments'] as const;
function snapshot(c:ConversationRow){
  const pid=c.project_id!,p=loadProject(pid);
  const tables=new Set(all<{name:string}>("SELECT name FROM sqlite_master WHERE type='table'").map(r=>r.name));
  const references=nativeTables.map(table=>{
    if(!tables.has(table))return{source:table,count:0,available:false,refs:[],limit:50};
    const count=one<{n:number}>(`SELECT COUNT(*) n FROM ${table} WHERE project_id=?`,pid)!.n;
    // Les contenus de la première page sont hachés pour détecter aussi une retouche sans changement d'identifiant.
    // Rien de ces colonnes privées (réservations comprises) n'est renvoyé dans refs.
    const rows=all<Record<string,unknown>>(`SELECT * FROM ${table} WHERE project_id=? ORDER BY id LIMIT 50`,pid);
    return{source:table,count,available:true,refs:rows.map(r=>({id:String(r.id),version:stableHash('existing-native-row-1',r)})),limit:50};
  });
  const themeVersions=all<{id:string;number:number;parent_id:string|null}>("SELECT id,number,parent_id FROM theme_versions WHERE project_id=? ORDER BY number DESC LIMIT 50",pid);
  const theme=p.row.current_theme_version_id?one<{id:string;number:number;spec:string}>("SELECT id,number,spec FROM theme_versions WHERE id=? AND project_id=?",p.row.current_theme_version_id,pid):null;
  const media=all<{id:string;version:number;kind:string}>("SELECT id,version,kind FROM assets WHERE project_id=? AND user_id=? AND deleted_at IS NULL ORDER BY created_at DESC,id LIMIT 50",pid,c.user_id);
  const chat=one<{n:number}>("SELECT COUNT(*) n FROM chat_messages WHERE project_id=? AND thread='shop'",pid)!.n;
  const missing=[...(!p.brand?['brand']:[]),...(!theme?['theme']:[]),...(!p.product.summary?['offer.description']:[]),...(!p.services.email&&!p.services.phone?['contact']:[])];
  const data={
    schema:'existing-project-context-1' as const,projectId:pid,
    readingScope:'native_text_and_identifiers_no_media_analysis' as const,
    project:{name:p.name,business:p.business,platform:p.platform,source:'projects' as const},
    identity:{name:p.brand?.name??null,tagline:p.brand?.tagline??null,palette:p.brand?.palette??null,fonts:p.brand?.fonts??null,logoAssetId:p.brand?.logo?.assetId??null,validated:p.brand?.validated??[],source:'projects.brand_json' as const,version:stableHash('existing-brand-1',p.row.brand_json)},
    offer:{name:p.product.name,description:p.product.summary,source:'projects.product_json' as const},
    services:{items:p.services.services.map(s=>({name:s.name,description:s.description})),source:'projects.business_json' as const},
    theme:{current:theme?{id:theme.id,number:theme.number,version:stableHash('existing-theme-1',theme.spec)}:null,versions:themeVersions,count:one<{n:number}>("SELECT COUNT(*) n FROM theme_versions WHERE project_id=?",pid)!.n,limit:50,source:'theme_versions' as const},
    catalogue:{legacyCount:p.catalog.length,source:'projects.catalog_json' as const},
    media:{count:one<{n:number}>("SELECT COUNT(*) n FROM assets WHERE project_id=? AND user_id=? AND deleted_at IS NULL",pid,c.user_id)!.n,refs:media,limit:50,source:'assets' as const,contentRead:false as const},
    contents:references,
    previousShopChat:{present:chat>0,count:chat,source:'chat_messages:shop' as const,contentRead:false as const,href:`/studio/${pid}/boutique`},
    missing,notRead:['shop.chat.message_contents','media.bytes','external_sources'] as const,
  };
  return{data,p,version:stableHash('existing-project-context-1',{data,project:p.row})};
}
/** La fiche et les adaptateurs généraux restent fermés ; localEdits décrit l'exception gratuite exacte. */
export type ExistingProjectRecovery={schema:'existing-project-recovery-1';state:'read-only';context:ReturnType<typeof snapshot>['data'];contextVersion:string;observedAt:number;actionsEnabled:false;aiEnabled:false;providerCalls:0;localEdits?:ExistingLocalCapabilities;localReads?:ExistingLocalReadCapabilities};

export function existingProjectView(user:User,cid:string,before?:number):ConversationView{
  return readSnapshot(()=>{
    const c=ownedConversation(user,cid,true);
    if(!isExistingProjectRead(c))throw new HttpError(409,'conversation_not_existing_read');
    const {data,p,version}=snapshot(c);
    const local=existingLocalCapabilities(p.business==='services'),reads=existingLocalReads(p.business==='services'),metadata=metaOf(c);
    return{
      schema:'studio-conversation-1',id:c.id,projectId:c.project_id,revision:c.revision,projectRevision:null,mode:'local',progress:'review',
      message:reason(local),readOnlyReason:reason(local),question:null,correctionFields:[],creation:null,action:null,
      recovery:{schema:'existing-project-recovery-1',state:'read-only',context:data,contextVersion:version,observedAt:now(),actionsEnabled:false,aiEnabled:false,providerCalls:0,...(local?{localEdits:local}:{}),...(reads?{localReads:reads}:{})},
      ...(reads?.ops.includes('booking-records')?{bookingRecordsRead:{enabled:true as const},...(metadata.bookingRecords?{bookingRecords:bookingRecordsView(user,c,metadata.bookingRecords)}:{})}:{}),
      ...(reads?.ops.includes('prompts')?{localPromptsRead:{enabled:true as const},...(metadata.localPrompts?{localPrompts:localPromptsView(user,c,metadata.localPrompts)}:{})}:{}),
      ...(local?.ops.includes('booking-closures')?{bookingClosuresExecution:{enabled:true as const},...(metadata.bookingClosures?{bookingClosures:metadata.bookingClosures}:{})}:{}),
      ...(local?.ops.includes('booking-hours')?{bookingHoursExecution:{enabled:true as const},...(metadata.bookingHours?{bookingHours:metadata.bookingHours}:{})}:{}),
      ...(local?.ops.includes('local-site')?{localSiteExecution:{enabled:true as const},...(metadata.localSite?{localSite:metadata.localSite}:{})}:{}),
      ...(local?.ops.includes('files')?{localFilesExecution:{enabled:true as const},...(metadata.localFiles?{localFiles:metadata.localFiles}:{})}:{}),
      ...(local?.ops.includes('folder-rename')?{localFolderRenameExecution:{enabled:true as const},...(metadata.localFolderRename?{localFolderRename:metadata.localFolderRename}:{})}:{}),
      ...(local?.ops.includes('folder-move')?{localFolderMoveExecution:{enabled:true as const},...(metadata.localFolderMove?{localFolderMove:metadata.localFolderMove}:{})}:{}),
      tools:[{id:'brief.update',state:'unavailable',executionEnabled:false}],
      ...(activeContextEnabled()?{activeContext:{enabled:true as const,current:observedActiveContext(c,JSON.parse(c.state_json).activeContext),presentation:contextPresentation(c)}}:{}),
      summary:{description:p.product.summary,business:p.business,businessSource:'existing',target:'',goals:'',offerName:p.product.name,brandName:p.brand?.name??'',constraints:'',services:p.services.services.map(s=>({name:s.name,description:s.description,source:'projects.business_json'})),contactModes:p.services.contactModes??[],facts:[],unknown:data.missing,referenceUrls:[],photoIds:[],approved:false,preparationStatus:'absent'},
      ...turnsOf(c,before),
    };
  });
}

/** Fil A1, avec exception locale explicitement autorisée ; jamais classificateur, fiche ou outil payant. */
export function submitExistingProjectMessage(user:User,cid:string,cmd:Command,hash:string):ConversationView{
  return tx(()=>{
    const c=ownedConversation(user,cid,true);
    if(!isExistingProjectRead(c))throw new HttpError(409,'conversation_not_existing_read');
    const local=existingLocalCapabilities(loadProject(c.project_id!).business==='services'),operation=existingLocalOperation(cmd),localAllowed=!!operation&&!!local?.ops.includes(operation);
    const reads=existingLocalReads(loadProject(c.project_id!).business==='services'),recordsCommand=cmd.action==='message'&&bookingRecordsCandidate(cmd.text),recordsAllowed=reads?.ops.includes('booking-records')===true;
    const promptsCommand=cmd.action==='message'&&localPromptsCandidate(cmd.text),promptsAllowed=reads?.ops.includes('prompts')===true;
    // Le retrait du drapeau/droit ne transforme pas un ancien reçu en nouveau pouvoir d'exécution.
    if((cmd.action==='confirm-booking-closures'||cmd.action==='cancel-booking-closures'||cmd.action==='confirm-booking-hours'||cmd.action==='cancel-booking-hours'||cmd.action==='confirm-local'||cmd.action==='confirm-files'||cmd.action==='confirm-folder-rename'||cmd.action==='cancel-folder-rename'||cmd.action==='confirm-folder-move'||cmd.action==='cancel-folder-move')&&!localAllowed)throw new HttpError(409,reason(),'conversation_existing_read_only');
    const prior=one<{request_hash:string;response_json:string}>("SELECT request_hash,response_json FROM agent_conversation_turns WHERE conversation_id=? AND request_id=?",cid,cmd.requestId);
    if(prior){
      if(prior.request_hash!==hash)throw new HttpError(409,L('Cet identifiant correspond à une autre demande.','This identifier belongs to another request.'),'conversation_idempotency_conflict');
      // Même reçu de parole ; la relecture du contexte vivant passe par GET.
      const cached=JSON.parse(prior.response_json) as ConversationView;
      if(operation==='booking-closures'&&!localAllowed&&(cached.bookingClosures||cached.bookingClosuresExecution))throw new HttpError(409,'Les fermetures datées ne sont plus disponibles dans cette reprise. Aucune date modifiée.','conversation_existing_read_only');
      if(operation==='booking-hours'&&!localAllowed&&(cached.bookingHours||cached.bookingHoursExecution))throw new HttpError(409,'La retouche gratuite des horaires n’est plus disponible dans cette reprise. Aucun horaire modifié.','conversation_existing_read_only');
      if(recordsCommand&&!recordsAllowed&&(cached.bookingRecords||cached.bookingRecordsRead))throw new HttpError(409,'La lecture de ce planning n’est plus disponible dans cette reprise. Aucun rendez-vous modifié.','conversation_existing_read_only');
      if(promptsCommand&&!promptsAllowed&&(cached.localPrompts||cached.localPromptsRead))throw new HttpError(409,'La lecture de cette bibliothèque n’est plus disponible dans cette reprise. Aucun prompt exécuté.','conversation_existing_read_only');
      return cached;
    }
    if(cmd.revision!==c.revision||cmd.projectRevision!==null)throw new HttpError(409,L('La conversation a changé. Rechargez avant de répondre.','The conversation changed. Reload before replying.'),'conversation_conflict');
    if(c.revision>=1000)throw new HttpError(409,'conversation_limit');
    if(cmd.action!=='message'&&cmd.action!=='summary'&&!localAllowed)throw new HttpError(409,reason(),'conversation_existing_read_only');
    if(cmd.action==='message'&&(cmd.photoIds?.length||cmd.referenceUrls?.length))throw new HttpError(409,L('Les pièces jointes ne sont pas raccordées à la reprise A1. Votre demande n’a pas été appliquée.','Attachments are not connected to A1 recovery. Your request has not been applied.'),'conversation_existing_read_only');
    const metadata=JSON.parse(c.state_json) as import('./contract').ConversationState;
    if(cmd.action==='message'&&cmd.context){
      if(!activeContextEnabled())throw new HttpError(404,'conversation_context_disabled');
      const resolved=resolveActiveContext(c,cmd.context);metadata.activeContextTab=cmd.context.tab;
      if(cmd.context.target||!metadata.activeContext?.target){metadata.activeContext=resolved.selection;metadata.activeContextReference=stableHash('conversation-active-context-1',resolved);metadata.activeContextIdentity=resolved.canonical.identity;}
    }
    let localMessage:string|undefined;
    if(cmd.action==='message'){delete metadata.bookingClosures;delete metadata.bookingClosuresProposal;delete metadata.bookingHours;delete metadata.bookingHoursProposal;delete metadata.bookingRecords;delete metadata.localPrompts;delete metadata.localSiteProposal;delete metadata.localSite;delete metadata.localFilesProposal;delete metadata.localFiles;delete metadata.localFolderRenameProposal;delete metadata.localFolderRename;delete metadata.localFolderMoveProposal;delete metadata.localFolderMove;}
    if(recordsCommand){
      if(recordsAllowed){metadata.bookingRecords=listBookingRecords(user,c,metadata,(cmd as Extract<Command,{action:'message'}>).text);localMessage=metadata.bookingRecords.message;}
    }else if(promptsCommand){
      if(promptsAllowed){metadata.localPrompts=listLocalPrompts(user,c,(cmd as Extract<Command,{action:'message'}>).text);localMessage=metadata.localPrompts.message;}
    }else if(localAllowed){
      const active={...c,state_json:JSON.stringify(metadata)};
      if(operation==='booking-closures'){
        if(cmd.action==='cancel-booking-closures'){if(metadata.bookingClosuresProposal?.id!==cmd.proposalId)throw new HttpError(409,'Proposition de fermeture périmée.');delete metadata.bookingClosuresProposal;delete metadata.bookingClosures;localMessage='Fermeture datée annulée, aucun changement.';}
        else{metadata.bookingClosures=cmd.action==='confirm-booking-closures'?confirmBookingClosures(user,active,metadata,cmd.proposalId,cmd.requestId):proposeBookingClosures(user,active,metadata,(cmd as Extract<Command,{action:'message'}>).text);localMessage=metadata.bookingClosures.message;}
      }else if(operation==='booking-hours'){
        if(cmd.action==='cancel-booking-hours'){if(metadata.bookingHoursProposal?.id!==cmd.proposalId)throw new HttpError(409,'Proposition d’horaires périmée.');delete metadata.bookingHoursProposal;delete metadata.bookingHours;localMessage='Retouche des horaires annulée, aucun changement.';}
        else{metadata.bookingHours=cmd.action==='confirm-booking-hours'?confirmBookingHours(user,active,metadata,cmd.proposalId,cmd.requestId):proposeBookingHours(user,active,metadata,(cmd as Extract<Command,{action:'message'}>).text);localMessage=metadata.bookingHours.message;}
      }else if(operation==='local-site'){
        if(cmd.action==='cancel-local'){cancelLocalSite(metadata,cmd.proposalId);localMessage='Proposition gratuite annulée, aucune version modifiée.';}else{metadata.localSite=cmd.action==='confirm-local'?confirmLocalSite(user,active,metadata,cmd.proposalId,cmd.requestId):proposeLocalSite(user,active,metadata,(cmd as Extract<Command,{action:'message'}>).text);localMessage=metadata.localSite.message;}
      }else if(operation==='files'){
        metadata.localFiles=cmd.action==='confirm-files'?confirmLocalFiles(user,active,metadata,cmd.proposalId,cmd.requestId):proposeLocalFiles(user,active,metadata,(cmd as Extract<Command,{action:'message'}>).text);
        localMessage=metadata.localFiles.message;
      }else if(operation==='folder-rename'){
        if(cmd.action==='cancel-folder-rename'){if(metadata.localFolderRenameProposal?.id!==cmd.proposalId)throw new HttpError(409,'Proposition périmée.');delete metadata.localFolderRenameProposal;delete metadata.localFolderRename;localMessage='Renommage du dossier annulé, aucun changement.';}
        else{metadata.localFolderRename=cmd.action==='confirm-folder-rename'?confirmFolderRename(user,active,metadata,cmd.proposalId,cmd.requestId):proposeFolderRename(user,active,metadata,(cmd as Extract<Command,{action:'message'}>).text);localMessage=metadata.localFolderRename.message;}
      }else if(operation==='folder-move'){
        if(cmd.action==='cancel-folder-move'){if(metadata.localFolderMoveProposal?.id!==cmd.proposalId)throw new HttpError(409,'Proposition périmée.');delete metadata.localFolderMoveProposal;delete metadata.localFolderMove;localMessage='Déplacement du dossier annulé, aucun changement.';}
        else{metadata.localFolderMove=cmd.action==='confirm-folder-move'?confirmFolderMove(user,active,metadata,cmd.proposalId,cmd.requestId):proposeFolderMove(user,active,metadata,(cmd as Extract<Command,{action:'message'}>).text);localMessage=metadata.localFolderMove.message;}
      }else{
        throw new HttpError(409,'Opération locale non raccordée. Aucun changement.');
      }
    }
    const next=c.revision+1;
    run('UPDATE agent_conversations SET revision=?,state_json=?,updated_at=? WHERE id=? AND revision=?',next,JSON.stringify(metadata),now(),cid,c.revision);
    const response=existingProjectView(user,cid);
    response.history=[];response.historyBefore=null;
    response.message=localMessage??(cmd.action==='message'?L('Message exact enregistré dans le fil SYNA. Aucun contenu du projet modifié, aucun appel IA.','Exact message saved in the SYNA thread. No project content changed; no AI request.'):reason(local));
    run('INSERT INTO agent_conversation_turns (id,conversation_id,revision,request_id,request_hash,request_json,response_json,created_at) VALUES (?,?,?,?,?,?,?,?)',id(),cid,next,cmd.requestId,hash,JSON.stringify(cmd),JSON.stringify(response),now());
    return response;
  });
}
