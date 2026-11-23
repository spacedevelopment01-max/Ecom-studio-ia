/** Requête partagée devis/exécution : vrais textes et images réduites, sans appel ni réservation ici. */
import sharp from 'sharp';
import type {Project} from '../projects';
import type {LlmCall,LlmImage} from '../ai/llm';
import {brainView} from '../brain/facade';
import {personCheckFr,peopleAllowedFor} from '../people-policy';
import {L} from '../i18n-server';
import {SHOT_REVIEW_SYSTEM} from './quality';
import {IMAGE_REVIEW_MODEL,IMAGE_REVIEW_OUTPUT_TOKENS,IMAGE_REVIEW_UNITS} from '../orchestrator/policy';
/**
 * LE RELECTEUR DES VIDÉOS (règle du propriétaire, 23 novembre 2026) : l'image de départ et chaque plan sont relus par le
 * modèle le plus fort, au niveau élevé, une image (ou un plan) à la fois — la même règle que les photos du site
 * (`PHOTO_REVIEW_MODEL`, syna-agent/custom-theme/gallery.ts) et les images des publications (`IMAGE_REVIEW_MODEL`).
 * Avant : la tâche « contrôle », Sonnet 5.5 au niveau faible. Même réglage pour l'appel, le devis et le prix montré.
 */
export const VIDEO_REVIEW_MODEL=IMAGE_REVIEW_MODEL;
export const VIDEO_REVIEW_ROUTING={difficulty:'complex' as const,deliverable:'video_shot_v2' as const,prefer:VIDEO_REVIEW_MODEL};
/** Place de sortie de la relecture (sa réflexion au niveau élevé comprise). */
export const VIDEO_REVIEW_OUTPUT_TOKENS=IMAGE_REVIEW_OUTPUT_TOKENS;
/** Jetons d'une relecture au déroulé habituel : l'image de départ (une image et la vraie photo), un plan (trois images). */
export const VIDEO_REVIEW_UNITS={image:{input:6000,output:IMAGE_REVIEW_UNITS.output},clip:{input:9000,output:IMAGE_REVIEW_UNITS.output}} as const;
export async function videoShotReviewImages(frames:Buffer[],refs:{product:Buffer|null;character:Buffer|null;scene?:Buffer|null}){
 const small=(data:Buffer)=>sharp(data).resize(768,768,{fit:'inside'}).jpeg({quality:82}).toBuffer();
 const images:LlmImage[]=(await Promise.all(frames.map(small))).map((data,k)=>({data,label:L(`image ${k+1} du plan`,`shot frame ${k+1}`)}));
 if(refs.product)images.push({data:await small(refs.product),label:L('référence : produit réel','reference: real product')});
 if(refs.character)images.push({data:await small(refs.character),label:L('référence : personnage','reference: character')});
 if(refs.scene)images.push({data:await small(refs.scene),label:L('référence : lieu ou scène fourni, pas un produit','reference: supplied place or scene, not a product')});
 return images;
}
export function videoShotReviewRequest(p:Project,base:Pick<LlmCall,'userId'|'projectId'|'jobId'|'usageKey'>,images:LlmImage[],text:string):LlmCall{
 const view=brainView(p,'qc');
 return{task:'quality_control',...base,promptKey:'video-v2-shot-review',routing:VIDEO_REVIEW_ROUTING,system:SHOT_REVIEW_SYSTEM,context:view.stable,volatile:view.volatile,images,prompt:`${text}\n${personCheckFr(peopleAllowedFor(p))}\nRéponds { "score": 0, "sameProduct": null, "foreignBrands":[], "textCorrect":null, "productAltered": false, "characterConsistent": null, "offTopic": false, "artifacts": false, "personVisible": false, "issues": [] }.`,maxTokens:VIDEO_REVIEW_OUTPUT_TOKENS,maxOutputTokens:VIDEO_REVIEW_OUTPUT_TOKENS*2};
}
