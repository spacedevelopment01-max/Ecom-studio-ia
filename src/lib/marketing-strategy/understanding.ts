/** Explicitly start an old project's preparation from acquired inputs. Never runs on GET. */
import {all} from '../db';
import {loadProject} from '../projects';
import {requirePlan} from '../plan-gates';
import {commitState,stateOf} from '../preparation/store';
import type {Input} from '../preparation/types';
export async function resumeUnderstanding(projectId:string){
 requirePlan(null,projectId);
 if(!stateOf(projectId)){
  const p=loadProject(projectId),photos=all<{id:string}>("SELECT id FROM assets WHERE project_id=? AND kind='image' AND origin='upload' AND deleted_at IS NULL AND status!='rejected' AND COALESCE(role,'original')='original' ORDER BY created_at,id",projectId);
  const links=[...new Set([...p.sources,...p.product.sources].filter(s=>s.type==='link').map(s=>s.ref))];
  const input:Input={offerName:p.product.name||p.services.services.map(s=>s.name).join(' / '),description:p.product.summary||p.services.services.map(s=>`${s.name} : ${s.description}`).join('\n'),brandName:p.brand?.name??'',target:p.product.facts.find(f=>f.status==='confirmed'&&/cible|audience|public/i.test(f.label))?.value??'',constraints:p.product.claimsToAvoid.join('\n'),business:p.business,photoIds:photos.map(p=>p.id),referenceUrls:links,price:p.product.price?.amount!=null?String(p.product.price.amount/100):'',services:p.services};
  const {initialize}=await import('../preparation/engine');const first=initialize(projectId,input);
  commitState(projectId,first.revision,s=>{const b=s.stages.brief!.data;b.profile=p.product;b.services=p.services;});
 }
 return {href:`/studio/${projectId}/preparation`};
}
