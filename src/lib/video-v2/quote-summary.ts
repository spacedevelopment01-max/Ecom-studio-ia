/** Projection en lecture seule du document natif, commune aux devis avant/après. Aucun rendu ni écriture. */
import type {VideoDocument} from './types';
import {timeline} from './doc';
export function videoQuoteSummary(doc:VideoDocument,href:(assetId:string)=>string){
 return {
  durationS:timeline(doc).total,
  music:doc.audio.music?.source==='synth'?doc.audio.music.mood:doc.audio.music?'library':'none',
  voice:doc.audio.voice.some(v=>v.assetId),
  audio:{musicGainDb:doc.audio.music?.gainDb??null,duckingDb:doc.audio.duckingDb,loudnessLufs:doc.audio.loudnessLufs,
   voiceTracks:doc.audio.voice.map(v=>({clipId:v.clipId,text:v.text,gainDb:v.gainDb,offsetS:v.offsetS,durationS:v.durationS,href:v.assetId?href(v.assetId):null})),
   effects:doc.audio.sfx.map(v=>({clipId:v.clipId,text:v.text,gainDb:v.gainDb,offsetS:v.offsetS,durationS:v.durationS,href:v.assetId?href(v.assetId):null}))},
  scenes:doc.clips.map((c,i)=>({id:c.id,index:i+1,label:c.label,durationS:c.durationS,
   media:c.source.kind==='image'||c.source.kind==='video'?{kind:c.source.kind,href:href(c.source.assetId)}:null,
   camera:c.source.kind==='image'?c.source.motion:null,crop:c.source.kind==='image'?c.source.crop:null,
   transition:{...c.transitionIn},
   overlayImages:c.overlays.flatMap(l=>l.kind==='image'&&l.assetId?[{href:href(l.assetId),label:l.name}]:[]),
   text:c.overlays.flatMap(l=>l.kind==='text'||l.kind==='button'?[l.text]:[])}))
 };
}
export type VideoQuoteSummary=ReturnType<typeof videoQuoteSummary>;
