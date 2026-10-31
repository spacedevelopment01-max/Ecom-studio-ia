"use client";
/** Devis tiré des vrais documents, sans second moteur de rendu et sans version créée avant accord. */
import {useT} from '../i18n';
import type {VideoQuoteSummary} from '@/lib/video-v2/quote-summary';
type Scene=VideoQuoteSummary['scenes'][number];
function ScenePreview({scene}:{scene:Scene}){
 const t=useT();
 const camera=scene.camera?({static:t('image fixe','still image'),push_in:t('zoom avant local','local zoom in'),pull_out:t('zoom arrière local','local zoom out'),pan_left:t('glissement vers la gauche','pan left'),pan_right:t('glissement vers la droite','pan right'),tilt_up:t('glissement vers le haut','tilt up'),orbit:t('rotation locale','local rotation'),handheld:t('oscillation locale','local sway')})[scene.camera]:null;
 const transition=({cut:t('coupe franche','cut'),fade:t('fondu','fade'),slide:t('glissement','slide'),zoom:t('zoom','zoom'),wipe:t('balayage','wipe')})[scene.transition.kind];
 return <div className="min-w-0 space-y-2">
  <p className="break-words font-semibold">{t('Plan','Shot')} {scene.index} · {scene.durationS} s</p>
  {scene.media?.kind==='image'?<img className="max-h-60 w-full object-contain" src={scene.media.href} alt={t('Image acquise du plan','Acquired image for shot')+' '+scene.index}/>:scene.media?.kind==='video'?<video controls playsInline preload="metadata" className="max-h-60 w-full" src={scene.media.href}/>:null}
  {camera&&<p>{t('Mouvement :','Motion:')} {camera}. {t('Déplacement dans les pixels de l’image acquise ; le cadrage peut en masquer les bords. Aucun nouveau point de vue filmé.','Movement within the acquired image pixels; framing may hide its edges. No new filmed viewpoint.')}</p>}
  {scene.crop&&<p>{t('Recadrage relatif x/y/largeur/hauteur :','Relative crop x/y/width/height:')} {scene.crop.x} / {scene.crop.y} / {scene.crop.w} / {scene.crop.h}</p>}
  <p>{t('Transition d’entrée :','Incoming transition:')} {transition} · {scene.transition.durationS} s</p>
  {scene.overlayImages.map((a,i)=><figure key={i}><img className="max-h-16 w-full object-contain" src={a.href} alt={t('Média de surimpression conservé','Retained overlay media')}/><figcaption>{t('Média de surimpression conservé','Retained overlay media')}</figcaption></figure>)}
  {scene.text.length?scene.text.map((text,i)=><p key={i} className="whitespace-pre-wrap break-words">{text}</p>):<p>{t('Aucun texte superposé.','No overlaid text.')}</p>}
 </div>;
}
function AudioPreview({summary}:{summary:VideoQuoteSummary}){
 const t=useT(),mood=({none:t('aucune','none'),library:t('piste acquise conservée','existing acquired track'),calm:t('calme','calm'),warm:t('chaleureuse','warm'),pulse:t('rythmée','rhythmic')})[summary.music];
 return <div className="space-y-2 text-xs"><p>{t('Musique :','Music:')} {mood}{summary.audio.musicGainDb!=null?` · ${summary.audio.musicGainDb} dB`:''}</p>
  <p>{t('Baisse de la musique pendant la voix :','Music reduction under speech:')} {summary.audio.duckingDb} dB · {t('Niveau sonore visé :','Target loudness:')} {summary.audio.loudnessLufs} LUFS</p>
  {!summary.audio.voiceTracks.length&&<p>{t('Aucune piste de voix ; aucune voix générée.','No voice track; no voice generated.')}</p>}
  {summary.audio.voiceTracks.map((v,i)=><div key={i}><p>{t('Voix acquise conservée, plan','Acquired voice retained, shot')} {summary.scenes.find(s=>s.id===v.clipId)?.index??v.clipId} · {v.gainDb} dB · {v.durationS} s · {t('décalage','offset')} {v.offsetS} s</p><p className="whitespace-pre-wrap break-words">{v.text}</p>{v.href&&<audio controls preload="none" className="max-w-full" src={v.href}/>}</div>)}
  {summary.audio.effects.map((v,i)=><p key={i} className="whitespace-pre-wrap break-words">{t('Effet sonore conservé :','Retained sound effect:')} {v.text} · {v.gainDb} dB · {v.durationS} s · {t('décalage','offset')} {v.offsetS} s</p>)}
 </div>;
}
export function ConversationVideoPreview({before,after}:{before:VideoQuoteSummary|null;after:VideoQuoteSummary}){
 const t=useT();
 return <div data-video-scenario-preview className="min-w-0 space-y-3">
  <p className="text-xs">{t('Images sources et réglages du montage, avant confirmation. Cet aperçu ne simule pas la vidéo finale.','Source images and edit settings before confirmation. This preview does not simulate the final video.')}</p>
  {before&&<details data-video-before><summary className="min-h-11 cursor-pointer text-xs font-semibold">{t('Avant : montage conservé','Before: retained edit')} · {before.durationS} s</summary><AudioPreview summary={before}/><ol className="space-y-3">{before.scenes.map(s=><li key={s.id} className="min-w-0 rounded-xl border border-line p-3 text-xs"><ScenePreview scene={s}/></li>)}</ol></details>}
  <p className="text-xs font-semibold">{t('Après : montage proposé','After: proposed edit')} · {after.durationS} s</p><AudioPreview summary={after}/>
  <ol className="space-y-3">{after.scenes.map(s=><li key={s.id} className="min-w-0 rounded-xl border border-line p-3 text-xs"><ScenePreview scene={s}/></li>)}</ol>
 </div>;
}
