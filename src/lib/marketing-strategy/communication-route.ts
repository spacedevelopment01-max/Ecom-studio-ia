/** Read selection before Zod strips unrelated fields. Generation still uses the native routes and gates. */
import { one, json } from '../db';
import { HttpError } from '../auth';
import { withCommunicationStrategy, withSiteStrategy } from '../strategy-consumption';
import { communicationStrategy, serviceStrategyProject } from './index';
export async function withCommunicationRequest<T>(projectId:string,request:Request,fn:()=>T,actions:string[]):Promise<Awaited<T>> {
 const raw=await request.clone().json().catch(()=>({}));
 if(!serviceStrategyProject(projectId)||!actions.includes(raw.action??'')||raw.status==='archived')return await fn();
 if(raw.purpose==='site')return await withSiteStrategy(projectId,fn);
 let strategyId:string|undefined;
 const campaignId=raw.campaignId??(request.url.includes('/campaigns')?raw.id:undefined);
 if(typeof campaignId==='string'){
  const owner=one('SELECT 1 FROM campaigns WHERE project_id=? AND id=?',projectId,campaignId);if(!owner)throw new HttpError(404,'Campagne introuvable.');
  strategyId=one<{strategy_id:string}>("SELECT strategy_id FROM marketing_strategy_contents WHERE project_id=? AND module='campaign' AND content_id=?",projectId,campaignId)?.strategy_id;
 }

 if(raw.action==='repair'&&typeof raw.jobId==='string'){
  const job=one<{payload:string}>('SELECT payload FROM jobs WHERE project_id=? AND id=?',projectId,raw.jobId);
  if(!job)throw new HttpError(404,'Tâche introuvable.');strategyId=json<any>(job.payload,{}).strategyVersion??undefined;
 }
 return await withCommunicationStrategy(projectId,fn,{angleId:typeof raw.angleId==='string'?raw.angleId:typeof raw.request?.angleId==='string'?raw.request.angleId:undefined,strategyId});
}
