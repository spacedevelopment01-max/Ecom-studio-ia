import { UserFacingError } from '../jobs';
import type { Project } from '../projects';
import type { ScenePlan } from './three-scenes';
const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
/** Retouches locales explicites, avant approbation ; aucun appel texte caché. */
export function refineScenePlan(p:Project,plan:ScenePlan,instruction:string):ScenePlan{
 const out=structuredClone(plan),text=norm(instruction);
 let changed=false;
 if(/dynamique|dynamic|plus rythme|faster/.test(text)){out.scenes.forEach((s,k)=>{s.motion=`${k%2?'Travelling latéral plus vif, puis stabilisation':'Avancée fluide avec changement de mise au point'}. Un plan continu, sans personne ni nouvelle partie du produit.`;});changed=true;}
 const target=text.replace(/^(plutot|rather|sur|focus on)\s+/, '').trim();
 const words=(value:string)=>norm(value).split(/[^a-z0-9]+/).filter(w=>w.length>3&&!['plutot','rather','focus','faire','video','service','prestation'].includes(w)).map(w=>w.replace(/s$/,''));
 const candidates=p.services.services.filter(s=>s.name.trim()&&target.length>2&&(text.includes(norm(s.name))||norm(s.name).includes(target)||words(s.name).some(w=>words(target).includes(w))));
 if(candidates.length>1)throw new UserFacingError('Plusieurs prestations correspondent : précisez laquelle dans votre correction. Aucun appel lancé.');
 const service=candidates[0];
 if(service&&service.name.trim()){out.scenes.forEach((s,k)=>{s.intent=`${service.name} — ${s.role??`étape ${k+1}`} ; illustration imaginée, pas une réalisation du client.`;s.still=`Illustration de ${service.name}. ${s.intent}. ${service.description??''} Aucun résultat ou engagement non confirmé.`;s.title=k===0?service.name:'';s.voice=k===0?service.name:'';});changed=true;}
 if(!changed)throw new UserFacingError('Cette correction nécessite une nouvelle rédaction : modifiez votre demande puis acceptez son devis, ou corrigez les scènes ci-dessous. Aucun appel lancé.');
 out.scenes[0].still+=`\nConsigne exacte du client : ${instruction}`;
 return out;
}
