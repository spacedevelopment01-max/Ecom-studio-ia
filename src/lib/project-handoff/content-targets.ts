/** Lecture des cibles du contrat approuvé : pas de migration ni de rapprochement par nom de démonstration. */
import {memory,type Project} from '../projects';
import {stableHash} from '../brain/hash';
import type{ContentDoc}from'../seo-v2/types';
const profileFacts=(p:any)=>{if(!p)return p;const{contentAliases,key,...facts}=p;return facts;};
const serviceFacts=(p:any)=>p?{...p,services:p.services?.map(profileFacts)}:p;
/** Les index historiques des prestations n'ont de sens que dans la photographie approuvée du projet. */
export function preparedContentTarget(p:Project,docKey:string,doc:ContentDoc):string|null{
 const row=memory(p.id).find(m=>m.kind==='artifact'&&m.key==='project.ready_for_theme');if(!row)return null;
 try{
  const ready=JSON.parse(row.value);
  if(ready.projectId!==p.id||!ready.documents?.some((d:any)=>d.docKey===docKey&&d.doc?.page?.key===doc.page.key))return null;
  if(stableHash('offer',profileFacts(ready.profile))!==stableHash('offer',profileFacts(p.product))||ready.brand?.name!==p.brand?.name)return null;
  if(doc.type==='home_page'&&doc.page.key==='home')return 'home:accueil';
  if(doc.type==='brand_page'&&doc.page.key==='brand')return 'brand:a-propos';
  const index=doc.type==='service_page'?/^service:(\d+)$/.exec(doc.page.key):null;
  if(index&&p.business==='services'&&stableHash('services',serviceFacts(ready.services))===stableHash('services',serviceFacts(p.services))){
   const ordinal=Number(index[1]),service=ready.services.services[ordinal],current=p.services.services[ordinal];
   if(current?.key&&service&&(!service.key||service.key===current.key))return `service:${current.key}`;
  }
 }catch{/* Un contrat absent ou illisible ne vaut jamais association implicite. */}
 return null;
}
