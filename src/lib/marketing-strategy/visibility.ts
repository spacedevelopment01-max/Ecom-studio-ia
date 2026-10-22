/** Prepared outputs remain inspectable by explicit ID, but are not current or auto-selected. */
import { one } from "../db";
import { serviceSiteScope, strategySelection } from "../strategy-consumption";
const literal=(v:string)=>"'"+v.replaceAll("'","''")+"'";
export function strategyVisibilitySql(projectId:string,module:string,idExpression:string, publicOnly=false,options?:{selection?:ReturnType<typeof strategySelection>;schemaInstalled?:boolean}):string {
 if(!options?.schemaInstalled&&!one("SELECT 1 FROM sqlite_master WHERE type='table' AND name='marketing_strategy_contents'"))return '1=1';
 const selected=publicOnly?null:options&&Object.hasOwn(options,"selection")?options.selection:strategySelection(projectId);
 const draft=selected?.id.startsWith('draft-')?selected.id:null;
 const archives=(options?.schemaInstalled||one("SELECT 1 FROM sqlite_master WHERE type='table' AND name='marketing_strategy_archives'"))?` AND NOT EXISTS (SELECT 1 FROM marketing_strategy_archives msa WHERE msa.project_id=${literal(projectId)} AND msa.module=${literal(module)} AND msa.content_id=${idExpression} ${draft&&selected?`AND NOT EXISTS (SELECT 1 FROM marketing_strategy_contents compatible WHERE compatible.project_id=msa.project_id AND compatible.module=msa.module AND compatible.content_id=msa.content_id AND compatible.angle_id=${literal(selected.angleId)} AND compatible.input_digest=${literal(selected.inputDigest)})`:''})`:'';
 const site=serviceSiteScope(projectId)&&['asset','seo','video'].includes(module)?` AND NOT EXISTS (SELECT 1 FROM marketing_strategy_contents site_content WHERE site_content.project_id=${literal(projectId)} AND site_content.module=${literal(module)} AND site_content.content_id=${idExpression} AND site_content.strategy_id IS NOT NULL)`:'';
 return `(NOT EXISTS (SELECT 1 FROM marketing_strategy_contents msv WHERE msv.project_id=${literal(projectId)} AND msv.module=${literal(module)} AND msv.content_id=${idExpression} AND msv.strategy_id LIKE 'draft-%' ${draft?`AND msv.strategy_id!=${literal(draft)}`:''})${archives}${site})`;
}
export function strategyContentVisible(projectId:string,module:string,contentId:string,publicOnly=false):boolean {
 return !!one(`SELECT 1 WHERE ${strategyVisibilitySql(projectId,module,literal(contentId),publicOnly)}`);
}
