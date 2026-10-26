import {approvedQuote} from "../ai/higgsfield/pricing";
import {defaultConfiguration} from "../ai/higgsfield/catalog";
/** Routes explicites : aucun appel fournisseur lors du devis, aucune image intermédiaire implicite. */
import { mediaRouteFor } from '../ai/media-providers';
import { mediaModel } from '../ai/media-models';
import { requirePrice,usdToEur } from '../ai/config';
import { L } from '../i18n-server';
export type SceneGeneration='direct'|'reference'|'staged';
export function sceneGenerationRoute(kind:SceneGeneration,seconds:number,aspect:"16:9"|"9:16"="16:9"){
 const usage=kind==='direct'?'text_video':'product_video';
 const route=mediaRouteFor(usage,{imageToVideo:kind!=='direct',people:false});
 if(!route)return {allowed:false as const,reason:L('Aucune route vidéo compatible disponible pour ce choix. Aucun remplacement par des images ou du stock.','No compatible video route available for this choice. No image or stock replacement.')};
 const model=mediaModel(route.provider,route.model);
 // Le moteur existant fournit actuellement le texte-vers-vidéo avec cet adaptateur uniquement.
 if(!model || (kind==='direct'&&!['alibaba_video','higgsfield_video'].includes(model.adapter??'')))return {allowed:false as const,reason:L('Cette route ne dispose pas ici d’un adaptateur texte-vers-vidéo raccordé. Choisissez une route compatible dans l’administration.','This route has no connected text-to-video adapter here. Select a compatible route in administration.')};
 const duration=model.durations?.find(d=>d>=Math.ceil(seconds))??(model.durations?.length?null:Math.ceil(seconds));
 if(duration==null)return {allowed:false as const,reason:L('Durée de scène supérieure aux capacités de la route. Ajoutez des scènes ou réduisez la durée.','Shot length exceeds route capabilities. Add scenes or shorten the video.')};
 try{if(route.provider==='higgsfield')return {allowed:true as const,...route,usage,seconds:duration,unitMicro:approvedQuote(defaultConfiguration(route.model,duration,aspect)).micro,generation:kind};const price=requirePrice(route.provider,route.model);if(price.unit!=='video_second')throw Error();return {allowed:true as const,...route,usage,seconds:duration,unitMicro:Math.round(duration*price.perSecond*usdToEur()*1e6),generation:kind};}catch{return {allowed:false as const,reason:L('Tarif vidéo confirmé indisponible ; aucun appel lancé.','Confirmed video price unavailable; no call started.')};}
}
