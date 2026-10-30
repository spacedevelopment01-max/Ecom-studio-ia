import {conversationContentEnabled} from './tool-flags';
/** Première tranche D : lecture des acquis et vraie analyse native, jamais un deuxième moteur.
 * Les autres modules restent honnêtement non raccordés jusqu'à leur propre incrément vérifié.
 */
import{HttpError,type User}from'../../auth';
import{all,id,json,now,one,tx,readSnapshot}from'../../db';
import{stableHash}from'../../brain/hash';
import{requirePlan}from'../../plan-gates';
import{loadProject,remember}from'../../projects';
import{stateOf,queuePreparation}from'../../preparation/engine';
import{createQuote,quoteOf}from'../../preparation/quote';
import{analysisCostPlan}from'../../preparation/inspect';
import{getJob,publicJob,type Job}from'../../jobs';
import{metaOf,ownedConversation}from'./store';
import{conversationToolsEnabled,conversationThemeToolsEnabled,conversationCompositionEnabled,conversationExportsEnabled,conversationRenderEnabled,conversationResearchEnabled,conversationBrandEnabled,conversationImagesEnabled,conversationCatalogueEnabled,conversationLogosEnabled}from'./tool-flags';
import{bindAgentJob,boundPublic,createOrReadBound,type AgentBound}from'../../ai/request-bounds';
import{run}from'../../db';
import type{State}from'../../preparation/types';
import type{ToolCommand}from'./tool-contract';
import{assertBriefWritable}from'./tools';
import{redact}from'../../redact';

export const toolsEnabled=conversationToolsEnabled;
export function assertToolsEnabled(){if(!toolsEnabled())throw new HttpError(404,'Outils conversationnels indisponibles.','conversation_tools_disabled');}
type Meta={schema:1;id:string;conversationId:string;tool:'understand-offer';revision:number;projectRevision:number;createdAt:number;expiresAt:number;correction:string;boundId:string;maximumCalls:number;costCapMicro:number;proposalReceiptId?:string;jobId?:string;resultVersion?:number};
function owned(user:User,cid:string){assertToolsEnabled();const c=ownedConversation(user,cid);if(!c.project_id)throw new HttpError(409,'Créez le projet avant cette analyse.');const s=stateOf(c.project_id);if(!s?.stages.brief)throw new HttpError(409,'Fiche de préparation absente.');return{c,projectId:c.project_id,s,p:loadProject(c.project_id)};}
function saveMeta(pid:string,m:Meta){remember(pid,{kind:'artifact',key:`agent.tool.${m.id}`,value:JSON.stringify(m),source:'local',origin:'system',status:'inferred'});}
function meta(pid:string,qid:string){return json<Meta|null>(one<{value:string}>("SELECT value FROM memory WHERE project_id=? AND key=? AND kind='artifact'",pid,`agent.tool.${qid}`)?.value,null);}
/** Une analyse ne rend jamais périmés des choix aval déjà engagés/validés depuis SYNA. */
function analysisLocked(s:State){return !!s.pending||s.stages.brief?.status==='approved'||Object.values(s.stages).some(stage=>stage?.status==='approved')||!!(s.stages.research||s.stages.brand||s.stages.content||s.stages.media);}
function assertAnalysisUnlocked(s:State){if(analysisLocked(s))throw new HttpError(409,'Une préparation est en cours ou des choix sont verrouillés. Les acquis restent conservés ; reprenez le parcours existant.','agent_tool_locked');}
function proposal(c:ReturnType<typeof ownedConversation>,cmd:Extract<ToolCommand,{action:'quote'}>){if(!cmd.proposalReceiptId)return;const a=metaOf(c).intelligence;if(a?.lastReceiptId!==cmd.proposalReceiptId||a.sourceRevision!==c.revision||a.sourceProjectRevision!==cmd.projectRevision||!a.lastReply?.proposedTools.includes('understand-offer'))throw new HttpError(409,'La proposition d’outil a changé ; relisez le dialogue avant son devis.','agent_tool_proposal_stale');}
/** Acquis exacts, depuis la version immuable liée au reçu du job ; pas depuis un texte du modèle. */
function versionResult(pid:string,job:Job){
  const result=json<{revision?:number;step?:string;action?:string;simulation?:boolean}>(job.result,{});
  if(job.status!=='done'||result.step!=='brief'||result.action!=='analyze'||!Number.isSafeInteger(result.revision))return null;
  const state=json<State|null>(one<{value:string}>("SELECT value FROM memory WHERE project_id=? AND key=? AND kind='artifact'",pid,`preparation.version.${result.revision}`)?.value,null);
  if(!state||state.projectId!==pid||!state.stages.brief?.data)return null;
  const data=state.stages.brief.data;
  if(data.provenance==='simulation'){
    if(!result.simulation||!state.simulation)return null;
  }else if(data.provenance!=='provider'||!data.execution||!one("SELECT 1 FROM ai_calls WHERE project_id=? AND user_id=? AND job_id=? AND usage_key=? AND status='ok'",pid,job.user_id,job.id,data.execution.usageKey))return null;
  return{projectId:pid,revision:state.revision,step:'brief',provenance:data.provenance,fingerprint:stableHash('native-analysis-receipt',data),awaitingClientReview:true,content:{name:data.profile.name,category:data.profile.category,summary:data.profile.summary,facts:data.profile.facts.map(({key,label,value,status,source})=>({key,label,value,status,source})),questions:data.profile.questions.map(({id,question,answer,later})=>({id,question,answer,later})),contactModes:data.services.contactModes??[]}};
}
function latestAcquired(pid:string,userId:string){for(const j of all<Job>("SELECT * FROM jobs WHERE project_id=? AND user_id=? AND type='project.prepare' AND status='done' AND json_extract(payload,'$.action')='analyze' ORDER BY finished_at DESC,created_at DESC LIMIT 20",pid,userId)){const result=versionResult(pid,j);if(result)return{jobId:j.id,result};}return null;}
export function toolRegistry(user:User,cid:string){return readSnapshot(()=>{const{c,projectId,s}=owned(user,cid);let writable=true;try{assertBriefWritable(c,user,s.revision);}catch(e){if(!(e instanceof HttpError))throw e;writable=false;}return{
  projectId,revision:s.revision,
  tools:[
    {id:'project.inspect',state:'available',executionEnabled:true,cost:'free',effect:'Lire les acquis et leur provenance, sans modification.'},
    {id:'brief.update',state:writable?'available':'unavailable',executionEnabled:writable,cost:'free',commandEndpoint:`/api/studio-agent/conversations/${cid}`,effect:'Corrections explicites par les commandes natives du brief, avec versions et verrous.'},
    {id:'understand-offer',state:analysisLocked(s)?'unavailable':'quote_only',executionEnabled:false,connected:true,availability:'checked_on_quote',cost:'native_quote',effect:'Compréhension native de cette offre, après vérification des droits, fournisseur, tarifs et devis. Proposition à relire ; aucun passage à l’étape suivante.'},
    ...['research','brand','logo','images','videos','products','services','theme','seo','blog','ads','social','calendar','appointments','export','connections','render'].map(id=>id==='brand'&&conversationBrandEnabled()?{id,state:'quote_only',executionEnabled:false,connected:true,effect:'Proposition textuelle de marque par Préparation, consigne entière, devis/accord et acquis conservés. Aucune identité, logo, thème ou validation juridique activé.'}:id==='seo'&&conversationContentEnabled()?{id,state:'quote_only',executionEnabled:false,connected:true,effect:'Rédaction native pour une page ou retouche IA des passages choisis d’un document : consigne entière, devis/accord, versions et acquis. Retouche provisoire à relire, aucune réécriture globale, modification du thème ni publication.'}:id==='logo'&&conversationLogosEnabled()?{id,state:'quote_only',executionEnabled:false,connected:true,effect:'Trois directions du moteur LogoV2 : concepts acquis, devis/accord distincts, bibliothèque et reprise. Réutilisation ou réparation ciblée, aucune personne ni activation d’identité.'}:id==='products'&&conversationCatalogueEnabled()?{id,state:'quote_only',executionEnabled:false,connected:true,effect:'Catalogue natif : brouillons, variantes et médias, devis/accord distincts, aperçu et annulation sans publier.'}:id==='images'&&conversationImagesEnabled()?{id,state:'quote_only',executionEnabled:false,connected:true,effect:'Création native de 1–5 compositions ou retouche photo ciblée avec source/style, IDs/versions exacts, devis/accord, bibliothèque et reprise. Personnes et retouche composée de publications non raccordées.'}:id==='research'&&conversationResearchEnabled()?{id,state:'quote_only',executionEnabled:false,connected:true,effect:'Recherche native, devis/accord distincts après compréhension validée. Hypothèses à relire ; aucune validation ou étape aval automatique.'}:id==='render'&&conversationRenderEnabled()?{id,state:'quote_only',executionEnabled:false,connected:true,effect:'Captures natives ordinateur/téléphone et mesures techniques, sans IA ni modification du Site. Aucun jugement esthétique ou CMS validé.'}:id==='export'&&conversationExportsEnabled()?{id,state:'quote_only',executionEnabled:false,connected:true,effect:'Fichier CMS natif contrôlé, devis local à 0 %, accord et reçu du ZIP en bibliothèque. Aucune installation, connexion, publication ni synchronisation.'}:id==='theme'&&conversationThemeToolsEnabled()?{id,state:'quote_only',executionEnabled:false,connected:true,effect:conversationCompositionEnabled()?'Composition native de pages avec contenus acquis, ou retouche exacte : devis local, accord, version et annulation. Qualité visuelle non mesurée ; aucun CMS installé.':'Retouche de texte exact ou image existante, avec devis local, accord, version et annulation. Les autres opérations Site restent manuelles.'}:{id,state:'not_connected',executionEnabled:false,effect:'Module existant, non raccordé à ce premier incrément d’outils. Utilisez son onglet manuel.'}),
    ...['publish','send','delete','purchase','payment'].map(id=>({id,state:'unavailable',executionEnabled:false,effect:'Action sensible non raccordée ; exige un accord spécifique et son contrôle propre.'})),
  ],acquired:latestAcquired(projectId,user.id),receipts:all<{value:string}>("SELECT value FROM memory WHERE project_id=? AND kind='artifact' AND key LIKE 'agent.tool.%' ORDER BY created_at DESC,rowid DESC LIMIT 100",projectId).map(row=>json<Meta|null>(row.value,null)).filter((m):m is Meta=>!!m&&m.conversationId===c.id&&typeof m.id==='string'&&!!m.jobId).slice(0,10).map(m=>toolReceipt(user,cid,m.id)),href:`/studio/${projectId}/pilote`,actionsExecuted:false,
};});}
export function createToolQuote(user:User,cid:string,cmd:Extract<ToolCommand,{action:'quote'}>){return tx(()=>{
  const{c,projectId,s,p}=owned(user,cid);
  if(redact(cmd.correction)!==cmd.correction)throw new HttpError(400,'Ne saisissez pas de clé dans la conversation. Utilisez les réglages sécurisés.','conversation_secret');
  if(c.revision!==cmd.revision||s.revision!==cmd.projectRevision)throw new HttpError(409,'Le contexte a changé ; rechargez avant le devis.','agent_tool_stale');
  proposal(c,cmd);
  const acquired=latestAcquired(projectId,user.id);
  if(acquired&&!cmd.requestNew)return{kind:'acquired' as const,state:'review',...acquired,previousResult:true,currentRevision:s.revision,actionsExecuted:false,newProviderCalls:0,message:'Une analyse précédente est conservée. Consultez-la ; une nouvelle analyse exige une demande explicite, sa correction éventuelle et son devis.'};
  assertAnalysisUnlocked(s);
  requirePlan(user,projectId);
  // Contrat natif #208, route, fournisseurs, entrées, limites d’essais et tarifs restent autoritaires.
  const native=createQuote(projectId,'brief','analyze',undefined,cmd.correction);
  const q=quoteOf(projectId,native.id,cmd.correction);
  if(!q.paid||!q.analysisFingerprint||native.estimateBudgetPct==null||native.maxBudgetPct==null)throw new HttpError(409,'Analyse IA non disponible : aucun résultat local ne remplace cet outil.','agent_tool_provider_unavailable');
  const plan=analysisCostPlan(p,s.stages.brief!.data,cmd.correction);
  if(!plan||plan.maxMicro!==q.capMicro||plan.maxCalls>16)throw new HttpError(409,'L’enveloppe de cette analyse ne peut pas être garantie.');
  const b=createOrReadBound(c.id,user.id,q.capMicro),at=now();
  const m:Meta={schema:1,id:q.id,conversationId:c.id,tool:'understand-offer',revision:c.revision,projectRevision:s.revision,createdAt:at,expiresAt:Math.min(at+15*60000,b.deadline_at??Infinity),correction:cmd.correction,boundId:b.id,maximumCalls:plan.maxCalls,costCapMicro:q.capMicro,...(cmd.proposalReceiptId?{proposalReceiptId:cmd.proposalReceiptId}:{})};saveMeta(projectId,m);
  return{kind:'quote' as const,id:q.id,tool:m.tool,estimatePct:native.estimateBudgetPct,maximumPct:native.maxBudgetPct,maximumCalls:m.maximumCalls,confirmationRequired:true,expiresAt:m.expiresAt,actionsExecuted:false,expectedResult:'Analyse native conservée pour votre relecture. Aucune validation, recherche, marque ou thème automatique.',requestBounds:boundPublic(b.id)};
});}
export function confirmToolQuote(user:User,cid:string,cmd:Extract<ToolCommand,{action:'confirm'}>){return tx(()=>{
  const{c,projectId,s}=owned(user,cid),m=meta(projectId,cmd.quoteId);
  if(!m||m.conversationId!==c.id)throw new HttpError(404,'Devis d’outil introuvable.');
  if(m.jobId)return toolReceipt(user,cid,m.id);
  if(m.expiresAt<now()||m.revision!==c.revision||m.projectRevision!==s.revision)throw new HttpError(409,'Devis d’outil périmé ou contexte modifié.','agent_tool_stale');
  assertAnalysisUnlocked(s);
  requirePlan(user,projectId);
  const q=quoteOf(projectId,m.id,m.correction);
  // Cet accord ajoute le plafond EXACT du nouvel outil, sans remettre à zéro les coûts/appels antérieurs.
  // Limite globale dure : 20 appels, profondeur 1, même échéance et zéro retry HTTP automatique.
  const b=one<AgentBound>('SELECT * FROM agent_request_bounds WHERE id=? AND user_id=?',m.boundId,user.id);
  if(!b||b.max_calls+m.maximumCalls>20||b.deadline_at!=null&&b.deadline_at<now())throw new HttpError(409,'Limite globale de cette demande atteinte ; acquis conservés.');
  if(one("SELECT 1 FROM ai_reservations r JOIN agent_request_jobs aj ON aj.job_id=r.job_id WHERE aj.bound_id=? AND r.status='uncertain'",b.id))throw new HttpError(409,'Un résultat incertain doit être vérifié avant un nouvel essai.');
  run('UPDATE agent_request_bounds SET cap_micro=cap_micro+?,max_calls=max_calls+? WHERE id=?',q.capMicro,m.maximumCalls,b.id);
  const queued=queuePreparation(projectId,s.revision,'brief','analyze',{capMicro:q.capMicro,paid:true,correction:q.correction,analysisFingerprint:q.analysisFingerprint});
  if(!queued.job)throw new HttpError(409,'L’analyse n’a pas été mise en file ; aucun résultat annoncé.');
  bindAgentJob(b.id,user.id,queued.job.id,'understand-offer');m.jobId=queued.job.id;saveMeta(projectId,m);
  return toolReceipt(user,cid,m.id);
});}
export function toolReceipt(user:User,cid:string,qid:string){return readSnapshot(()=>{const{c,projectId}=owned(user,cid),m=meta(projectId,qid);if(!m||m.conversationId!==c.id)throw new HttpError(404,'Reçu introuvable.');const j=m.jobId?getJob(m.jobId):null;if(j&&(j.user_id!==user.id||j.project_id!==projectId))throw new HttpError(404,'Reçu introuvable.');const result=j?versionResult(projectId,j):null;return{id:m.id,tool:m.tool,sourceReceiptId:m.proposalReceiptId??null,state:result?'review':j?.status==='done'?'result_missing':j?.status??'quoted',delivered:!!result,clientApproved:false,result,job:j?publicJob(j):null,href:`/studio/${projectId}/pilote`,message:result?'Proposition native acquise, à relire ; aucune étape suivante lancée.':j?.status==='done'?'La tâche est fermée mais son résultat n’est pas prouvé.':'Le reçu ne prouve pas encore la livraison du résultat demandé.'};});}
