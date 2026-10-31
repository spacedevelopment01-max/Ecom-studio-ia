/** Une seule sauvegarde native pour l’éditeur et les brouillons conversationnels.
 * Aucune génération, connexion de régie, programmation ou dépense de diffusion. */
import {z}from 'zod';
import {HttpError,type User}from '../auth';
import {id,now,one,run,tx}from '../db';
import type {Project}from '../projects';
import {assertAdvertising}from '../job-entitlements';
import {assertCampaignSlot}from '../plan-gates';
import {strategyContent}from '../strategy-consumption';
import {canonicalJSON}from '../brain/hash';
export const ManualCampaignSchema=z.object({id:z.string().optional(),name:z.string().min(1).max(120),objective:z.string().max(80),networks:z.array(z.string()).max(6),brief:z.object({language:z.enum(['fr','en']).optional()}).catchall(z.any()).default({}),plan:z.record(z.string(),z.any()).default({}),status:z.enum(['draft','ready','archived']).default('draft')});
export type ManualCampaignInput=z.input<typeof ManualCampaignSchema>;
export function saveManualCampaign(p:Project,u:User,input:ManualCampaignInput,o:{createId?:string}={}){return tx(()=>{
 if(p.userId!==u.id)throw new HttpError(404,'Campagne introuvable.');
 const b=ManualCampaignSchema.parse(input);
 if(o.createId&&b.id)throw new HttpError(400,'Création et modification doivent rester distinctes.');
 if(o.createId&&b.status!=='draft')throw new HttpError(400,'Seul un brouillon peut être préparé.');
 const values={name:b.name,objective:b.objective,networks:JSON.stringify(b.networks),brief:JSON.stringify(b.brief),plan:JSON.stringify(b.plan),status:b.status};
 if(o.createId){
  const old=one<Record<string,unknown>>('SELECT project_id,name,objective,networks,brief,plan,status FROM campaigns WHERE id=?',o.createId);
  if(old){if(old.project_id!==p.id)throw new HttpError(404,'Campagne introuvable.');const{project_id:_,...stored}=old;if(canonicalJSON(stored)!==canonicalJSON(values))throw new HttpError(409,'Le brouillon a changé. Sa version actuelle reste conservée ; aucune réécriture.');return{id:o.createId,reused:true};}
 }
 if(b.status!=='archived')assertAdvertising(p.id);
 if(b.id){
  const old=one<{status:string}>('SELECT status FROM campaigns WHERE id=? AND project_id=?',b.id,p.id);if(!old)throw new HttpError(404,'Campagne introuvable.');
  if(old.status==='archived'&&b.status!=='archived')assertCampaignSlot(u,p.id);
  run('UPDATE campaigns SET name=?,objective=?,networks=?,brief=?,plan=?,status=?,updated_at=? WHERE id=? AND project_id=?',values.name,values.objective,values.networks,values.brief,values.plan,values.status,now(),b.id,p.id);
  strategyContent(p.id,'campaign',b.id,{protected:true});return{id:b.id,reused:false};
 }
 assertCampaignSlot(u,p.id);const cid=o.createId??id(),at=now();
 run('INSERT INTO campaigns (id,project_id,name,objective,networks,status,brief,plan,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',cid,p.id,values.name,values.objective,values.networks,values.status,values.brief,values.plan,at,at);
 strategyContent(p.id,'campaign',cid,{protected:true});return{id:cid,reused:false};
});}
