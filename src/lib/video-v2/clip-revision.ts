/** Reprise native d’un seul plan. Devis/acquis communs aux scènes ; aucun texte, audio ou montage substitué. */
import {createHash}from 'node:crypto';
import {HttpError}from '../auth';
import {all,one}from '../db';
import {loadProject}from '../projects';
import {getAsset,assetData,assetMeta,type Asset}from '../library';
import {ImageBindingSchema,imageBindingHash}from '../image-v2/request-binding';
import {requireCreationPlan}from '../plan-gates';
import {aiActiveFor}from '../ai/access';
import {applyWordingDeep,loadWordingRules}from '../client-wording';
import {assertAdvertising}from '../job-entitlements';
import {isAutoUsable}from '../quality/usable';
import {boundedDirectShots,assertBoundedSceneQuote,type BoundedSceneQuote}from './bounded-quote';
import {sceneSubjectContext}from './subject-binding';
import {videoDocumentPins}from './document-pins';
import {inspectVideoReceipt}from './receipts';
import {acquireDirectScene,realThreeScenesDeps,type ThreeScenesRequest,type ThreeScenesDeps}from './three-scenes';
import {ClipRevisionSchema,type ClipRevision}from './clip-revision-contract';
import type {VideoDocument}from './types';
import type {JobContext}from '../jobs';
import {L}from '../i18n-server';
import {withCommunicationStrategy,withSiteStrategy}from '../strategy-consumption';
function revisionScope<T>(pid:string,doc:VideoDocument,fn:()=>T):T{const s=doc.meta.marketingStrategy;return doc.meta.siteAmbience?withSiteStrategy(pid,fn):withCommunicationStrategy(pid,fn,s?{strategyId:s.id,angleId:s.angleId}:{});}
type Pin={assetId:string;version:number;sha256:string};
function pin(userId:string,pid:string,a:Asset):Pin{if(a.user_id!==userId||a.project_id!==pid||a.deleted_at||a.role!=='clip'||a.kind!=='video')throw new HttpError(409,L('Clip acquis invalide ; aucun nouvel achat.','Invalid acquired clip; no new purchase.'));let bytes:Buffer;try{bytes=assetData(a);}catch{throw new HttpError(409,L('Clip acquis manquant ; aucun nouvel achat.','Acquired clip missing; no new purchase.'));}if(bytes.length<16||bytes.toString('ascii',4,8)!=='ftyp')throw new HttpError(409,L('Clip acquis absent ou illisible ; aucun nouvel achat.','Acquired clip missing or unreadable; no new purchase.'));return{assetId:a.id,version:a.version,sha256:createHash('sha256').update(bytes).digest('hex')};}
function prepared(pid:string,doc:VideoDocument,input:ClipRevision,instruction:string){
 if(!instruction.trim()||instruction.length>100000)throw new HttpError(409,L("Précisez la demande complète du clip ; aucun texte tronqué.","Provide the complete clip request; no text truncated."));
 const change=ClipRevisionSchema.parse(input),root=loadProject(pid),clip=doc.clips.find(c=>c.id===change.clipId);
 if(!clip||clip.source.kind!=='video')throw new HttpError(409,L('Choisissez un plan vidéo existant, pas une image ou une carte de fin.','Select an existing video shot, not an image or end card.'));
 const binding=ImageBindingSchema.parse(doc.meta.editorial?.nativeBinding),as=doc.meta.intent==='video_ad'?'ad':'post';
 const request:ThreeScenesRequest={as,aspect:doc.aspect,generation:change.generation,binding,voice:'none',scenes:1,request:instruction,...(change.reference?{sceneImages:[{...change.reference,use:'reference'}]}:{})};
 const native=sceneSubjectContext(root,request),identity=doc.meta.editorial?.identity as{brand?:unknown}|undefined;
 if(!identity?.brand||imageBindingHash(identity.brand)!==imageBindingHash(root.brand))throw new HttpError(409,L('La marque du document doit être confirmée avant un nouveau clip. Aucune identité remplacée.','Confirm the document brand before a new clip. No identity replaced.'));
 if(imageBindingHash(applyWordingDeep(change.scene,loadWordingRules(pid)))!==imageBindingHash(change.scene))throw new HttpError(409,L('La scène contredit le vocabulaire enregistré. Corrigez-la explicitement.','The scene conflicts with saved wording. Correct it explicitly.'));
 const visibleS=Math.min(clip.durationS,(clip.source.outS??clip.durationS)-clip.source.inS);
 if(!Number.isFinite(visibleS)||visibleS<=0||visibleS>15)throw new HttpError(409,L('Durée du plan incompatible avec une reprise ciblée.','Shot duration incompatible with targeted replacement.'));
 const scene={...change.scene,title:''},mediaKey='clip-revision:'+imageBindingHash({binding:native.bindingDigest,scene,reference:change.reference,aspect:doc.aspect,visibleS,instruction,brand:root.brand,clipId:clip.id});
 return{change,root,project:native.project,bindingDigest:native.bindingDigest!,request,clipId:clip.id,visibleS,scene,mediaKey};
}
export function quoteClipRevision(pid:string,doc:VideoDocument,input:ClipRevision,instruction:string){return revisionScope(pid,doc,()=>quoteClipRevisionInScope(pid,doc,input,instruction));}
function quoteClipRevisionInScope(pid:string,doc:VideoDocument,input:ClipRevision,instruction:string){
 const p=prepared(pid,doc,input,instruction),pins=videoDocumentPins(p.root.userId,pid,doc),prior=all<Asset>("SELECT * FROM assets WHERE project_id=? AND role='clip' AND json_extract(meta,'$.scenes.key')=? ORDER BY created_at DESC LIMIT 1",pid,p.mediaKey)[0]??null;
 const clipReceipt=inspectVideoReceipt(pid,p.mediaKey+':direct:0'),qcReceipt=inspectVideoReceipt(pid,p.mediaKey+':direct-qc:0');
 if(prior&&(prior.deleted_at||prior.status==='rejected'))throw new HttpError(409,L('Cette tentative a déjà un clip supprimé ou refusé. Aucun rachat automatique.','This attempt already has a deleted or rejected clip. No automatic repurchase.'));
 const gate=prior?assetMeta<any>(prior).gate:null,recordedGate=gate?.checkId?one<{verdict:string}>('SELECT verdict FROM quality_checks WHERE id=? AND project_id=? AND asset_id=?',gate.checkId,pid,prior!.id):null;
 if(prior&&(recordedGate&&recordedGate.verdict!=='FINAL'||gate?.fatal||['RETRY','REJECTED'].includes(gate?.verdict)))throw new HttpError(409,L('Le contrôle de ce clip l’a refusé ou laissé non vérifié. Acquis conservé pour inspection ; aucune nouvelle tentative automatique.','The shot review refused it or left it unverified. Acquisition kept for inspection; no automatic new attempt.'));
 const priorPin=prior?pin(p.root.userId,pid,prior):null,acquired=!!prior&&isAutoUsable(prior)&&gate?.checked===true&&gate.verdict==='FINAL';
 if(!acquired&&(clipReceipt.state==='blocked'||qcReceipt.state==='blocked'))throw new HttpError(409,L('Un reçu de cette tentative est incertain ou absent. Rapprochez-le avant toute suite ; aucun nouvel envoi.','An attempt receipt is uncertain or missing. Reconcile it before continuing; no new dispatch.'));
 const needsClip=!priorPin&&clipReceipt.state!=='received',needsReview=!acquired&&qcReceipt.state!=='received';let native:BoundedSceneQuote|null=null,capMicro=0,estimateMicro=0;
 if(needsClip||needsReview){
  if(p.request.as==='ad')assertAdvertising(pid);
  if(!aiActiveFor(p.root.userId,pid))throw new HttpError(409,L('IA indisponible pour les seuls appels encore nécessaires. Acquis conservés.','AI unavailable for the only calls still needed. Acquisitions kept.'));
  if(needsClip){requireCreationPlan(null,pid,'videos');if((doc.meta.retakeCount??0)>=1)throw new HttpError(409,L('Une reprise ciblée a déjà été utilisée. Version conservée ; nouveau scénario requis.','A targeted replacement was already used. Version kept; new scenario required.'));}
  native=boundedDirectShots(p.project,{reviewOnly:!needsClip,generation:p.change.generation,aspect:doc.aspect==='16:9'?'16:9':'9:16',seconds:p.visibleS,bindingDigest:p.bindingDigest,request:instruction,scenes:[{scene:p.scene,reference:p.change.reference}]});
  capMicro=(needsClip?native.clip!.capMicro:0)+(needsReview?native.scenes[0].review.capMicro:0);estimateMicro=(needsClip?(native.clip?.unitMicro??0):0)+(needsReview?native.estimateMicro-(native.clip?.unitMicro??0):0);
 }
 const value={schema:1 as const,documentHash:imageBindingHash(doc),pins,input:p.change,instruction,mediaKey:p.mediaKey,visibleS:p.visibleS,priorPin,clipReceipt,qcReceipt,acquired,needsClip,needsReview,native,capMicro,estimateMicro,maximumCalls:Number(needsClip)+Number(needsReview),request:p.request};return{...value,fingerprint:imageBindingHash(value)};
}
export type ClipRevisionQuote=ReturnType<typeof quoteClipRevision>;
export function assertClipRevisionQuote(pid:string,doc:VideoDocument,q:ClipRevisionQuote){
 const{fingerprint,...value}=q;if(fingerprint!==imageBindingHash(value)||q.documentHash!==imageBindingHash(doc))throw new HttpError(409,L('Le document ou son devis de clip a changé.','The document or clip quote changed.'));
 const p=prepared(pid,doc,q.input,q.instruction);if(p.mediaKey!==q.mediaKey||imageBindingHash(videoDocumentPins(p.root.userId,pid,doc))!==imageBindingHash(q.pins))throw new HttpError(409,L('Un média ou son contexte a changé. Aucun rachat implicite.','A media file or its context changed. No implicit repurchase.'));
 if(q.priorPin){const a=getAsset(q.priorPin.assetId);if(!a||imageBindingHash(pin(p.root.userId,pid,a))!==imageBindingHash(q.priorPin))throw new HttpError(409,L('Le clip acquis a changé. Aucun rachat.','The acquired clip changed. No repurchase.'));}
 for(const[k,old]of[['clip',q.clipReceipt],['qc',q.qcReceipt]]as const){if(old.state==='received'){const current=inspectVideoReceipt(pid,q.mediaKey+(k==='clip'?':direct:0':':direct-qc:0'));if(current.state!=='received'||current.sha256!==old.sha256)throw new HttpError(409,L('Le reçu acquis a changé. Aucun nouvel appel autorisé.','The acquired receipt changed. No new request authorized.'));}}
 if(q.native)assertBoundedSceneQuote(q.native);return p;
}
/** Pas de sauvegarde implicite : le worker vérifie sa version attendue et conserve tout acquis avant conflit. */
export async function applyClipRevision(ctx:JobContext|null,pid:string,original:VideoDocument,q:ClipRevisionQuote,o:{deps?:ThreeScenesDeps;beforeAcquire?:()=>void}={}){return revisionScope(pid,original,()=>applyClipRevisionInScope(ctx,pid,original,q,o));}
async function applyClipRevisionInScope(ctx:JobContext|null,pid:string,original:VideoDocument,q:ClipRevisionQuote,o:{deps?:ThreeScenesDeps;beforeAcquire?:()=>void}){
 const p=assertClipRevisionQuote(pid,original,q),request={...q.request,...(q.native?{quotedGeneration:q.native}:{})},deps={...(o.deps??realThreeScenesDeps(ctx,{userId:p.root.userId,projectId:pid},{aiText:true,request}))};
 if(!q.needsClip)deps.directClip=async()=>{throw new HttpError(409,L('Ce devis n’autorise aucun nouveau clip.','This quote authorizes no new clip.'));};
 if(!q.needsReview)deps.reviewMedia=async()=>{throw new HttpError(409,L('Ce devis n’autorise aucun nouveau contrôle.','This quote authorizes no new review.'));};
 const assetId=await acquireDirectScene(p.project,{ctx,index:0,key:q.mediaKey,rootKey:q.mediaKey,as:p.request.as,aspect:original.aspect,generation:p.change.generation,scene:p.scene,reference:p.change.reference?assetData(getAsset(p.change.reference.assetId)!):null,referenceAssetId:p.change.reference?.assetId??null,clipS:p.visibleS,minimumDurationS:p.visibleS,request:q.instruction,folderKey:p.request.as==='ad'?'videos.ads':'videos.social',prior:q.priorPin?getAsset(q.priorPin.assetId)??null:null,beforeAcquire:()=>{o.beforeAcquire?.();assertClipRevisionQuote(pid,original,q);}},deps);
 const doc=structuredClone(original),clip=doc.clips.find(c=>c.id===q.input.clipId)!;if(clip.source.kind!=='video')throw new HttpError(409,'clip_source_changed');
 const changed=clip.source.assetId!==assetId;if(changed){const originalAssetId=clip.source.assetId;clip.source={...clip.source,assetId,inS:0,outS:q.visibleS,muted:true};doc.meta.retakeCount=(doc.meta.retakeCount??0)+1;doc.meta.editorial={...doc.meta.editorial,clipRevision:{clipId:clip.id,originalAssetId,assetId,instruction:q.instruction,scene:q.input.scene,bindingDigest:p.bindingDigest}};}
 return{doc,changed,assetId,newClipRequested:q.needsClip,voicesGenerated:0 as const};
}
