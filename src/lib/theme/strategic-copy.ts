/** Local, reversible copy preparation. Facts and identity are never rewritten by an angle. */
import type { ShopCopy } from './copy';
import { loadProject } from '../projects';
import { strategySelection } from '../strategy-consumption';
const esc=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const p=(s:string)=>`<p>${esc(s)}</p>`;
export function strategicCopy(projectId:string,base:ShopCopy):ShopCopy{
 const current=strategySelection(projectId);
 if(!current||current.angleId==='generalist')return structuredClone(base);
 const a=current.angle,project=loadProject(projectId),copy=structuredClone(base),service=project.business==='services';
 const t=(fr:string,en:string)=>project.settings.language==='en'?en:fr;
 const name=service?project.brand?.name??project.name:project.product.name;
 const factList=project.product.facts.filter(f=>f.status==='confirmed').map(f=>`${f.label} : ${f.value}`);
 const offer=service?project.services.services.map(s=>`${s.name} : ${s.description}`).join(' '):project.product.summary;
 const proof=a.proofs.filter(Boolean),message=a.messages;
 const fit=(s:string,max:number)=>s.length<=max?s:s.slice(0,max-1).replace(/\s+\S*$/,'')+'…';
 // Each purpose develops the same motivation differently. The exact product name remains in the fiche.
 copy.hero={...copy.hero,heading:a.examples.hero,line1:a.examples.hero,line2:'',text:a.examples.subtext,cta:a.examples.cta};
 copy.seo={title:fit(`${name} — ${a.examples.hero}`,60),description:fit(a.examples.subtext,160)};
 copy.statement={eyebrow:project.brand?.name??project.name,heading:message[0]??a.benefit,text:a.promise};
 copy.features={heading:a.benefit,items:(proof.length?proof:factList).slice(0,6).map((text,i)=>({title:factList[i]?.split(' : ')[0]??name,text,icon:'check' as const}))};
 // Missing facts remain visible; an emotional motivation is not used as technical evidence.
 if(copy.features.items.length<2)copy.features=base.features;
 copy.detail={...copy.detail,heading:service?t('Votre projet, concrètement','Your project in practice'):t('Ce qui compte pour votre choix','The details behind your choice'),text:[offer,...factList].filter(Boolean).join(' ')};
 copy.story={heading:message[1]??(service?t('Préparer la prochaine étape','Prepare your next step'):t('À vous de choisir votre usage','Make it part of your day')),steps:base.story.steps.map((s,i)=>({...s,text:i===0?`${a.situation} ${s.text}`:s.text}))};
 copy.gallery={...copy.gallery,heading:message[2]??a.motivation};
 copy.cta={heading:service?t('Parlons de votre prochaine étape','Let’s talk about your next step'):t(`Faire une place à ${name}`,`Make room for ${name}`),text:a.promise,button:a.examples.cta};
 copy.product={...copy.product,title:base.product.title,short:a.benefit,description_html:p(a.examples.subtext)+base.product.description_html,highlights:base.product.highlights};
 copy.faq={...copy.faq,items:[...a.objections.map(o=>({q:o.objection,a:/^(?:Montrer|Présenter|Demander|Expliquer|Show|Present|Ask|Explain)/i.test(o.answer)?[offer,proof[0],t('Contactez-nous pour préciser les points qui ne figurent pas dans ces informations.','Contact us to clarify any points not covered by this information.')].filter(Boolean).join(' '):o.answer})),...base.faq.items].filter((x,i,all)=>all.findIndex(y=>y.q===x.q)===i).slice(0,12)};
 copy.about={...copy.about,heading:base.about.heading,intro:base.about.intro,blocks:[...base.about.blocks,{heading:t('Notre proposition pour vous','Our proposal for you'),text:a.promise}].slice(0,4)};
 copy.contact={...copy.contact,text:`${service?t('Décrivez votre projet pour vérifier ensemble ce qui convient.','Tell us about your project so we can explore what fits.'):t('Posez votre question avant de choisir.','Ask your question before choosing.')} ${base.contact.text}`};
 copy.newsletter={...copy.newsletter,text:service?t('Recevoir les actualités et les prochaines possibilités de rencontre.','Receive news and upcoming opportunities to meet.'):t(`Recevoir les actualités de ${project.brand?.name??project.name}, à votre rythme.`,`Receive news from ${project.brand?.name??project.name}, at your own pace.`)};
 return copy;
}
