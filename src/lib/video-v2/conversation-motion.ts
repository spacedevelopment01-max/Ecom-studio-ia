/** Adaptation d'un scénario accepté au document NATIF : montage local annoncé, pas une vidéo filmée par IA. */
import type {Project}from '../projects';
import {buildSceneDoc}from './three-scenes';
import {VideoDocumentSchema,foreignVideoAssets}from './store';
import {timeline}from './doc';
import type {VideoDocument}from './types';
import {HttpError}from '../auth';
import {L}from '../i18n-server';
/** Scénario accepté d'un montage local : une image par plan, sa durée, son mouvement de caméra et son titre. */
export type MotionPlan={aspect:'9:16'|'16:9'|'1:1'|'4:5';purpose:'ad'|'organic';scenes:{durationS:number;camera:'static'|'push_in'|'pull_out'|'pan_left'|'pan_right'|'tilt_up';title:string;titleColor:string;place:'top'|'lower'}[];line:string;cta:string;music:'none'|'calm'|'warm'|'pulse'};
export function conversationMotionDocument(p:Project,plan:MotionPlan,assetIds:string[]):VideoDocument{
 if(assetIds.length!==plan.scenes.length)throw new HttpError(409,L('Une image exacte manque au scénario.','An exact image is missing from the scenario.'));
 const scenario={scenes:plan.scenes.map(s=>({still:'Image acquise conservée, animation de caméra locale.',motion:'Mouvement de caméra local, aucun plan généré.',title:s.title,titleColor:s.titleColor,place:s.place})),line:plan.line,cta:plan.cta};
 const built=buildSceneDoc(p,plan.scenes.map((s,i)=>({assetId:assetIds[i],durationS:s.durationS,generated:false})),scenario,plan.aspect,plan.purpose==='ad'?'ad':'post',{showS:60,clipS:60,endS:0},plan.music!=='none');
 const doc:VideoDocument={...built,clips:built.clips.map((c,i)=>({...c,part:i===0?'hook':null,source:{kind:'image',assetId:assetIds[i],motion:plan.scenes[i].camera,crop:null},transitionIn:{kind:'cut',durationS:0}})),audio:{...built.audio,music:plan.music==='none'?null:{source:'synth',mood:plan.music,gainDb:-12,seed:p.id}},meta:{...built.meta,source:'user'}};
 if(timeline(doc).total!==Math.round(plan.scenes.reduce((n,s)=>n+s.durationS,0)*1000)/1000)throw new HttpError(409,L('Le moteur modifierait la durée acceptée. Rien n’est lancé.','The engine would change the accepted duration. Nothing is started.'));
 VideoDocumentSchema.parse(doc);if(foreignVideoAssets(p.id,doc).length)throw new HttpError(409,L('Un média du scénario manque dans ce projet.','A scenario media file is missing from this project.'));return doc;
}
