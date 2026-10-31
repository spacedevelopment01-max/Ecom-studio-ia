/** D3 : adaptateur de l’export CMS natif, même conversation et bibliothèque du propriétaire. */
import {createHash} from 'node:crypto';
import {unzipSync} from 'fflate';
import {z} from 'zod';
import {HttpError,type User} from '../../auth';
import {all,id,json,now,one,tx,readSnapshot} from '../../db';
import {currentTheme,remember} from '../../projects';
import {requirePlan} from '../../plan-gates';
import {getAsset,assetData,type Asset} from '../../library';
import {enqueue,getJob,publicJob,UserFacingError,type JobContext} from '../../jobs';
import {withAiDisabled} from '../../ai/access';
import {stableHash} from '../../brain/hash';
import {withStudioProducts} from '../../products/catalog';
import {withContenus} from '../../contenus';
import {exportAndRecord} from '../../cms-v2/record';
import {stateOf} from '../../preparation/store';
import {L} from '../../i18n-server';
import {ownedConversation,metaOf} from './store';
import {conversationExportsEnabled} from './tool-flags';
import type {ExportToolCommand} from './export-tool-contract';
import type {CmsPlatform} from '../../cms-v2/types';

type Meta={schema:1;id:string;conversationId:string;sourceReceiptId?:string;revision:number;projectRevision:number;versionId:string;versionNumber:number;platform:CmsPlatform;sourceDigest:string;createdAt:number;expiresAt:number;jobId?:string;assetId?:string;zipSha256?:string;reusedFrom?:string};
type Proof={schema:number;jobId:string|null;zipSha256:string;sourceDigest:string};
const key=(qid:string)=>`agent.export.tool.${qid}`;
function owned(u:User,cid:string){if(!conversationExportsEnabled())throw new HttpError(404,L('Exports de SYNA indisponibles.','SYNA exports are unavailable.'));const c=ownedConversation(u,cid);if(!c.project_id)throw new HttpError(409,L('Créez le projet et son Site avant l’export.','Create the project and its Site before exporting.'));requirePlan(u,c.project_id);return{c,pid:c.project_id};}
function save(pid:string,m:Meta){remember(pid,{kind:'artifact',key:key(m.id),value:JSON.stringify(m),source:'local',origin:'system',status:'inferred'});}
function read(pid:string,qid:string){return json<Meta|null>(one<{value:string}>("SELECT value FROM memory WHERE project_id=? AND kind='artifact' AND key=?",pid,key(qid))?.value,null);}
function ownedMeta(u:User,cid:string,qid:string){const{c,pid}=owned(u,cid),m=read(pid,qid);if(!m||m.conversationId!==cid)throw new HttpError(404,L('Export introuvable.','Export not found.'));return{c,pid,m};}
export function currentSiteSource(pid:string,versionId:string){const cur=currentTheme(pid);if(!cur||cur.version.id!==versionId)throw new HttpError(409,L('Le Site a changé ; actualisez les versions avant de préparer l’export.','The Site has changed. Refresh its versions before preparing an export.'));if(cur.spec.meta?.demo?.isDemo)throw new HttpError(409,L('La démonstration est protégée ; utilisez le Site de votre projet.','The demo is protected. Use your project Site.'));const spec=withStudioProducts(withContenus(cur.spec,pid),pid);return{version:cur.version,spec,sourceDigest:stableHash('native-export-source-v1',spec)};}
function validFile(a:Asset|undefined,pid:string,m:Pick<Meta,'versionId'|'platform'|'sourceDigest'>,jobId?:string){
 if(!a||a.project_id!==pid||a.user_id!==one<{user_id:string}>('SELECT user_id FROM projects WHERE id=?',pid)?.user_id||a.deleted_at||a.kind!=='archive'||a.role!=='theme-export'||a.origin!=='export'||a.mime!=='application/zip'||a.status==='rejected')return null;
 const meta=json<{platform?:string;versionId?:string;proof?:Proof;scope?:string;message?:string;gate?:{verdict?:string;checkId?:string;checked?:unknown};unmeasured?:unknown}>(a.meta,{}),p=meta.proof;
 if(!p||p.schema!==1||meta.versionId!==m.versionId||meta.platform!==m.platform||p.sourceDigest!==m.sourceDigest||jobId&&p.jobId!==jobId||meta.gate?.verdict==='REJECTED')return null;
 try{const data=assetData(a),sha=createHash('sha256').update(data).digest('hex');if(data.length<4||sha!==p.zipSha256)return null;const files=Object.keys(unzipSync(data));if(files.length<2)return null;return{asset:a,sha,files:files.length,meta};}catch{return null;}
}
function publicQuote(m:Meta){return{id:m.id,platform:m.platform,version:{id:m.versionId,number:m.versionNumber},costPct:0,confirmationRequired:true,expiresAt:m.expiresAt,expectedResult:L('Un fichier contrôlé dans votre bibliothèque. Aucune installation, publication ou synchronisation de boutique.','A checked file in your library. No store installation, publication or synchronization.'),actionsExecuted:false};}
function recheck(u:User,cid:string,pid:string,m:Meta){const c=ownedConversation(u,cid);if(c.revision!==m.revision||stateOf(pid)?.revision!==m.projectRevision||m.expiresAt<now())throw new HttpError(409,L('Ce devis d’export a changé ou expiré. Préparez-le à nouveau, sans appel IA.','This export quote changed or expired. Prepare it again without an AI call.'));requirePlan(u,pid);const s=currentSiteSource(pid,m.versionId);if(s.sourceDigest!==m.sourceDigest)throw new HttpError(409,L('Le catalogue, les données ou le Site ont changé. Rien n’est écrasé.','The catalog, data or Site has changed. Nothing is overwritten.'));return s;}
export function quoteNativeExport(u:User,cid:string,cmd:Extract<ExportToolCommand,{action:'quote'}>){return tx(()=>{
 const{c,pid}=owned(u,cid),a=metaOf(c).intelligence;
 if(c.revision!==cmd.revision||stateOf(pid)?.revision!==cmd.projectRevision)throw new HttpError(409,L('La conversation a changé.','The conversation changed.'));
 if(cmd.proposalReceiptId&&(a?.lastReceiptId!==cmd.proposalReceiptId||a.sourceRevision!==c.revision||a.sourceProjectRevision!==cmd.projectRevision||!a.lastReply?.proposedTools.includes('theme.export')||a.lastReply.exportPlan?.platform!==cmd.platform||a.lastReply.exportPlan?.versionId!==cmd.versionId))throw new HttpError(409,L('La proposition d’export a changé.','The export proposal has changed.'));
 const s=currentSiteSource(pid,cmd.versionId),at=now(),m:Meta={schema:1,id:id(),conversationId:cid,sourceReceiptId:cmd.proposalReceiptId,revision:c.revision,projectRevision:cmd.projectRevision,versionId:s.version.id,versionNumber:s.version.number,platform:cmd.platform,sourceDigest:s.sourceDigest,createdAt:at,expiresAt:at+15*60000};
 if(!cmd.requestNew){const previous=all<{id:string}>("SELECT id FROM assets WHERE project_id=? AND role='theme-export' AND deleted_at IS NULL ORDER BY created_at DESC",pid).map(r=>validFile(getAsset(r.id),pid,m)).find(Boolean);if(previous){m.assetId=previous.asset.id;m.zipSha256=previous.sha;m.reusedFrom='native-library';save(pid,m);return{kind:'reused' as const,receipt:nativeExportReceipt(u,cid,m.id)};}}
 save(pid,m);return{kind:'quote' as const,quote:publicQuote(m)};
});}
export function confirmNativeExport(u:User,cid:string,cmd:Extract<ExportToolCommand,{action:'confirm'}>){return tx(()=>{const{pid,m}=ownedMeta(u,cid,cmd.quoteId);if(m.jobId||m.reusedFrom)return nativeExportReceipt(u,cid,m.id);recheck(u,cid,pid,m);const job=enqueue({userId:u.id,projectId:pid,type:'agent.theme.export',label:L('Préparer le fichier du Site','Prepare the Site file'),payload:{conversationId:cid,quoteId:m.id,aiOff:true},maxAttempts:1,idempotencyKey:`agent-export:${m.id}`});m.jobId=job.id;save(pid,m);return nativeExportReceipt(u,cid,m.id);});}
export async function runNativeExport(ctx:JobContext){return withAiDisabled('Export exact confirmé, sans IA supplémentaire',async()=>{
 const payload=z.object({conversationId:z.string(),quoteId:z.string(),aiOff:z.literal(true),lang:z.string().optional(),strategyVersion:z.string().nullable().optional(),strategyInputDigest:z.string().nullable().optional()}).strict().parse(ctx.payload),u=one<User>('SELECT * FROM users WHERE id=?',ctx.job.user_id);if(!u)throw new HttpError(404,L('Compte introuvable.','Account not found.'));
 const{pid,m}=ownedMeta(u,payload.conversationId,payload.quoteId);if(pid!==ctx.job.project_id||m.jobId!==ctx.job.id)throw new HttpError(404,L('Tâche d’export introuvable.','Export task not found.'));
 // Recover only the exact native job’s acquired file, never a filename or arbitrary older ZIP.
 const candidates=(m.assetId?[getAsset(m.assetId)]:all<{id:string}>("SELECT id FROM assets WHERE project_id=? AND role='theme-export' AND json_extract(meta,'$.proof.jobId')=? ORDER BY created_at DESC",pid,ctx.job.id).map(a=>getAsset(a.id)));
 const acquired=candidates.map(a=>validFile(a,pid,m,ctx.job.id)).find(Boolean);
 if(acquired){m.assetId=acquired.asset.id;m.zipSha256=acquired.sha;save(pid,m);ctx.progress(1,L('Fichier acquis retrouvé, sans nouvelle génération.','Acquired file recovered without generating again.'));return{assetId:m.assetId,zipSha256:m.zipSha256,sourceDigest:m.sourceDigest,reused:true};}
 if(m.assetId||candidates.length)throw new UserFacingError(L('Le fichier acquis manque ou a changé ; aucun remplacement automatique.','The acquired file is missing or changed. No automatic replacement.'),'agent_export_output_unavailable');
 const s=recheck(u,payload.conversationId,pid,m);ctx.progress(.1,L('Création et contrôle du fichier, sans appel IA.','Creating and checking the file without an AI call.'));
 const exp=await exportAndRecord({id:pid,userId:u.id},{spec:s.spec,id:s.version.id,number:s.version.number},m.platform,s.spec.language??'fr',{jobId:ctx.job.id});
 if(!exp.assetId||exp.verdict==='REJECTED')throw new UserFacingError(exp.message,'agent_export_rejected');const file=validFile(getAsset(exp.assetId),pid,m,ctx.job.id);if(!file)throw new UserFacingError(L('Le fichier exporté n’est pas prouvé ; les versions sont conservées.','The exported file is not proved. Versions are kept.'),'agent_export_unproved');
 m.assetId=file.asset.id;m.zipSha256=file.sha;save(pid,m);ctx.progress(1,L('Fichier conservé. Installation sur la plateforme non vérifiée.','File saved. Platform installation not verified.'));return{assetId:m.assetId,zipSha256:m.zipSha256,sourceDigest:m.sourceDigest,reused:false};
});}
export function nativeExportReceipt(u:User,cid:string,qid:string){return readSnapshot(()=>{const{pid,m}=ownedMeta(u,cid,qid),job=m.jobId?getJob(m.jobId):null;if(job&&(job.user_id!==u.id||job.project_id!==pid))throw new HttpError(404,L('Tâche introuvable.','Task not found.'));const file=m.assetId?validFile(getAsset(m.assetId),pid,m,m.reusedFrom?undefined:m.jobId):null,r=json<{assetId?:string;zipSha256?:string;sourceDigest?:string}>(job?.result,{}),recorded=!!file,delivered=recorded&&(!!m.reusedFrom||job?.status==='done'&&r.assetId===m.assetId&&r.zipSha256===m.zipSha256&&r.sourceDigest===m.sourceDigest);
 let isCurrent=false;try{isCurrent=currentSiteSource(pid,m.versionId).sourceDigest===m.sourceDigest;}catch{}
 return{id:m.id,sourceReceiptId:m.sourceReceiptId??null,platform:m.platform,version:{id:m.versionId,number:m.versionNumber,isCurrent},state:delivered?m.reusedFrom?'reused':'delivered':recorded?'file_recorded_job_unfinished':m.assetId?'output_unavailable':job?.status==='done'?'result_missing':job?.status??'quoted',delivered,recorded,reused:!!m.reusedFrom,costPct:0,job:job?publicJob(job):null,file:recorded?{id:file.asset.id,name:file.asset.name,bytes:file.asset.size,sha256:file.sha,href:`/api/files/${file.asset.id}?download=1`}:null,scope:file?.meta.scope??null,message:file?.meta.message??null,unmeasured:file?.meta.unmeasured??null,installation:'not_tested',publication:false,actionsExecuted:delivered&&!m.reusedFrom};
});}
export function nativeExportsRegistry(u:User,cid:string){return readSnapshot(()=>{const{pid,c}=owned(u,cid),cur=currentTheme(pid);return{available:!!cur,currentVersion:cur?{id:cur.version.id,number:cur.version.number}:null,platforms:['shopify','woocommerce','prestashop','wix','squarespace']as CmsPlatform[],costPct:0,receipts:all<{value:string}>("SELECT value FROM memory WHERE project_id=? AND kind='artifact' AND key LIKE 'agent.export.tool.%' ORDER BY created_at DESC,rowid DESC LIMIT 100",pid).map(r=>json<Meta|null>(r.value,null)).filter((m):m is Meta=>!!m&&m.conversationId===c.id&&!!(m.jobId||m.reusedFrom)).slice(0,10).map(m=>nativeExportReceipt(u,cid,m.id)),limits:L('Fichier local seulement : aucune connexion ou installation CMS, publication, envoi de stock ou paiement.','Local file only: no CMS connection or installation, publishing, stock push or payment.')};});}
