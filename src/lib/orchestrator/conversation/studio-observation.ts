/** Relevé autorisé de l'état natif. Ni création métier, ni contrôle de fournisseur, ni preuve de livraison. */
import {ownedProject,type User} from '../../auth';
import {all,one,json,tx} from '../../db';
import {loadProject,currentTheme} from '../../projects';
import {balance} from '../../billing';
import {projectRights,planOfProject} from '../../plan-gates';
import {stateOf} from '../../preparation/store';
import {aiReady} from '../../ai/llm';
import {aiUsage} from '../../ai/access';
import {pctOfBudget} from '../../budget-pct';
import {stableHash} from '../../brain/hash';
import type {ConversationRow} from './contract';
import {studioFailureDefinitions} from './studio-failure-knowledge';
export const studioKnowledgeEnabled=()=>['STUDIO_CONVERSATION_LOT_A','STUDIO_CONVERSATION_AI','STUDIO_CONVERSATION_KNOWLEDGE'].every(key=>process.env[key]==='1');
export function captureStudioObservation(c:ConversationRow){
 return tx(()=>observe(c));
}
function observe(c:ConversationRow){
 const commit=process.env.STUDIO_BUILD_COMMIT,tree=process.env.STUDIO_BUILD_TREE;
 const observedAt=Date.now(),software={commit:commit&&/^[a-f0-9]{40}$/.test(commit)?commit:null,tree:tree==='clean'||tree==='modified'?tree:'unknown'};
 if(!c.project_id)return{schema:'studio-observation-1' as const,status:'draft' as const,projectId:null,observedAt,software,providerTested:false as const,readingScope:'No project attached; no plan or budget inferred.'};
 const user=one<User>('SELECT * FROM users WHERE id=?',c.user_id);if(!user)throw Error('conversation_owner_missing');ownedProject(user,c.project_id);
 const p=loadProject(c.project_id),plan=planOfProject(p.id),rights=projectRights(p.id),b=balance(user.id,p.id),usage=aiUsage(user.id,p.id),prep=stateOf(p.id),theme=currentTheme(p.id);
 const tables=new Set(all<{name:string}>("SELECT name FROM sqlite_master WHERE type='table'").map(r=>r.name));
 const count=(table:'studio_products'|'posts'|'blog_articles'|'campaigns')=>tables.has(table)?one<{n:number}>(`SELECT COUNT(*) n FROM ${table} WHERE project_id=?`,p.id)!.n:null;
 const jobs=all<{id:string;type:string;label:string;status:string;progress:number;checkpoint:string|null;result:string|null;finished_at:number|null}>("SELECT id,type,label,status,progress,checkpoint,result,finished_at FROM jobs WHERE project_id=? AND user_id=? ORDER BY created_at DESC,rowid DESC LIMIT 8",p.id,user.id).map(j=>{
  // Même règle que publicJob : un ancien code conservé dans le checkpoint n'est pas un échec courant.
  const checkpoint=j.status==='failed'?json<Record<string,unknown>>(j.checkpoint,{}):{},post=checkpoint['ai-post'],failure=checkpoint.failureCode??(post&&typeof post==='object'?'code' in post?post.code:null:null);
  return{id:j.id,type:j.type,label:j.label,status:j.status,progress:j.progress,finishedAt:j.finished_at,failureCode:typeof failure==='string'&&/^[A-Z_]{3,80}$/.test(failure)?failure:null,resultRecorded:!!j.result&&j.result!=='null',deliveryVerifiedByThisObservation:false};
 });
 return{schema:'studio-observation-1' as const,status:'project' as const,projectId:p.id,observedAt,software,
  project:{name:p.name,business:p.business,storeType:p.storeType,status:p.status,platform:p.platform,offerName:p.product.name,brandName:p.brand?.name??null},
  plan:plan?{id:plan,name:rights!.name,rights:{themeEditing:rights!.themeEditing,aiSections:rights!.aiSections,pageModels:rights!.pageModels,videos:rights!.videos,ugc:rights!.ugc,ads:rights!.ads,seo:rights!.seo,calendarDays:rights!.calendarDays,postsPerDay:rights!.postsPerDay,autopublish:rights!.autopublish,marketingAngles:rights!.marketingAngles,languages:rights!.languages,blogPerMonth:rights!.quotas.blog},units:{marketingAngles:'lifetime_project',blogPerMonth:'monthly',calendarDays:'planning_horizon_days',postsPerDay:'daily_max'}}:null,
  budget:{unit:'percentage_of_each_native_reserve' as const,used:usage?.plan.used??null,available:usage?100-usage.plan.used:null,creditsAvailable:usage?.credits?100-usage.credits.used:null,reserved:pctOfBudget(b.reserved,usage?.baseMicro),reservedIsMaximumNotSpent:true,remainingIsRecordedNotSpendable:true,paused:usage?.paused??true,pending:usage?.pending??false,periodEnd:b.periodEnd,costBasis:usage&&usage.plan.used<100?'monthly_reserve':usage?.credits?'purchased_credits':'unknown',window:'observed_before_any_subsequent_reply_or_action'},
  preparation:prep?{revision:prep.revision,pending:prep.pending?{step:prep.pending.step,jobId:prep.pending.jobId}:null,stages:Object.entries(prep.stages).map(([step,s])=>({step,status:s?.status,candidateId:s?.candidateId??null}))}:null,
  theme:theme?{versionId:theme.version.id,number:theme.version.number,direction:theme.spec.direction,nativeGate:json<{gate?:{verdict?:string}}>(theme.version.qc,{}).gate?.verdict??null,creativeQualityVerifiedByThisObservation:false}:null,
  counts:{catalogueRowsIncludingArchived:count('studio_products'),posts:count('posts'),articles:count('blog_articles'),campaigns:count('campaigns'),projectServices:p.services.services.length,assets:one<{n:number}>("SELECT COUNT(*) n FROM assets WHERE project_id=? AND user_id=? AND deleted_at IS NULL",p.id,user.id)!.n},
  providerConfiguration:aiReady(),providerTested:false as const,observationsAreClientConfirmedFacts:false as const,jobs,
  jobCoverage:{limit:8,total:one<{n:number}>('SELECT COUNT(*) n FROM jobs WHERE project_id=? AND user_id=?',p.id,user.id)!.n,ordering:'newest_created_first'},failureDefinitions:studioFailureDefinitions(jobs.map(j=>j.failureCode)),
  readingScope:'Native metadata and counts only; the eight newest jobs. No file contents, full texts, source pages, media vision, provider authentication or delivery verification. Catalogue count explicitly includes archived rows. Unmapped failure codes have no inferred cause.',
 };
}
export type StudioObservation=ReturnType<typeof captureStudioObservation>;
export const observationVersion=(s:StudioObservation)=>stableHash('studio-observation-1',s);
