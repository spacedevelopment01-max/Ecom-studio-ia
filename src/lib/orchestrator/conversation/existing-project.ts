/** A1 : projection des acquis natifs, sans analyse, initialisation ni écriture métier/budget.
 * Aucun historique shop.chat n'est interprété comme un fait client.
 */
import { HttpError, type User } from '../../auth';
import { all, one, id, now, run, tx, readSnapshot } from '../../db';
import { loadProject } from '../../projects';
import { stableHash } from '../../brain/hash';
import { L } from '../../i18n-server';
import { ownedConversation, turnsOf, isExistingProjectRead } from './store';
import type { Command, ConversationRow, ConversationView } from './contract';

const reason=()=>L('Projet existant repris en lecture seule. Le site, les médias, les droits et l’ancienne discussion sont conservés. Vous pouvez enregistrer des messages ; aucune réponse IA ni modification métier n’est activée dans A1.', 'Existing project resumed read-only. The site, media, entitlements and previous discussion are preserved. You may save messages; A1 enables no AI reply or business change.');

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
export type ExistingProjectRecovery={schema:'existing-project-recovery-1';state:'read-only';context:ReturnType<typeof snapshot>['data'];contextVersion:string;observedAt:number;actionsEnabled:false;aiEnabled:false;providerCalls:0};

export function existingProjectView(user:User,cid:string,before?:number):ConversationView{
  return readSnapshot(()=>{
    const c=ownedConversation(user,cid,true);
    if(!isExistingProjectRead(c))throw new HttpError(409,'conversation_not_existing_read');
    const {data,p,version}=snapshot(c);
    return{
      schema:'studio-conversation-1',id:c.id,projectId:c.project_id,revision:c.revision,projectRevision:null,mode:'local',progress:'review',
      message:reason(),readOnlyReason:reason(),question:null,correctionFields:[],creation:null,action:null,
      recovery:{schema:'existing-project-recovery-1',state:'read-only',context:data,contextVersion:version,observedAt:now(),actionsEnabled:false,aiEnabled:false,providerCalls:0},
      tools:[{id:'brief.update',state:'unavailable',executionEnabled:false}],
      summary:{description:p.product.summary,business:p.business,businessSource:'existing',target:'',goals:'',offerName:p.product.name,brandName:p.brand?.name??'',constraints:'',services:p.services.services.map(s=>({name:s.name,description:s.description,source:'projects.business_json'})),contactModes:p.services.contactModes??[],facts:[],unknown:data.missing,referenceUrls:[],photoIds:[],approved:false,preparationStatus:'absent'},
      ...turnsOf(c,before),
    };
  });
}

/** Enregistrer le texte exact et les reçus du fil uniquement. Pas de classificateur même si AI=0. */
export function submitExistingProjectMessage(user:User,cid:string,cmd:Command,hash:string):ConversationView{
  return tx(()=>{
    const c=ownedConversation(user,cid,true);
    if(!isExistingProjectRead(c))throw new HttpError(409,'conversation_not_existing_read');
    const prior=one<{request_hash:string;response_json:string}>("SELECT request_hash,response_json FROM agent_conversation_turns WHERE conversation_id=? AND request_id=?",cid,cmd.requestId);
    if(prior){
      if(prior.request_hash!==hash)throw new HttpError(409,L('Cet identifiant correspond à une autre demande.','This identifier belongs to another request.'),'conversation_idempotency_conflict');
      // Même reçu de parole ; la relecture du contexte vivant passe par GET.
      return JSON.parse(prior.response_json) as ConversationView;
    }
    if(cmd.revision!==c.revision||cmd.projectRevision!==null)throw new HttpError(409,L('La conversation a changé. Rechargez avant de répondre.','The conversation changed. Reload before replying.'),'conversation_conflict');
    if(cmd.action!=='message'&&cmd.action!=='summary')throw new HttpError(409,reason(),'conversation_existing_read_only');
    if(cmd.action==='message'&&(cmd.context||cmd.photoIds?.length||cmd.referenceUrls?.length))throw new HttpError(409,L('Les pièces jointes et sélections ne sont pas raccordées à la reprise A1. Votre demande n’a pas été appliquée.','Attachments and selections are not connected to A1 recovery. Your request has not been applied.'),'conversation_existing_read_only');
    if(c.revision>=1000)throw new HttpError(409,'conversation_limit');
    const next=c.revision+1;
    run('UPDATE agent_conversations SET revision=?,updated_at=? WHERE id=? AND revision=?',next,now(),cid,c.revision);
    const response=existingProjectView(user,cid);
    response.history=[];response.historyBefore=null;
    response.message=cmd.action==='message'?L('Message exact enregistré dans le fil SYNA. Aucun contenu du projet modifié, aucun appel IA.','Exact message saved in the SYNA thread. No project content changed; no AI request.'):reason();
    run('INSERT INTO agent_conversation_turns (id,conversation_id,revision,request_id,request_hash,request_json,response_json,created_at) VALUES (?,?,?,?,?,?,?,?)',id(),cid,next,cmd.requestId,hash,JSON.stringify(cmd),JSON.stringify(response),now());
    return response;
  });
}
