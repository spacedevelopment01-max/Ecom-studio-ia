import {z} from 'zod';
import {remember,readRememberPlan} from '../projects';
/** Native memory deletion shared with the manual API; guarded preview for conversational consent. */
import {all,one,run,tx,readSnapshot,json,now} from '../db';
import {HttpError} from '../auth';
import {stableHash} from '../brain/hash';
import type {MemoryItem} from '../projects';
type Row=MemoryItem&{project_id:string;state:string}&Record<string,unknown>;
export type VisibleMemoryItem=Pick<MemoryItem,'id'|'kind'|'key'|'value'|'status'|'source'|'scope'|'updated_at'>;
export type MemoryForgetSnapshot={schema:'native-memory-forget-1';projectId:string;itemId:string;fingerprint:string};
const publicItem=(r:Row):VisibleMemoryItem=>({id:r.id,kind:r.kind,key:r.key,value:r.value,status:r.status,source:r.source,scope:r.scope,updated_at:r.updated_at});
const visible=(r:Row)=>r.state==='active'&&r.kind!=='artifact'&&r.kind!=='fact';
const fingerprint=(r:Row)=>stableHash('native-memory-forget-1',r);
/** Same visible scope as the native project memory panel. No customer-derived text is an instruction. */
export function forgettableProjectMemory(projectId:string):VisibleMemoryItem[]{
 return all<Row>("SELECT * FROM memory WHERE project_id=? AND state='active' AND kind NOT IN ('artifact','fact') ORDER BY updated_at DESC",projectId).map(publicItem);
}
/** Existing manual API semantics, kept intact including a missing item's no-op. */
export function deleteProjectMemoryItem(projectId:string,itemId:string|null){
 return run("DELETE FROM memory WHERE id = ? AND project_id = ? AND kind != 'artifact'",itemId,projectId).changes;
}
export function previewMemoryForget(projectId:string,itemId:string){
 const row=one<Row>('SELECT * FROM memory WHERE project_id=? AND id=?',projectId,itemId);
 if(!row||!visible(row))throw new HttpError(404,'Entrée de mémoire visible introuvable. Aucun fait ou artefact interne ciblé.');
 return{item:publicItem(row),snapshot:{schema:'native-memory-forget-1' as const,projectId,itemId,fingerprint:fingerprint(row)}};
}
/** Revalidate every native column under the same write lock as deletion/receipt. */
export function applyMemoryForget(projectId:string,snapshot:MemoryForgetSnapshot):VisibleMemoryItem{
 return tx(()=>{
  if(snapshot.schema!=='native-memory-forget-1'||snapshot.projectId!==projectId)throw new HttpError(409,'Instantané de mémoire invalide.');
  const row=one<Row>('SELECT * FROM memory WHERE project_id=? AND id=?',projectId,snapshot.itemId);
  if(!row||!visible(row)||fingerprint(row)!==snapshot.fingerprint)throw new HttpError(409,'Cette entrée de mémoire a changé ou a disparu. Relisez avant un nouvel accord.');
  if(deleteProjectMemoryItem(projectId,row.id)!==1||one('SELECT 1 FROM memory WHERE project_id=? AND id=?',projectId,row.id))throw new HttpError(409,'L’oubli natif ne peut pas être confirmé.');
  return publicItem(row);
 });
}

/** Same input as the native manual form/API; conversational input additionally rejects unknown fields. */
export const memoryAddInput=z.object({kind:z.enum(['decision','correction','preference','goal']),key:z.string().min(1).max(120),value:z.string().min(1).max(2000),scope:z.enum(['all','shop','images','video','social','brand']).default('all')});
export type MemoryAddInput=z.infer<typeof memoryAddInput>;
type AddAfter={kind:string;key:string;value:string;status:string;source:string;scope:string;origin:string|null;normKey:string;evidenceCount:number};
export type MemoryAddSnapshot={schema:'native-memory-add-1';projectId:string;input:MemoryAddInput;fingerprint:string};
export type MemoryAddPreview={effect:'create'|'reinforce'|'replace';before:VisibleMemoryItem[];after:AddAfter;snapshot:MemoryAddSnapshot};
function addPlan(projectId:string,raw:unknown){
 const input=memoryAddInput.strict().parse(raw);if(!input.key.trim()||!input.value.trim())throw new HttpError(400,'Précisez une clé et une valeur de mémoire non vides.');
 const native=readRememberPlan(projectId,{...input,source:'user'},true);
 if(native.candidates.length>1)throw new HttpError(409,'Plusieurs entrées actives correspondent à la déduplication native. Aucun premier souvenir choisi.');
 const affected=[...new Map([...(native.same?[native.same]:[]),...native.replaced].map(r=>[r.id,r])).values()];
 if(affected.some(r=>!visible(r as Row)))throw new HttpError(409,'Le plan natif toucherait une entrée interne ou historique. Aucun changement.');
 const prior=native.reinforce?native.same:undefined,ev=prior?json<{count?:number}>(prior.evidence_json,{}):{};
 if(ev.count!==undefined&&(!Number.isSafeInteger(ev.count)||ev.count!<1||!Number.isSafeInteger(ev.count!+1)))throw new HttpError(409,'Le compteur de preuves natif ne peut pas être vérifié.');
 const after:AddAfter={kind:prior?.kind??input.kind,key:prior?.key??input.key,value:prior?.value??input.value,status:native.status,source:prior?.source??'user',scope:native.scope,origin:prior?.origin??(prior?null:native.origin),normKey:native.n.normKey,evidenceCount:prior?(ev.count??1)+1:1};
 return{input,native,affected,after,effect:native.reinforce?'reinforce' as const:native.replaced.length?'replace' as const:'create' as const};
}
const addFingerprint=(plan:ReturnType<typeof addPlan>)=>stableHash('native-memory-add-1',{input:plan.input,native:plan.native,after:plan.after,effect:plan.effect});
export function previewMemoryAdd(projectId:string,raw:unknown):MemoryAddPreview{
 return readSnapshot(()=>{const plan=addPlan(projectId,raw);return{effect:plan.effect,before:plan.affected.map(r=>publicItem(r as Row)),after:plan.after,snapshot:{schema:'native-memory-add-1',projectId,input:plan.input,fingerprint:addFingerprint(plan)}};});
}
const memoryRows=(projectId:string)=>all<Row>('SELECT * FROM memory WHERE project_id=? ORDER BY id',projectId);
export function applyMemoryAdd(projectId:string,snapshot:MemoryAddSnapshot){
 return tx(()=>{
  if(snapshot.schema!=='native-memory-add-1'||snapshot.projectId!==projectId)throw new HttpError(409,'Instantané d’ajout mémoire invalide.');
  const plan=addPlan(projectId,snapshot.input);if(addFingerprint(plan)!==snapshot.fingerprint)throw new HttpError(409,'Les effets natifs de cet ajout mémoire ont changé. Relisez avant accord.');
  const before=memoryRows(projectId),started=now(),itemId=remember(projectId,{...plan.input,source:'user'}),ended=now(),after=memoryRows(projectId),item=after.find(r=>r.id===itemId);
  if(plan.native.reinforce?itemId!==plan.native.same?.id:before.some(r=>r.id===itemId))throw new HttpError(409,'L’identité du résultat mémoire natif n’est pas confirmée.');
  if(!item||item.state!=='active'||item.kind!==plan.after.kind||item.key!==plan.after.key||item.value!==plan.after.value||item.status!==plan.after.status||item.source!==plan.after.source||item.scope!==plan.after.scope||(item.origin??null)!==plan.after.origin||item.norm_key!==plan.after.normKey)throw new HttpError(409,'Le résultat mémoire natif ne correspond pas à l’aperçu.');
  const evidence=json<Record<string,unknown>>(item.evidence_json,{});
  if(evidence.count!==plan.after.evidenceCount||typeof evidence.lastAt!=='number'||evidence.lastAt<started||evidence.lastAt>ended||item.updated_at<started||item.updated_at>ended)throw new HttpError(409,'Les preuves de mémoire enregistrées ne sont pas confirmées.');
  const replaced=new Set(plan.native.replaced.map(r=>r.id)),mutable=new Set([...replaced,itemId]);
  if(stableHash('memory-neighbours',before.filter(r=>!mutable.has(r.id)))!==stableHash('memory-neighbours',after.filter(r=>!mutable.has(r.id))))throw new HttpError(409,'Une mémoire voisine a été modifiée. Aucun ajout conservé.');
  for(const row of before.filter(r=>mutable.has(r.id))){
   const actual=after.find(r=>r.id===row.id);if(!actual)throw new HttpError(409,'Un acquis mémoire a disparu.');
   const expected={...row,...(replaced.has(row.id)?{state:'superseded',superseded_by:itemId}:{}),...(row.id===itemId?{norm_key:item.norm_key,status:item.status,scope:item.scope,evidence_json:item.evidence_json}:{}),updated_at:actual.updated_at};
   if(actual.updated_at<started||actual.updated_at>ended||stableHash('memory-existing-effect',expected)!==stableHash('memory-existing-effect',actual))throw new HttpError(409,'Un acquis mémoire a changé au-delà du plan annoncé.');
   if(row.id===itemId){const oldEvidence=json<Record<string,unknown>>(row.evidence_json,{});if(stableHash('memory-evidence',{...oldEvidence,count:plan.after.evidenceCount,lastAt:evidence.lastAt})!==stableHash('memory-evidence',evidence))throw new HttpError(409,'Les preuves acquises ne sont pas conservées.');}
  }
  return{item:publicItem(item),effect:plan.effect,after:plan.after,replacedIds:[...replaced]};
 });
}
