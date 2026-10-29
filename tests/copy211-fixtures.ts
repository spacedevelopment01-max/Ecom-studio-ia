/** Synthetic content only; this is not an AI creation or an evaluation of its quality. */
import {account,project} from './conversation209-fixtures';
import {CASES,initializeSynthetic} from './preparation-fixtures';
import {loadProject} from '@/lib/projects';
import {localCopy} from '@/lib/engine/local-copy';
import {ShopCopySchema} from '@/lib/theme/copy';
export const goodCopyReview={scores:{specificity:9,benefits:9,objections:9,clarity:9,voice:9,seo:9,conversion:9},issues:[],brief:'Double technique, aucune évaluation créative réelle.'};
export async function longCopyCase(business:'products'|'services'){
 const u=await account(),pid=project(u,business),input=structuredClone(CASES[business==='products'?0:1]);input.photoIds=[];
 Object.assign(input,business==='products'?{offerName:'Relief',brandName:'',description:'Puzzle tactile en bois avec pièces amovibles. Aucune certification fournie.'}:{offerName:'Archives ouvertes',brandName:'',description:'Numérisation de photographies familiales apportées par le client, sur devis.'});
 initializeSynthetic(pid,input);const p=loadProject(pid),seed=localCopy(p.product,p.brand??{name:input.offerName,tagline:'',story:'',values:[]},p);seed.marquee=['DOUBLE TECHNIQUE','CONTENU FICTIF'];const copy=ShopCopySchema.parse(seed),previous=structuredClone(copy);
 previous.product.description_html='<p>'+('Texte conservé — naïf, été, 東京, 🌱. '.repeat(1300))+'</p>';previous.footer.about='FIN EXACTE CLIENT — aucun avis ou engagement inventé.';
 return{u,p,copy,previous,base:{userId:u.id,projectId:pid,usageKey:'E4-input-double'},language:business==='products'?'fr' as const:'en' as const};
}
