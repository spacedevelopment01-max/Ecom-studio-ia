/** Browser-only draft cache. Session storage belongs to one tab; persistent fallback never determines the server version. */
import type {AdDocument} from './types';
export type DraftStorage=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
export type DraftStores={session?:DraftStorage|null;persistent?:DraftStorage|null};
export type EditorDraft={schema:'ad-editor-draft-2';projectId:string;docKey:string;doc:AdDocument;base:number;at:number};
type Snapshot=Pick<EditorDraft,'doc'|'base'>;
export const editorDraftKey=(projectId:string,docKey:string)=>`ad-editor:v2:${encodeURIComponent(projectId)}:${encodeURIComponent(docKey)}`;
/** Historical unscoped records cannot prove project/account ownership. Never read, migrate or delete them. */
export const legacyEditorDraftKey=(docKey:string)=>`ad-editor:${docKey}`;
function browserStores():DraftStores{
 if(typeof window==='undefined')return{};const stores:DraftStores={};
 try{stores.session=window.sessionStorage;}catch{}try{stores.persistent=window.localStorage;}catch{}return stores;
}
function parse(raw:string|null,projectId:string,docKey:string):EditorDraft|null{
 if(!raw)return null;try{const d=JSON.parse(raw) as EditorDraft;if(d.schema!=='ad-editor-draft-2'||d.projectId!==projectId||d.docKey!==docKey||!Number.isInteger(d.base)||d.base<0||!Number.isFinite(d.at)||!d.doc||typeof d.doc!=='object'||!Array.isArray(d.doc.layers))return null;return d;}catch{return null;}
}
export function sameEditorDraft(a:Snapshot,b:Snapshot):boolean{
 try{return a.base===b.base&&JSON.stringify(a.doc)===JSON.stringify(b.doc);}catch{return false;}
}
export function readEditorDraft(projectId:string,docKey:string,stores:DraftStores=browserStores()):EditorDraft|null{
 const key=editorDraftKey(projectId,docKey);for(const store of [stores.session,stores.persistent]){try{const value=store&&parse(store.getItem(key),projectId,docKey);if(value)return value;}catch{}}return null;
}
/** Original policy: offer only the same native row version, never automatically apply or rebase a snapshot. */
export function editorDraftForHead(draft:EditorDraft|null,head:Snapshot):EditorDraft|null{
 return draft&&draft.base===head.base&&!sameEditorDraft(draft,head)?draft:null;
}
export function writeEditorDraft(projectId:string,docKey:string,snapshot:Snapshot,stores:DraftStores=browserStores(),at=Date.now()):{session:boolean;persistent:boolean}{
 const result={session:false,persistent:false};if(!Number.isInteger(snapshot.base)||snapshot.base<0||!snapshot.doc||!Array.isArray(snapshot.doc.layers))return result;let raw:string;try{raw=JSON.stringify({schema:'ad-editor-draft-2',projectId,docKey,doc:snapshot.doc,base:snapshot.base,at});}catch{return result;}
 const key=editorDraftKey(projectId,docKey);for(const name of ['session','persistent']as const){try{const store=stores[name];if(store){store.setItem(key,raw);result[name]=true;}}catch{}}return result;
}
/** Remove only an exact saved/discarded Doc+base snapshot. Another tab's different persistent draft is retained. */
export function clearEditorDraft(projectId:string,docKey:string,saved:Snapshot,stores:DraftStores=browserStores()):{session:boolean;persistent:boolean}{
 const result={session:false,persistent:false},key=editorDraftKey(projectId,docKey);
 for(const name of ['session','persistent']as const){try{const store=stores[name];if(!store)continue;const raw=store.getItem(key),draft=parse(raw,projectId,docKey);if(draft&&sameEditorDraft(draft,saved)&&store.getItem(key)===raw){store.removeItem(key);result[name]=true;}}catch{}}return result;
}
