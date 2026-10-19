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
 const service=p.services.services.find(s=>s.name.trim()&&target.length>2&&(text.includes(norm(s.name))||norm(s.name).includes(target)));
 if(service&&service.name.trim()){out.scenes.forEach((s,k)=>{s.intent=`${service.name} — ${s.role??`étape ${k+1}`} ; illustration imaginée, pas une réalisation du client.`;s.still=`Illustration de ${service.name}. ${s.intent}. ${service.description??''} Aucun résultat ou engagement non confirmé.`;});changed=true;}
 if(!changed)throw new UserFacingError('Cette correction nécessite une nouvelle rédaction : modifiez votre demande puis acceptez son devis, ou corrigez les scènes ci-dessous. Aucun appel lancé.');
 out.scenes[0].still+=`\nConsigne exacte du client : ${instruction}`;
 return out;
}
