import {HttpError}from '../../auth';
import {loadProject}from '../../projects';
import {latestVideo}from '../../video-v2/store';
import {VideoClipPlanSchema}from './video-clip-contract';
import {videoDocumentPins,videoProjectScope}from './video-tool-validation';
import {recordedContentStrategy,strategyStamp}from '../../strategy-consumption';
import {metaOf}from './store';
import {usable}from '../../video-v2/ad-storyboard';
import type {ConversationRow}from './contract';
import {L}from '../../i18n-server';
type Sources={sources:{id:string;text:string}[];lastClientRequest:{sourceId:string|null;text:string}|null};
export function validateClipProposal(c:ConversationRow,raw:unknown,sources:Sources){
 const plan=VideoClipPlanSchema.parse(raw),pid=c.project_id,last=sources.lastClientRequest,source=sources.sources.find(v=>v.id===plan.sourceId);
 if(!pid||!last?.sourceId||plan.sourceId!==last.sourceId||!source?.text.includes(plan.quote)||!last.text.includes(plan.quote))throw new HttpError(409,L('La reprise doit citer votre dernière demande exacte.','The replacement must cite your latest exact request.'));
 const p=loadProject(pid),cur=latestVideo(pid,plan.docKey);if(!cur||cur.version.id!==plan.expectedVersionId||cur.version.version!==plan.expectedVersion)throw new HttpError(409,L('La vidéo désignée a changé. Aucune version manuelle écrasée.','The selected video changed. No manual version overwritten.'));
 const focus=metaOf(c).activeContext?.target;if(focus?.kind==='asset'&&focus.assetId!==cur.version.renderedAssetId)throw new HttpError(409,L('Cette vidéo ne correspond pas au média désigné.','This video does not match the selected media.'));
 const clip=cur.doc.clips.find(v=>v.id===plan.clipId);if(!clip||clip.source.kind!=='video'||!usable(plan.scene.still)||!usable(plan.scene.motion))throw new HttpError(409,L('Désignez un vrai plan vidéo et une scène complète ; rien n’est remplacé par du texte ou une photo.','Select an actual video shot and complete scene; nothing is replaced by text or a photo.'));
 return{plan,doc:cur.doc,current:{id:cur.version.id,version:cur.version.version,docKey:plan.docKey,renderedAssetId:cur.version.renderedAssetId},pins:videoDocumentPins(c.user_id,pid,cur.doc),scope:videoProjectScope(pid),strategy:recordedContentStrategy(pid,'video',cur.version.id)??strategyStamp(pid),instruction:last.text,business:p.business};
}
