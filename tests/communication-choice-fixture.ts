/** Positive legacy engine fixtures explicitly choose Generalist under #160's new service rule.
 * Test-only adapter: never imported by application code, never a runtime default.
 * Negative quota/choice tests use the native subscription helper directly.
 */
export * from '@/lib/project-subscriptions';
import {grantProjectPlan as grantNative} from '@/lib/project-subscriptions';
import {loadProject} from '@/lib/projects';
import {projectPlan} from '@/lib/project-billing';
import {activeStrategy} from '@/lib/marketing-strategy';
import {chooseGeneralistForTest} from './strategy-choice-fixture';
export function chooseCommunicationForTest(projectId:string){
 if(projectPlan(projectId)&&loadProject(projectId).business==='services'&&!activeStrategy(projectId))chooseGeneralistForTest(projectId);
}
export function grantProjectPlan(...args:Parameters<typeof grantNative>){const result=grantNative(...args);chooseCommunicationForTest(args[0]);return result;}
