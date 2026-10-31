/** Même cible native et mêmes fichiers pour SYNA, le devis, l’accord et le worker. */
import {HttpError}from '../../auth';
import {loadProject}from '../../projects';
import {getProduct,listProducts}from '../../products/catalog';
import {pinImageAsset,imageBindingHash,type ImageBinding}from '../../image-v2/request-binding';
import {sceneSubjectContext}from '../../video-v2/subject-binding';
import {approvedScenePlan,type ThreeScenesRequest}from '../../video-v2/three-scenes';
import {strategyStamp,type StrategyStamp}from '../../strategy-consumption';
import {communicationStrategy}from '../../marketing-strategy';
import {assertAdvertising}from '../../job-entitlements';
import {L}from '../../i18n-server';
import {metaOf}from './store';
import {observedActiveContext}from './active-context';
import {videoProjectScope}from './video-tool-validation';
import {selectedImageSource}from './image-tool-sources';
import {VideoGenerationPlanSchema}from './video-generation-contract';
import type {ConversationRow}from './contract';
type Sources={sources:{id:string;text:string}[];lastClientRequest:{sourceId:string|null;text:string}|null};
export function validateVideoGeneration(c:ConversationRow,raw:unknown,sources:Sources){
 const plan=VideoGenerationPlanSchema.parse(raw),pid=c.project_id,latest=sources.lastClientRequest,source=sources.sources.find(s=>s.id===plan.sourceId);
 if(!pid||!latest?.sourceId||plan.sourceId!==latest.sourceId||!source?.text.includes(plan.quote)||!latest.text.includes(plan.quote))throw new HttpError(409,L('La proposition doit citer votre dernière demande exacte.','The proposal must cite your latest exact request.'));
 const p=loadProject(pid),focus=metaOf(c).activeContext;if(observedActiveContext(c,focus)?.state==='unavailable')throw new HttpError(409,L('Le repère désigné doit être précisé avant toute vidéo.','Clarify the selected target before any video.'));
 if(plan.purpose==='ad')assertAdvertising(pid);
 const selected=plan.reference?selectedImageSource(c,plan.reference,latest.text,'source'):null,binding:ImageBinding={schema:1,people:'none',references:[]};
 if(plan.target.kind==='product'){
  const t=plan.target,item=getProduct(pid,t.productId),target=focus?.target;
  if(target?.kind==='catalogue-product'||target?.kind==='catalogue-variant'){
   if(target.productId!==t.productId||(target.kind==='catalogue-product'?target.version:target.productVersion)!==t.version||target.kind==='catalogue-variant'&&(!t.variant||t.variant.variantId!==target.variantId||t.variant.version!==target.version))throw new HttpError(409,L('La fiche ou variante diffère du repère désigné.','The listing or variant differs from the selected target.'));
  }else if(!latest.text.includes(item.data.title)||listProducts(pid).filter(v=>v.data.title===item.data.title).length!==1)throw new HttpError(409,L('Désignez la fiche exacte avant de créer ses clips.','Select the exact listing before creating its clips.'));
  binding.product={productId:t.productId,version:t.version,...(t.variant?{variant:t.variant}:{})};
  if(selected){const original=selected.binding?.references[0]??selected.pin;binding.references=[pinImageAsset(c.user_id,pid,original.assetId,original.version)];}
 }else{
  const target=plan.target,s=p.services.services.find(s=>s.key===target.key);if(!s||!latest.text.includes(s.name))throw new HttpError(409,L('Nommez la prestation exacte avant de créer ses clips.','Name the exact service before creating its clips.'));
  binding.service={key:target.key,sha256:imageBindingHash(s)};if(selected)binding.references=[selected.pin];
 }
 const strategy=p.business==='services'&&plan.purpose!=='site'?communicationStrategy(pid):null;
 const request:ThreeScenesRequest={voice:plan.voice,binding,generation:plan.generation,mode:'ai',as:plan.purpose==='ad'?'ad':'post',...(plan.purpose==='site'?{purpose:'site'}:{}),...(strategy?{angleId:strategy.angleId}:{}),scenes:plan.scenario.scenes.length,totalS:plan.totalS,aspect:plan.aspect,music:plan.music,request:latest.text,...(selected?{sceneImages:plan.scenario.scenes.map(()=>({...selected.pin,use:'reference' as const}))}:{})};
 const resolved=sceneSubjectContext(p,request),scenario=approvedScenePlan(resolved.project,request,plan.scenario);
 const strategySnapshot:StrategyStamp|null=plan.purpose==='site'?null:strategy?{id:strategy.id,version:strategy.version,angleId:strategy.angleId,inputDigest:strategy.inputDigest}:strategyStamp(pid);
 return{plan,request,scenario,strategy:strategySnapshot,instruction:latest.text,subject:resolved.subject!.name,scope:videoProjectScope(pid),bindingDigest:resolved.bindingDigest!};
}
