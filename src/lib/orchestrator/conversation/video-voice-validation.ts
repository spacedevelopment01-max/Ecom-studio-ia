import {HttpError}from '../../auth';
import {loadProject}from '../../projects';
import {latestVideo}from '../../video-v2/store';
import {imageBindingHash}from '../../image-v2/request-binding';
import {videoDocumentPins,videoProjectScope}from './video-tool-validation';
import {VideoVoicePlanSchema}from './video-voice-contract';
import {metaOf}from './store';
import {L}from '../../i18n-server';
import type {ConversationRow}from './contract';
import {applyWordingDeep,loadWordingRules}from '../../client-wording';
import {allowedBrands,brandIssuesInTexts}from '../../video-v2/brand-guard';
import {usable}from '../../video-v2/ad-storyboard';
import {recordedContentStrategy,strategyStamp}from '../../strategy-consumption';
type Sources={sources:{id:string;text:string}[];lastClientRequest:{sourceId:string|null;text:string}|null};
export function validateVoiceProposal(c:ConversationRow,raw:unknown,sources:Sources){
 const plan=VideoVoicePlanSchema.parse(raw),pid=c.project_id,latest=sources.lastClientRequest,source=sources.sources.find(s=>s.id===plan.sourceId);
 if(!pid||!latest?.sourceId||plan.sourceId!==latest.sourceId||!source?.text.includes(plan.quote)||!latest.text.includes(plan.quote))throw new HttpError(409,L('La correction doit citer votre dernière demande exacte.','The correction must cite your latest exact request.'));
 const p=loadProject(pid),current=latestVideo(pid,plan.docKey);if(!current||current.version.id!==plan.expectedVersionId||current.version.version!==plan.expectedVersion)throw new HttpError(409,L('La version vidéo désignée a changé.','The selected video version changed.'));
 const focus=metaOf(c).activeContext?.target;if(focus?.kind==='asset'&&focus.assetId!==current.version.renderedAssetId)throw new HttpError(409,L('La vidéo ne correspond pas au média désigné.','The video does not match the selected media.'));
 if(current.doc.meta.siteAmbience)throw new HttpError(409,L('Cette vidéo d’ambiance est prévue sans voix. Choisissez une vidéo de communication.','This ambience video is intended without speech. Choose a communication video.'));
 const fields=Object.fromEntries(plan.changes.map(x=>[x.clipId,x.text]));if(plan.changes.some(x=>!current.doc.clips.some(c=>c.id===x.clipId)||!usable(x.text)))throw new HttpError(409,L('Une phrase ou son plan manque ; aucun texte retiré.','A phrase or its shot is missing; no text removed.'));
 const frozen=current.doc.meta.editorial?.identity as {name?:unknown}|undefined,allowed=[...allowedBrands(p),...(typeof frozen?.name==='string'?[frozen.name]:[])];
 if(brandIssuesInTexts(fields,allowed).length||imageBindingHash(applyWordingDeep(fields,loadWordingRules(pid)))!==imageBindingHash(fields))throw new HttpError(409,L('La phrase contredit une marque ou le vocabulaire autorisé. Relisez-la ; aucun remplacement implicite.','The phrase conflicts with an allowed brand or wording. Review it; no implicit replacement.'));
 return{plan,doc:current.doc,pins:videoDocumentPins(c.user_id,pid,current.doc),current:{id:current.version.id,version:current.version.version,docKey:plan.docKey,renderedAssetId:current.version.renderedAssetId},scope:videoProjectScope(pid),strategy:recordedContentStrategy(pid,'video',current.version.id)??strategyStamp(pid),instruction:latest.text};
}
