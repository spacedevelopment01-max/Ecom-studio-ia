/** Autorité économique réelle de Préparation ; données et fournisseurs synthétiques uniquement. */
import assert from 'node:assert/strict';
import {CASES,initializeSynthetic,simulatedDependencies} from './preparation-fixtures';
import {approve,queuePreparation,runPreparation,confirmIdentity} from '@/lib/preparation/engine';
import {stateOf} from '@/lib/preparation/store';
import {createQuote,quoteOf} from '@/lib/preparation/quote';
import {JobContext,getJob,completeJob,failJob} from '@/lib/jobs';
import {run} from '@/lib/db';
import {loadProject} from '@/lib/projects';
import {assertGuidedLogoAuthorization} from '@/lib/logo-v2/native-consent';
import {runLogoEngineV2} from '@/lib/logo-v2/engine';
import {setJsonSetting,getJsonSetting} from '@/lib/settings';

export async function prepareGuidedLogo(pid:string){
 const p=loadProject(pid),input={...structuredClone(CASES[p.business==='services'?1:0]),brandName:p.brand?.name||p.name,offerName:p.product.name||p.name,photoIds:[]};
 initializeSynthetic(pid,input);approve(pid,stateOf(pid)!.revision,'brief');
 for(const step of ['research','brand'] as const){
  const queued=queuePreparation(pid,stateOf(pid)!.revision,step,'generate',{paid:false,capMicro:0});
  run("UPDATE jobs SET status='running',attempts=1 WHERE id=?",queued.job!.id);
  completeJob(queued.job!.id,await runPreparation(new JobContext(getJob(queued.job!.id)!),simulatedDependencies));
  if(step==='research')approve(pid,stateOf(pid)!.revision,'research',{choiceId:'transparence'});
 }
 const brand=stateOf(pid)!.stages.brand!.data.proposal;
 confirmIdentity(pid,stateOf(pid)!.revision,{name:brand.name,tagline:brand.tagline,palette:brand.palette,fonts:brand.fonts});
}

export async function confirmedGuidedLogo(pid:string,correction?:string){
 // La disponibilité existe au moment du consentement ; les tests la retirent ensuite.
 const settings=['ai.media.models','ai.prices'] as const,saved=settings.map(k=>getJsonSetting(k,{}));
 const oldKey=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='synthetic-logo295-no-provider';
 try{
  setJsonSetting('ai.media.models',{...saved[0],'openai:gpt-image-2.5-sunburst':{enabled:true,confirmedAt:Date.now()}});
  setJsonSetting('ai.prices',{...saved[1],'openai:gpt-image-2.5-sunburst':{unit:'image',perImage:0.1,inputPerM:0.1}});
  const q=createQuote(pid,'brand','logo',undefined,correction),accepted=quoteOf(pid,q.id,correction);
  const queued=queuePreparation(pid,stateOf(pid)!.revision,'brand','logo',{paid:accepted.paid,capMicro:accepted.capMicro,correction});
  run("UPDATE jobs SET status='running',attempts=1 WHERE id=?",queued.job!.id);
  const ctx=new JobContext(getJob(queued.job!.id)!);await assertGuidedLogoAuthorization(ctx,pid);return ctx;
 }finally{settings.forEach((k,i)=>setJsonSetting(k,saved[i]));if(oldKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldKey;}
}

/** Vrai cycle de Préparation, mais dessins/verdicts déjà injectés par le test appelant. */
export async function runConfirmedGuidedLogo(pid:string,correction?:string){
 const ctx=await confirmedGuidedLogo(pid,correction);let result:Awaited<ReturnType<typeof runLogoEngineV2>>|undefined;
 try{completeJob(ctx.job.id,await runPreparation(ctx,{...simulatedDependencies,logos:async(p,c)=>{result=await runLogoEngineV2(c,p.id);return result.shown.map(a=>{assert.ok(a.assetId,'Direction synthétique sans fichier acquis');return a.assetId;});}}));return result!;}
 catch(error){failJob(ctx.job,error,{permanent:true});throw error;}
}
