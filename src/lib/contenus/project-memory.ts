/** Native memory deletion shared with the manual API; guarded preview for conversational consent. */
import {all,one,run,tx} from '../db';
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
