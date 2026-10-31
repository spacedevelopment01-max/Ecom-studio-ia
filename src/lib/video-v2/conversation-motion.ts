/** Adaptation d'un scénario accepté au document NATIF : montage local annoncé, pas une vidéo filmée par IA. */
import type {Project}from '../projects';
import {buildSceneDoc}from './three-scenes';
import {VideoDocumentSchema,foreignVideoAssets}from './store';
import {applyVideoOps,type VideoOp}from './ops';
import {timeline}from './doc';
import type {VideoDocument}from './types';
import type {VideoToolPlan}from '../orchestrator/conversation/video-tool-contract';
import {HttpError}from '../auth';
import {L}from '../i18n-server';
export function conversationMotionDocument(p:Project,plan:Extract<VideoToolPlan,{tool:'videos.motion'}>,assetIds:string[]):VideoDocument{
 if(assetIds.length!==plan.scenes.length)throw new HttpError(409,L('Une image exacte manque au scénario.','An exact image is missing from the scenario.'));
 const scenario={scenes:plan.scenes.map(s=>({still:'Image acquise conservée, animation de caméra locale.',motion:'Mouvement de caméra local, aucun plan généré.',title:s.title,titleColor:s.titleColor,place:s.place})),line:plan.line,cta:plan.cta};
 const built=buildSceneDoc(p,plan.scenes.map((s,i)=>({assetId:assetIds[i],durationS:s.durationS,generated:false})),scenario,plan.aspect,plan.purpose==='ad'?'ad':'post',{showS:60,clipS:60,endS:0},plan.music!=='none');
 const doc:VideoDocument={...built,clips:built.clips.map((c,i)=>({...c,part:i===0?'hook':null,source:{kind:'image',assetId:assetIds[i],motion:plan.scenes[i].camera,crop:null},transitionIn:{kind:'cut',durationS:0}})),audio:{...built.audio,music:plan.music==='none'?null:{source:'synth',mood:plan.music,gainDb:-12,seed:p.id}},meta:{...built.meta,source:'user'}};
 if(timeline(doc).total!==Math.round(plan.scenes.reduce((n,s)=>n+s.durationS,0)*1000)/1000)throw new HttpError(409,L('Le moteur modifierait la durée acceptée. Rien n’est lancé.','The engine would change the accepted duration. Nothing is started.'));
 VideoDocumentSchema.parse(doc);if(foreignVideoAssets(p.id,doc).length)throw new HttpError(409,L('Un média du scénario manque dans ce projet.','A scenario media file is missing from this project.'));return doc;
}
/** Les opérations sont validées avant les réducteurs natifs ; aucun clamp ou changement silencieux accepté. */
export function conversationVideoEdit(doc:VideoDocument,ops:Extract<VideoToolPlan,{tool:'videos.edit'}>['ops']){
 let next=structuredClone(doc);
 for(const proposed of ops){
  const o:VideoOp=proposed.op==='music'?{op:'music',music:proposed.mood==='none'?null:{source:'synth',mood:proposed.mood,gainDb:next.audio.music?.gainDb??-12}}:proposed;
  if(('durationS'in o&&Math.abs(o.durationS!*100-Math.round(o.durationS!*100))>1e-8)||o.op==='audio_gain'&&Math.abs(o.gainDb*100-Math.round(o.gainDb*100))>1e-8)throw new HttpError(409,L('Le moteur accepte deux décimales au plus. Rien n’est arrondi implicitement.','The engine accepts at most two decimals. Nothing is implicitly rounded.'));
  if('clipId'in o){const clip=next.clips.find(c=>c.id===o.clipId);if(!clip)throw new HttpError(409,L('Le plan désigné manque.','The selected shot is missing.'));
   if(o.op==='duration'&&clip.source.kind==='video'&&o.durationS>clip.source.outS-clip.source.inS)throw new HttpError(409,L('Le plan source est trop court. Aucun allongement inventé.','The source shot is too short. No invented extension.'));
   if(o.op==='transition'&&o.kind!=='cut'&&o.durationS!>Math.min(1.2,clip.durationS/2))throw new HttpError(409,L('La transition dépasse la durée représentable.','The transition exceeds the representable duration.'));
  }
  if(o.op==='audio_gain'&&(o.track==='music'&&!next.audio.music||o.track==='voice'&&!next.audio.voice.some(v=>v.assetId)))throw new HttpError(409,L('La piste audio demandée n’existe pas. Aucun remplacement.','The requested audio track does not exist. No replacement.'));
  next=applyVideoOps(next,[o]);
 }
 VideoDocumentSchema.parse(next);const total=timeline(next).total;if(total<.8||total>60)throw new HttpError(409,L('La durée obtenue sort des limites annoncées.','The resulting duration exceeds the announced limits.'));return next;
}
