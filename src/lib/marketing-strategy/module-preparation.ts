import { createHash } from "node:crypto";
/** Local native revisions, grouped before activation. No provider, no publication, no overwrite. */
import { all, db, json, one, run, tx } from '../db';
import { HttpError } from '../auth';
import { loadProject } from '../projects';
import { withAiDisabled } from '../ai/access';
import { withStrategyScope } from '../strategy-consumption';
import { getStrategyState, preparationStrategy, stageStrategyModule, assertStrategyPreparationCurrent } from './index';
import { runContentEngineV2 } from '../seo-v2/engine';
import { latestContent } from '../seo-v2/store';
import { blockText } from '../seo-v2/doc';
import { localOnlyDeps } from '../seo-v2/deps';
import type { ContentDoc } from '../seo-v2/types';
import { createPlanV2, type PlanRequest } from '../social-v2/planner';
export type ModulePreparation={module:string;oldId:string;newIds:string[];state:'prepared'|'blocked';note:string;preview?:string[]};
function schema(){db().exec('CREATE TABLE IF NOT EXISTS marketing_module_staging(preparation_id TEXT NOT NULL,project_id TEXT NOT NULL,module TEXT NOT NULL,old_id TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(preparation_id,module,old_id))');}
export function preparedModules(projectId:string,preparationId:string):ModulePreparation[]{schema();return all<{payload:string}>('SELECT payload FROM marketing_module_staging WHERE project_id=? AND preparation_id=?',projectId,preparationId).map(r=>json<ModulePreparation>(r.payload,null as never));}
function save(pid:string,prep:string,out:ModulePreparation){run('INSERT OR REPLACE INTO marketing_module_staging VALUES(?,?,?,?,?)',prep,pid,out.module,out.oldId,JSON.stringify(out));return out;}
export async function prepareLocalStrategyModules(projectId:string,preparationId:string){
 schema();assertStrategyPreparationCurrent(projectId,preparationId);const state=getStrategyState(projectId),prep=state.pending;
 if(!prep||prep.id!==preparationId||prep.status!=='prepared')throw new HttpError(409,'Actualisez la préparation avant de réviser les contenus.','strategy_preparation_closed');
 const selection=preparationStrategy(projectId,preparationId),project=loadProject(projectId);
 return withStrategyScope(projectId,()=>withAiDisabled('Préparation stratégique locale, aucune génération payante autorisée',async()=>{
  const results=preparedModules(projectId,preparationId);
  for(const content of prep.contents.filter(c=>c.module==='seo'&&!c.aligned&&!c.protected&&!c.published)){
   if(results.some(r=>r.module==='seo'&&r.oldId===content.contentId&&r.state==='prepared'))continue;
   const row=one<{doc_json:string}>('SELECT doc_json FROM content_documents WHERE project_id=? AND id=?',projectId,content.contentId);if(!row)throw new HttpError(409,'Un texte a changé depuis l’inventaire.','strategy_inventory_stale');
   const doc=json<ContentDoc>(row.doc_json,null as never);
   // Blog has its own quotas and publication bridge. It remains an explicit review, never an implicit new article.
   if(doc.type==='blog_article'||doc.type==='ad_copy')continue;
   const result=await runContentEngineV2(null,projectId,{type:doc.type,pageKey:doc.page.key,lang:doc.lang,maxCostEur:0,request:doc.meta2.contract?.request??undefined},localOnlyDeps());
   const current=result.docKey?latestContent(projectId,result.docKey):null;
   if(!current||['REJECTED','RETRY'].includes(result.verdict)||result.stoppedByCostCap){results.push(save(projectId,preparationId,{module:'seo',oldId:content.contentId,newIds:current?[current.version.id]:[],state:'blocked',note:'Rédaction conservée pour correction ; aucune activation automatique.'}));continue;}
   stageStrategyModule(projectId,preparationId,'seo',{contentIds:[current.version.id],replacements:[{oldId:content.contentId,newId:current.version.id}]});
   results.push(save(projectId,preparationId,{module:'seo',oldId:content.contentId,newIds:[current.version.id],state:'prepared',note:`Version locale enregistrée, qualité : ${result.verdict}. À relire avant activation.`,preview:current.doc.blocks.map(blockText)}));
  }
  for(const content of prep.contents.filter(c=>c.module==='calendar'&&!c.aligned&&!c.protected&&!c.published)){
   if(results.some(r=>r.module==='calendar'&&r.oldId===content.contentId&&r.state==='prepared'))continue;
   const posts=all<{id:string;status:string;approved_by:string|null}>('SELECT id,status,approved_by FROM posts WHERE project_id=? AND plan_id=? AND status NOT IN (\'cancelled\',\'failed\')',projectId,content.contentId);
   if(posts.some(p=>p.approved_by||['published','publishing'].includes(p.status)))continue; // never copy or revise a protected/public archive implicitly
   const row=one<{params:string;engine:string}>('SELECT params,engine FROM content_plans WHERE id=? AND project_id=?',content.contentId,projectId);
   if(!row||row.engine!=='v2')continue;
   try{
    const result=tx(()=>createPlanV2(project,json<PlanRequest>(row.params,null as never),{planId:createHash("sha256").update(preparationId+content.contentId).digest("hex").slice(0,16)}));
    const next=all<{id:string}>('SELECT id FROM posts WHERE project_id=? AND plan_id=?',projectId,result.planId).map(p=>p.id);
    stageStrategyModule(projectId,preparationId,'calendar',{contentIds:[result.planId],replacements:[{oldId:content.contentId,newId:result.planId}]});
    // Every old slot is explicitly covered; new slots remain planned, never scheduled or approved.
    stageStrategyModule(projectId,preparationId,'post',{contentIds:next,retainedContentIds:posts.map(p=>p.id)});
    results.push(save(projectId,preparationId,{module:'calendar',oldId:content.contentId,newIds:[result.planId,...next],state:'prepared',note:'Calendrier et textes locaux préparés. Médias et approbation restent à contrôler avant toute programmation.',preview:all<{caption:string}>("SELECT caption FROM posts WHERE project_id=? AND plan_id=? ORDER BY scheduled_at",projectId,result.planId).map(p=>p.caption)}));
   }catch{results.push(save(projectId,preparationId,{module:'calendar',oldId:content.contentId,newIds:[],state:'blocked',note:'Le calendrier ne peut pas être repris dans les droits ou dates actuels. Original conservé ; vérifiez sa période.'}));}
  }
  return preparedModules(projectId,preparationId);
 }),selection);
}
/** Called inside the same transaction as strategy activation, after all coverage checks succeeded. */
export function commitPreparedStrategyModules(projectId:string,preparationId:string){
 for(const r of preparedModules(projectId,preparationId).filter(r=>r.state==='prepared'&&r.module==='calendar')){
  run("UPDATE content_plans SET status='archived',paused=1 WHERE project_id=? AND id=?",projectId,r.oldId);
  run("UPDATE posts SET status='cancelled' WHERE project_id=? AND plan_id=? AND status NOT IN ('published','publishing') AND approved_by IS NULL",projectId,r.oldId);
 }
}
