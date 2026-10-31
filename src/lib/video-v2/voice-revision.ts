/** Révision vocale native : devis de phrases exactes, acquis réutilisés, aucun nouveau clip. */
import {z}from 'zod';
import {createHash}from 'node:crypto';
import {HttpError}from '../auth';
import {all,json}from '../db';
import {loadProject}from '../projects';
import {getAsset,assetData,assetMeta}from '../library';
import {imageBindingHash}from '../image-v2/request-binding';
import {loadCreativeMemory}from './creative-memory';
import {buildCreativeBrief}from './creative-brief';
import {voiceAvailable,projectVoice,countWords,measuredCues,synthLine}from './voice';
import {addVoice,type ScenePlan}from './three-scenes';
import {isOpenAIVoice,voiceAcquisitionInfo,voiceOperation,voiceQuote}from './openai-voice';
import {timeline}from './doc';
import type {VideoDocument}from './types';
import {L}from '../i18n-server';
export const VoiceProfileSchema=z.object({id:z.string().refine(v=>isOpenAIVoice(v)||['ff_siwis','am_michael'].includes(v)),speed:z.number().finite().min(.25).max(4),lang:z.enum(['fr','en'])}).strict();
export type VoiceProfile=z.infer<typeof VoiceProfileSchema>;
import {VoiceChangesSchema,type VoiceChanges}from './voice-revision-contract';
export {VoiceChangesSchema}from './voice-revision-contract';
export type {VoiceChanges}from './voice-revision-contract';
function audioPin(user:string,pid:string,assetId:string){const a=getAsset(assetId);if(!a||a.user_id!==user||a.project_id!==pid||a.deleted_at||a.status==='rejected'||a.kind!=='audio'||a.role!=='voice')throw new HttpError(409,L('Un audio acquis manque ou a été refusé. Aucun rachat implicite.','An acquired audio is missing or rejected. No implicit repurchase.'));let b:Buffer;try{b=assetData(a);}catch{throw new HttpError(409,L('Le fichier vocal acquis manque ; aucun nouvel achat.','Acquired voice file is missing; no new purchase.'));}if(!b.length)throw new HttpError(409,L('Audio acquis vide.','Acquired audio is empty.'));return{assetId:a.id,version:a.version,sha256:createHash('sha256').update(b).digest('hex')};}
/** Les anciens documents ne doivent pas deviner leur vitesse à partir des réglages actuels. */
export function documentVoiceProfile(pid:string,docKey:string,doc:VideoDocument):VoiceProfile|null{
 const p=loadProject(pid),voices=doc.audio.voice.filter(v=>v.assetId),declared=VoiceProfileSchema.safeParse(doc.meta.editorial?.voiceProfile);
 if(!voices.length){
 const memory=loadCreativeMemory(pid,p),id=projectVoice(memory.preferences);if(!id)return null;const brief=buildCreativeBrief(p,{durationS:timeline(doc).total,width:doc.width,height:doc.height,platform:doc.aspect==='9:16'?'reels':'meta_feed',memory});
 return{id,speed:brief.voice.speed,lang:p.settings?.language==='en'?'en':'fr'};
 }
 const candidates:{profile:VoiceProfile;nativeKey?:string}[]=[];if(declared.success)candidates.push({profile:declared.data});
 const keys=[docKey,doc.meta.createdFrom??docKey];
 const rows=all<{value:string}>("SELECT value FROM memory WHERE project_id=? AND kind='artifact' AND key LIKE 'agent.video.generation.%' AND CASE WHEN json_valid(value) THEN json_extract(value,'$.docKey') END IN (?,?) ORDER BY created_at DESC,rowid DESC",pid,...keys);
 for(const row of rows){const q=json<{cost?:{voice?:unknown};request?:{key?:string}}>(row.value,{}),raw=q.cost?.voice as {id?:unknown;speed?:unknown;lang?:unknown}|null,parsed=VoiceProfileSchema.safeParse(raw?{id:raw.id,speed:raw.speed,lang:raw.lang}:null);if(parsed.success)candidates.push({profile:parsed.data,nativeKey:q.request?.key});}
 for(const candidate of candidates){const profile=candidate.profile;
  if(voices.every(v=>{const a=getAsset(v.assetId!);if(!a||a.user_id!==p.userId||a.project_id!==pid||a.deleted_at||a.status==='rejected')return false;const m=assetMeta<{voice?:{operation?:string;id?:string;key?:string;text?:string;speed?:number;lang?:string}}>(a).voice;
   return isOpenAIVoice(profile.id)?m?.operation===voiceOperation(v.text,{voice:profile.id,speed:profile.speed,lang:profile.lang}):m?.id===profile.id&&m.text===v.text&&(m.speed===profile.speed&&m.lang===profile.lang||!!candidate.nativeKey&&m.key===candidate.nativeKey);
  }))return profile;
 }
 return null;
}
export function quoteVoiceRevision(pid:string,docKey:string,doc:VideoDocument,input:VoiceChanges){
 if(new Set(doc.audio.voice.map(v=>v.clipId)).size!==doc.audio.voice.length)throw new HttpError(409,L('Plusieurs pistes vocales concernent un même plan : précisez la piste avant de la corriger.','Several voice tracks concern the same shot: select the track before editing.'));
 const change=VoiceChangesSchema.parse(input),p=loadProject(pid),profile=documentVoiceProfile(pid,docKey,doc);if(!profile)throw new HttpError(409,L('Choisissez ou confirmez la voix et ses réglages : le profil original ne peut pas être prouvé. Aucun audio ou clip acheté.','Choose or confirm the voice settings: the original profile cannot be proved. No audio or clip purchased.'));
 const preferences=loadCreativeMemory(pid,p).preferences;const assertSelected=()=>{if(preferences.voice!=='on'||preferences.voiceConsent!=='synthetic')throw new HttpError(409,L('Confirmez une voix synthétique dans le projet avant une nouvelle phrase.','Confirm a synthetic voice in the project before a new phrase.'));};
 const clips=new Map(doc.clips.map(c=>[c.id,c])),old=new Map(doc.audio.voice.map(v=>[v.clipId,v]));for(const x of change.changes)if(!clips.has(x.clipId))throw new HttpError(409,L('Le plan vocal désigné manque.','The selected voice shot is missing.'));
 let capMicro=0,estimateMicro=0,maximumCalls=0;
 const lines=change.changes.map(x=>{
  const before=old.get(x.clipId),pin=before?.assetId?audioPin(p.userId,pid,before.assetId):null;
  if(before?.text===x.text&&pin)return{...x,state:'keep' as const,pin,capMicro:0,estimateMicro:0};
  const clip=clips.get(x.clipId)!;if(countWords(x.text)>Math.floor((clip.durationS-.3)*2.4))throw new HttpError(409,L('La phrase entière dépasse la place du plan. Adaptez le texte ou la durée ; rien n’est tronqué.','The whole phrase exceeds the shot space. Adjust its text or duration; nothing is truncated.'));
  if(isOpenAIVoice(profile.id)){
   const acquired=voiceAcquisitionInfo({userId:p.userId,projectId:pid},x.text,{voice:profile.id,speed:profile.speed,lang:profile.lang});if(acquired.state==='blocked')throw new HttpError(409,L('Une phrase déjà envoyée reste incertaine, absente ou illisible. Faites vérifier son reçu ; aucune nouvelle synthèse.','A previously sent phrase remains uncertain, missing or unreadable. Have its receipt checked; no new synthesis.'));
   if(acquired.state!=='new')return{...x,state:'acquired' as const,acquired,capMicro:0,estimateMicro:0};
   assertSelected();if(!voiceAvailable(profile.id))throw new HttpError(409,L('La voix choisie est indisponible ; choix et acquis conservés.','The selected voice is unavailable; choice and acquired work kept.'));
   const q=voiceQuote(x.text);capMicro+=q.capMicro;estimateMicro+=q.estimateMicro;maximumCalls++;return{...x,state:'new' as const,fingerprint:acquired.fingerprint,capMicro:q.capMicro,estimateMicro:q.estimateMicro};
  }
  assertSelected();if(!voiceAvailable(profile.id))throw new HttpError(409,L('La voix locale choisie est indisponible. Aucun autre timbre substitué.','The selected local voice is unavailable. No other voice substituted.'));
  return{...x,state:'local' as const,capMicro:0,estimateMicro:0};
 });
 const value={schema:1 as const,documentHash:imageBindingHash(doc),profile,changes:change,lines,capMicro,estimateMicro,maximumCalls,clipsPurchased:0 as const};return{...value,fingerprint:imageBindingHash(value)};
}
export type VoiceRevisionQuote=ReturnType<typeof quoteVoiceRevision>;

/** Le reçu peut progresser de nouvelle phrase à acquis, jamais l’inverse sans nouvel accord. */
export function assertVoiceRevisionQuote(pid:string,doc:VideoDocument,q:VoiceRevisionQuote){
 const{fingerprint,...value}=q;if(fingerprint!==imageBindingHash(value)||q.documentHash!==imageBindingHash(doc))throw new HttpError(409,L('Le document ou son devis vocal a changé. Aucun nouvel appel.','The document or voice quote changed. No new request.'));
 const p=loadProject(pid),preferences=loadCreativeMemory(pid,p).preferences;
 for(const line of q.lines){
  if(line.state==='keep'){if(imageBindingHash(audioPin(p.userId,pid,line.pin.assetId))!==imageBindingHash(line.pin))throw new HttpError(409,L('Un audio acquis a changé.','An acquired audio changed.'));continue;}
  if(!isOpenAIVoice(q.profile.id)){if(!voiceAvailable(q.profile.id)||preferences.voice!=='on'||preferences.voiceConsent!=='synthetic')throw new HttpError(409,L('La voix locale n’est plus disponible ou consentie.','The local voice is no longer available or consented.'));continue;}
  const fresh=voiceAcquisitionInfo({userId:p.userId,projectId:pid},line.text,{voice:q.profile.id,speed:q.profile.speed,lang:q.profile.lang});
  if(fresh.state==='blocked'||line.state==='acquired'&&(fresh.state==='new'||fresh.sha256!==line.acquired.sha256))throw new HttpError(409,L('Le reçu vocal acquis ne permet pas cette reprise. Aucun rachat.','The acquired voice receipt does not allow this recovery. No repurchase.'));
  if(line.state==='new'&&fresh.fingerprint!==line.fingerprint)throw new HttpError(409,L('La route vocale a changé. Actualisez le devis sans générer.','The voice route changed. Refresh the quote without generating.'));
  if(fresh.state==='new'){
   if(!voiceAvailable(q.profile.id)||preferences.voice!=='on'||preferences.voiceConsent!=='synthetic'||voiceQuote(line.text).capMicro>line.capMicro)throw new HttpError(409,L('La voix, son accord ou son tarif a changé. Aucun nouvel appel.','The voice, its consent or price changed. No new request.'));
  }
 }
}
/** Uniquement les phrases changées sont transmises au moteur vocal natif. Le document d’entrée reste intact. */
export async function applyVoiceRevision(pid:string,docKey:string,original:VideoDocument,q:VoiceRevisionQuote,o:{synth?:typeof synthLine;beforeEach?:()=>void}={}){
 assertVoiceRevisionQuote(pid,original,q);const p=loadProject(pid),doc=structuredClone(original),changed=new Map(q.lines.filter(x=>x.state!=='keep').map(x=>[x.clipId,x.text])),before=o.beforeEach;
 if(changed.size){
  const plan:ScenePlan={scenes:doc.clips.map(c=>({still:'',motion:'',title:'',voice:changed.get(c.id)??''})),line:'',cta:'',voiceEnd:''};
  const brief=buildCreativeBrief(p,{durationS:timeline(doc).total,width:doc.width,height:doc.height,platform:doc.aspect==='9:16'?'reels':'meta_feed'});brief.voice.kokoroVoice=q.profile.id;brief.voice.speed=q.profile.speed;
  await addVoice(pid,p.userId,doc,plan,brief,'voice-revision:'+q.fingerprint,[55,75],o.synth??synthLine,()=>{before?.();assertVoiceRevisionQuote(pid,original,q);},{language:q.profile.lang,exactLines:doc.clips.map(c=>changed.get(c.id)??'')});
 }
 const acquired=new Map(doc.audio.voice.map(v=>[v.clipId,v])),old=new Map(original.audio.voice.map(v=>[v.clipId,v]));
 const voices=original.audio.voice.flatMap(v=>{const replacement=changed.has(v.clipId)?acquired.get(v.clipId):v;return replacement?[replacement]:[];});for(const c of doc.clips){if(changed.has(c.id)&&!old.has(c.id)){const v=acquired.get(c.id);if(v)voices.push(v);}}
 doc.audio={...original.audio,voice:voices,voiceId:changed.size?doc.audio.voiceId:original.audio.voiceId};
 doc.subtitles=structuredClone(original.subtitles);
 if(q.changes.captions==='follow_changed_voice'){
  const requested=new Set(q.changes.changes.map(x=>x.clipId)),byClip=new Map(voices.map(v=>[v.clipId,v]));
  doc.subtitles.cues=doc.clips.flatMap(c=>{const v=byClip.get(c.id);return requested.has(c.id)&&v?measuredCues(c.id,v.text,v.durationS,doc.subtitles.style.maxChars,v.offsetS):original.subtitles.cues.filter(cue=>cue.clipId===c.id);});
 }
 const changedDocument=imageBindingHash(doc)!==imageBindingHash(original);if(changedDocument)doc.meta.editorial={...doc.meta.editorial,voiceProfile:q.profile};
 return{doc,changed:changedDocument,docKey,voiceAssets:voices.flatMap(v=>v.assetId?[v.assetId]:[])};
}
