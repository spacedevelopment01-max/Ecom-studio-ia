/** Explicit fictitious client choice for engine regression fixtures; never a runtime default. */
import { prepareStrategyChange, activateStrategy, stageStrategyModule } from '@/lib/marketing-strategy';
export function chooseGeneralistForTest(projectId:string){
 const prep=prepareStrategyChange(projectId,'generalist');
 for(const c of prep.contents.filter(c=>!c.aligned&&!c.published))stageStrategyModule(projectId,prep.id,c.module,{contentIds:[],retainedContentIds:[c.contentId]});
 return activateStrategy(projectId,{angleId:'generalist',preparationId:prep.id,idempotencyKey:`test-choice-${prep.id}`,confirmed:true,retainUnaligned:true});
}
