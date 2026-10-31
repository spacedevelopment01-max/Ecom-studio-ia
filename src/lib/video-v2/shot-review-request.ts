/** Requête partagée devis/exécution : vrais textes et images réduites, sans appel ni réservation ici. */
import sharp from 'sharp';
import type {Project} from '../projects';
import type {LlmCall,LlmImage} from '../ai/llm';
import {brainView} from '../brain/facade';
import {personCheckFr,peopleAllowedFor} from '../people-policy';
import {L} from '../i18n-server';
import {SHOT_REVIEW_SYSTEM} from './quality';
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
 return{task:'quality_control',...base,promptKey:'video-v2-shot-review',routing:{difficulty:'complex',deliverable:'video_shot_v2'},system:SHOT_REVIEW_SYSTEM,context:view.stable,volatile:view.volatile,images,prompt:`${text}\n${personCheckFr(peopleAllowedFor(p))}\nRéponds { "score": 0, "sameProduct": null, "foreignBrands":[], "textCorrect":null, "productAltered": false, "characterConsistent": null, "offTopic": false, "artifacts": false, "personVisible": false, "issues": [] }.`,maxTokens:1500};
}
