/** Native theme preparation under a candidate strategy. Current pointers move only in the activation transaction. */
import { db, one, run } from '../db';
import { currentTheme, loadProject, themeVersion } from '../projects';
import { HttpError } from '../auth';
import { L } from '../i18n-server';
import { serviceStrategyProject, preparationStrategy, stageStrategyModule, type ActiveStrategy } from '../marketing-strategy';
import { withStrategyScope } from '../strategy-consumption';
import type { DirectionId } from './directions';
import { buildShop } from '../engine/shop';
function schema(){db().exec('CREATE TABLE IF NOT EXISTS marketing_theme_staging (preparation_id TEXT PRIMARY KEY,project_id TEXT NOT NULL,parent_id TEXT,version_id TEXT NOT NULL)');}
export async function prepareStrategyTheme(projectId:string,preparationId:string,options:{refresh?:boolean}={}){
 if(serviceStrategyProject(projectId))return null;
 schema();const cur=currentTheme(projectId);if(!cur)return null;
 const old=one<{version_id:string;parent_id:string}>('SELECT version_id,parent_id FROM marketing_theme_staging WHERE preparation_id=? AND project_id=?',preparationId,projectId);
 if(!options.refresh&&old&&old.parent_id===cur.version.id&&themeVersion(projectId,old.version_id))return{versionId:old.version_id,reused:true};
 if(cur.spec.imported||cur.spec.meta?.engine==='v2')return null; // preserved, requires explicit review; no silent migration
 const selection=preparationStrategy(projectId,preparationId);
 const result=await withStrategyScope(projectId,()=>buildShop(null,projectId,{direction:cur.spec.direction as DirectionId,useAi:false,engine:'v1',prepareOnly:true}),selection);
 if(result.versionId===cur.version.id){stageStrategyModule(projectId,preparationId,'theme',{contentIds:[cur.version.id]});return{versionId:cur.version.id,reused:true};}
 run('INSERT OR REPLACE INTO marketing_theme_staging VALUES(?,?,?,?)',preparationId,projectId,cur.version.id,result.versionId);
 stageStrategyModule(projectId,preparationId,'theme',{contentIds:[result.versionId],replacements:[{oldId:cur.version.id,newId:result.versionId}]});
 return{versionId:result.versionId,reused:false,delivery:result.delivery};
}
export function commitPreparedStrategyTheme(projectId:string,preparationId:string,strategy:ActiveStrategy){
 if(serviceStrategyProject(projectId))return;
 schema();const row=one<{parent_id:string;version_id:string}>('SELECT * FROM marketing_theme_staging WHERE preparation_id=? AND project_id=?',preparationId,projectId);if(!row)return;
 if(currentTheme(projectId)?.version.id!==row.parent_id)throw new HttpError(409,L('Le thème a changé depuis la préparation. Vos retouches sont conservées ; actualisez la transition.','The theme changed since preparation. Your edits are kept; refresh the transition.'),'strategy_theme_conflict');
 const draft=themeVersion(projectId,row.version_id);if(!draft)throw new HttpError(409,'Prepared theme missing','strategy_theme_missing');
 if(draft.spec.meta?.strategy?.id.startsWith("draft-"))draft.spec.meta={...draft.spec.meta,strategy:{...draft.spec.meta?.strategy,id:strategy.id,version:strategy.version,angleId:strategy.angleId}};
 run('UPDATE theme_versions SET spec=? WHERE id=? AND project_id=?',JSON.stringify(draft.spec),row.version_id,projectId);
 run('UPDATE projects SET current_theme_version_id=? WHERE id=?',row.version_id,projectId);
}
