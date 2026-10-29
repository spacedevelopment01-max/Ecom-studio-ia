/** Identifiants/photos/versions réels. Le scénario est une proposition IA, jamais une permission. */
import {HttpError}from '../../auth';
import {loadProject}from '../../projects';
import {all}from '../../db';
import {stableHash}from '../../brain/hash';
import {loadWordingRules}from '../../client-wording';
import {getProduct,listProducts}from '../../products/catalog';
import {latestVideo,listVideoVersions,videoVersionDoc,referencedAssets,foreignVideoAssets}from '../../video-v2/store';
import {getAsset,assetData}from '../../library';
import {createHash}from 'node:crypto';
import {conversationMotionDocument,conversationVideoEdit}from '../../video-v2/conversation-motion';
import {resolveLocalVideoImageBinding,imageBindingHash,type ImageBinding}from '../../image-v2/request-binding';
import {selectedLocalVideoSource,isNativeIdentityImage}from './image-tool-sources';
import {metaOf}from './store';
import {VideoToolPlanSchema}from './video-tool-contract';
import type {ConversationRow}from './contract';
import {L}from '../../i18n-server';
import {assertAdvertising}from '../../job-entitlements';
import {communicationStrategy}from '../../marketing-strategy';
import {strategyStamp,recordedContentStrategy,type StrategyStamp}from '../../strategy-consumption';
type Sources={sources:{id:string;text:string}[];lastClientRequest:{sourceId:string|null;text:string}|null};
export function videoProjectScope(pid:string){const p=loadProject(pid);return stableHash('agent-video-project-1',{project:p.id,business:p.business,storeType:p.storeType,brand:p.brand,product:p.product,services:p.services,strategy:p.strategy,catalogue:listProducts(pid,{includeArchived:true}),wording:loadWordingRules(pid),clientMemory:all<{kind:string;key:string;value:string}>("SELECT kind,key,value FROM memory WHERE project_id=? AND source='user' AND kind IN ('decision','rejection') ORDER BY kind,key,rowid",pid)});}
export function videoDocumentPins(userId:string,pid:string,doc:Parameters<typeof referencedAssets>[0]){
 if(foreignVideoAssets(pid,doc).length)throw new HttpError(409,L('Un média de cette vidéo manque ou n’appartient pas au projet.','A video media file is missing or does not belong to this project.'));
 return referencedAssets(doc).map(assetId=>{const a=getAsset(assetId)!;if(a.user_id!==userId||a.status==='rejected')throw new HttpError(404,L('Média vidéo autorisé introuvable.','Authorized video media not found.'));const bytes=assetData(a);if(!bytes.length)throw new HttpError(409,L('Un fichier vidéo source est vide.','A source video file is empty.'));return{assetId,version:a.version,sha256:createHash('sha256').update(bytes).digest('hex')};});
}
export function validateVideoToolProposal(c:ConversationRow,raw:unknown,sources:Sources){
 const plan=VideoToolPlanSchema.parse(raw),pid=c.project_id,latest=sources.lastClientRequest,source=sources.sources.find(s=>s.id===plan.sourceId);
 if(!pid||!latest?.sourceId||plan.sourceId!==latest.sourceId||!source?.text.includes(plan.quote)||!latest.text.includes(plan.quote))throw new HttpError(409,L('La proposition doit citer votre dernière demande exacte et son projet.','The proposal must cite your latest exact request and project.'));
 const p=loadProject(pid);let doc:Parameters<typeof referencedAssets>[0],current=null as ReturnType<typeof latestVideo>;
 if(plan.tool==='videos.motion'){
  if(plan.purpose==='ad')assertAdvertising(pid);
  const images=plan.scenes.map((s,i)=>selectedLocalVideoSource(c,s.image,latest.text,i>0));const identityOnly=images.every(i=>isNativeIdentityImage(getAsset(i.pin.assetId)!));let projected=p;
  for(const image of images){
   const binding:ImageBinding={schema:1,people:'none',references:[],edit:{source:image.pin}},target=plan.target;
   if(target.kind==='product'){
    const product=getProduct(pid,target.productId),focus=metaOf(c).activeContext?.target,focused=(focus?.kind==='catalogue-product'||focus?.kind==='catalogue-variant')&&focus.productId===target.productId;
    if(image.binding?.product?.productId!==target.productId&&!focused&&(!latest.text.includes(product.data.title)||listProducts(pid).filter(v=>v.data.title===product.data.title).length!==1))throw new HttpError(409,L('Désignez la fiche produit exacte pour cette vidéo.','Select the exact product listing for this video.'));
    const original=image.binding?.references[0]??image.pin;binding.references=[original];binding.product={productId:target.productId,version:target.version,...(target.variant?{variant:target.variant}:{})};
   }else if(target.kind==='service'){
    const service=p.services.services.find(s=>s.key===target.key);if(!service||image.binding?.service?.key!==target.key&&!latest.text.includes(service.name))throw new HttpError(409,L('Nommez la prestation exacte avant la vidéo.','Name the exact service before the video.'));binding.service={key:target.key,sha256:imageBindingHash(service)};
   }else if(!identityOnly&&(p.storeType!=='mono'||p.business==='products'&&listProducts(pid).length>1||p.business==='services'&&p.services.services.length!==1))throw new HttpError(409,L('Plusieurs offres existent : désignez la fiche ou la prestation exacte.','Several offers exist: select the exact listing or service.'));
   if(image.binding?.product&&(target.kind!=='product'||image.binding.product.productId!==target.productId)||image.binding?.service&&(target.kind!=='service'||image.binding.service.key!==target.key))throw new HttpError(409,L('Une image appartient à une autre offre.','An image belongs to a different offer.'));
   projected=resolveLocalVideoImageBinding(p,binding).project;
  }
  doc=conversationMotionDocument(projected,plan,images.map(v=>v.pin.assetId));
 }else{
  current=latestVideo(pid,plan.docKey);if(!current||current.version.version!==plan.expectedVersion||current.version.id!==plan.expectedVersionId)throw new HttpError(409,L('La version vidéo a changé ou manque. Aucun remplacement.','The video version changed or is missing. No replacement.'));
  const focus=metaOf(c).activeContext?.target;if(focus?.kind==='asset'&&current.version.renderedAssetId!==focus.assetId)throw new HttpError(409,L('La vidéo diffère du média désigné.','The video differs from the selected media.'));
  const previous=plan.tool==='videos.restore'?videoVersionDoc(pid,plan.docKey,plan.restoreVersion):null;
  if(plan.tool==='videos.restore'&&!previous)throw new HttpError(404,L('Version à restaurer introuvable.','Restore version not found.'));
  doc=previous??conversationVideoEdit(current.doc,plan.tool==='videos.edit'?plan.ops:[]);
 }
 const inheritedId=current?(plan.tool==='videos.restore'?listVideoVersions(pid,plan.docKey).find(v=>v.version===plan.restoreVersion)?.id:current.version.id):null;
 const inherited=inheritedId?recordedContentStrategy(pid,'video',inheritedId):null;
 const selection=p.business==='services'?communicationStrategy(pid,inherited?{strategyId:inherited.id}:{}):null;
 const strategy:StrategyStamp|null=selection?{id:selection.id,version:selection.version,angleId:selection.angleId,inputDigest:selection.inputDigest}:inherited??strategyStamp(pid);
 const pins=videoDocumentPins(c.user_id,pid,doc);return{plan,doc,pins,strategy,before:current?.doc??null,current:current?{id:current.version.id,version:current.version.version,docKey:current.version.docKey}:null,scope:videoProjectScope(pid),instruction:latest.text};
}
