import {one,run} from "@/lib/db";
import {seedSourcedAnglesForTest} from "./sourced-strategy-fixture";
/** Explicit fictitious client choice for engine regression fixtures; never a runtime default. */
import { prepareStrategyChange, activateStrategy, stageStrategyModule } from '@/lib/marketing-strategy';
import {getStrategyState} from '@/lib/marketing-strategy';
export function acquiredChoicesForTest(projectId:string){
 if(getStrategyState(projectId).angles.length===5)return;
 const original=one<{value:string}>("SELECT value FROM memory WHERE project_id=? AND kind='artifact' AND key='preparation.current'",projectId);
 try{seedSourcedAnglesForTest(projectId);}finally{
  if(original)run("UPDATE memory SET value=? WHERE project_id=? AND kind='artifact' AND key='preparation.current'",original.value,projectId);
  else run("DELETE FROM memory WHERE project_id=? AND kind='artifact' AND key='preparation.current'",projectId);
 }
}
export function chooseAngleForTest(projectId:string,angleId:'usage'|'reassurance'|'expression'|'discovery'|'generalist'='generalist'){
 acquiredChoicesForTest(projectId);
 const prep=prepareStrategyChange(projectId,angleId);
 for(const c of prep.contents.filter(c=>!c.aligned&&!c.published))stageStrategyModule(projectId,prep.id,c.module,{contentIds:[],retainedContentIds:[c.contentId]});
 return activateStrategy(projectId,{angleId,preparationId:prep.id,idempotencyKey:`test-choice-${prep.id}`,confirmed:true,retainUnaligned:true});
}
export const chooseGeneralistForTest=(projectId:string)=>chooseAngleForTest(projectId,'generalist');
