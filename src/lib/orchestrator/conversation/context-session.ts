/** A2 : sélection persistante, relecture native et reprise explicitement consentie.
 * Les seuls effets de ces commandes sont dans le fil SYNA, jamais dans les données métier.
 */
import {z} from 'zod';
import {HttpError,type User} from '../../auth';
import {all,one,id,now,run,tx,readSnapshot} from '../../db';
import {requirePlan} from '../../plan-gates';
import {currentTheme} from '../../projects';
import {stableHash} from '../../brain/hash';
import {getProduct} from '../../products/catalog';
import {L} from '../../i18n-server';
import {ownedConversation,metaOf,isExistingProjectRead} from './store';
import {activeContextEnabled,resolveActiveContext,observedActiveContext} from './active-context';
import {ActiveContextSchema,ActiveTabSchema,type ActiveContext,contextFromNativePreview,NativePreviewAddressSchema} from './active-context-contract';
import {themeToolContext} from './theme-tool-context';
import type {ConversationRow} from './contract';

const base={revision:z.number().int().nonnegative(),requestId:z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/)};
export const ContextCommandSchema=z.discriminatedUnion('action',[
 z.object({...base,action:z.literal('select'),context:ActiveContextSchema}).strict(),
 z.object({...base,action:z.literal('select-preview'),native:NativePreviewAddressSchema}).strict(),
 z.object({...base,action:z.literal('navigate'),tab:ActiveTabSchema}).strict(),
 z.object({...base,action:z.literal('clear')}).strict(),
 z.object({...base,action:z.literal('revalidate'),expectedReference:z.string().regex(/^[a-f0-9]{16}$/),currentReference:z.string().regex(/^[a-f0-9]{16}$/),confirmation:z.literal(true)}).strict(),
]);
function owned(u:User,cid:string){if(!activeContextEnabled())throw new HttpError(404,'conversation_context_disabled');const c=ownedConversation(u,cid,true);if(!c.project_id)throw new HttpError(409,'conversation_project_required');requirePlan(u,c.project_id);return c;}
export type ContextPin={selection:ActiveContext;reference:string};
const reference=(c:ConversationRow,selection:ActiveContext)=>stableHash('conversation-active-context-1',resolveActiveContext(c,selection));
function currentCandidate(c:ConversationRow,selection:ActiveContext):ActiveContext|null{
 const t=selection.target;if(!t)return selection;
 try{
  let target=structuredClone(t);
  if('versionId'in target){const theme=currentTheme(c.project_id!);if(!theme)return null;target.versionId=theme.version.id;}
  if(target.kind==='asset'){
   const a=one<{version:number}>("SELECT version FROM assets WHERE id=? AND project_id=? AND user_id=? AND deleted_at IS NULL AND status!='rejected'",target.assetId,c.project_id,c.user_id);if(!a)return null;target.version=a.version;
  }
  if(target.kind==='catalogue-product'||target.kind==='catalogue-variant'){
   const p=getProduct(c.project_id!,target.productId);if(target.kind==='catalogue-product')target.version=p.version;else{const v=p.variants.find(v=>v.id===target.variantId);if(!v)return null;target.productVersion=p.version;target.version=v.version;}
  }
  const fresh={...selection,target};const r=resolveActiveContext(c,fresh);if('isCurrent'in r&&r.isCurrent===false)return null;
  return fresh;
 }catch(e){if(e instanceof HttpError)return null;throw e;}
}
/** DTO commun aux deux présentations. Une suggestion n'est jamais appliquée par GET. */
export function contextPresentation(c:ConversationRow){
 const m=metaOf(c),selection=m.activeContext,observed=observedActiveContext(c,selection),pin=m.activeContextReference??null;
 const valid=observed?.state==='resolved'&&(!('isCurrent'in observed)||observed.isCurrent!==false)&&(!pin||pin===observed.reference);
 const fresh=selection?.target&&!valid?currentCandidate(c,selection):null;
 // Ne pas remplacer une section par une autre de même nom ni un champ dont le type natif a changé.
 const freshResolved=fresh?resolveActiveContext(c,fresh):null;
 const oldIdentity=m.activeContextIdentity??(observed?.state==='resolved'?observed.canonical.identity:null);
 const sameIdentity=!!oldIdentity&&!!freshResolved&&oldIdentity===freshResolved.canonical.identity;
 return{schema:'studio-context-presentation-2' as const,projectId:c.project_id,conversationId:c.id,revision:c.revision,
  activeTab:m.activeContextTab??selection?.tab??null,selection:selection??null,reference:pin??(observed?.state==='resolved'?observed.reference:null),
  state:!selection?.target?'empty' as const:valid?'valid' as const:observed?.state==='resolved'||fresh?'conflict' as const:'unavailable' as const,
  target:observed,needsRevalidation:!!selection?.target&&!valid,
  recovery:selection?.target&&!valid?{action:fresh&&sameIdentity?'revalidate' as const:'reselect' as const,confirmationRequired:true,expectedReference:pin,current:fresh&&sameIdentity?{selection:fresh,reference:reference(c,fresh),canonical:freshResolved!.canonical,label:freshResolved!.label,target:freshResolved}:null,automatic:false}:null,
  effects:{businessWrites:false,providerCalls:0,toolsAuthorized:false,readOnlyProject:isExistingProjectRead(c)},
 };
}
export class ContextConflict extends HttpError{
 readonly context:ReturnType<typeof contextPresentation>;
 constructor(c:ConversationRow){super(409,L('La cible ou sa version a changé. Relisez le contexte puis confirmez une nouvelle désignation avant de préparer l’action.','The target or its version changed. Read the context and confirm a new selection before preparing the action.'),'conversation_target_conflict');this.context=contextPresentation(c);}
}
/** Toute action qui capture un repère relit ce repère au devis, à l'accord et dans le worker. */
export function checkedContextPin(c:ConversationRow,pinned?:ContextPin):ContextPin|undefined{
 const m=metaOf(c),selection=pinned?.selection??m.activeContext;if(!selection?.target)return undefined;
 if(!activeContextEnabled())throw new HttpError(404,'conversation_context_disabled');
 const r=observedActiveContext(c,selection),expected=pinned?.reference??m.activeContextReference;
 if(!r||r.state!=='resolved'||('isCurrent'in r&&r.isCurrent===false)||expected&&r.reference!==expected)throw new ContextConflict({...c,state_json:JSON.stringify({...m,activeContext:selection,activeContextReference:expected})});
 if(pinned&&m.activeContext&&stableHash('context-address',m.activeContext)!==stableHash('context-address',selection))throw new ContextConflict(c);
 return{selection,reference:r.reference};
}
export function contextView(u:User,cid:string,directory=false){return readSnapshot(()=>{const c=owned(u,cid);return{...contextPresentation(c),...(directory?{directory:themeToolContext(c.project_id!),directoryScope:'native_fields_only_not_dom_or_permissions'}:{}),message:L('Contexte lu, aucune action métier ni IA.','Context read; no business or AI action.')};});}
type SelectionReceipt={requestId:string;revision:number;action:z.infer<typeof ContextCommandSchema>['action'];reference:string|null};
export function submitContext(u:User,cid:string,raw:unknown){
 const cmd=ContextCommandSchema.parse(raw),hash=stableHash('context-command-2',cmd);
 return tx(()=>{
  const c=owned(u,cid),m=metaOf(c);
  const prior=one<{request_hash:string;response_json:string}>("SELECT request_hash,response_json FROM agent_conversation_turns WHERE conversation_id=? AND request_id=?",cid,cmd.requestId);
  if(prior){if(prior.request_hash!==hash)throw new HttpError(409,'conversation_idempotency_conflict');const saved=JSON.parse(prior.response_json) as {receipt:SelectionReceipt};return{...contextView(u,cid),receipt:saved.receipt,replayed:true};}
  if(c.revision!==cmd.revision)throw new HttpError(409,'conversation_conflict');if(c.revision>=1000)throw new HttpError(409,'conversation_limit');
  if(['clear','select','select-preview','revalidate'].includes(cmd.action)){delete m.localSiteProposal;delete m.localSite;}
  if(cmd.action==='clear'){delete m.activeContext;delete m.activeContextReference;delete m.activeContextIdentity;}
  if(cmd.action==='navigate')m.activeContextTab=cmd.tab;
  if(cmd.action==='select'||cmd.action==='select-preview'){
   const selection=cmd.action==='select'?cmd.context:contextFromNativePreview(cmd.native);
   const resolved=resolveActiveContext(c,selection);
   if('isCurrent'in resolved&&resolved.isCurrent===false)throw new ContextConflict({...c,state_json:JSON.stringify({...m,activeContext:selection,activeContextReference:reference(c,selection)})});
   m.activeContext=selection;m.activeContextReference=reference(c,selection);m.activeContextIdentity=resolved.canonical.identity;m.activeContextTab=selection.tab;
  }
  if(cmd.action==='revalidate'){
   if(!m.activeContext?.target||m.activeContextReference!==cmd.expectedReference)throw new HttpError(409,'conversation_context_revalidation_stale');
   const presentation=contextPresentation(c),candidate=presentation.recovery?.current?.selection;
   if(candidate&&presentation.recovery?.current?.reference!==cmd.currentReference)throw new ContextConflict(c);
   if(!candidate)throw new HttpError(409,L('Resélectionnez la cible native ; aucune substitution automatique.','Select the native target again; no automatic substitution.'),'conversation_target_reselect');
   m.activeContext=candidate;m.activeContextReference=reference(c,candidate);m.activeContextIdentity=resolveActiveContext(c,candidate).canonical.identity;
  }
  run('UPDATE agent_conversations SET revision=?,state_json=?,updated_at=? WHERE id=? AND revision=?',c.revision+1,JSON.stringify(m),now(),cid,c.revision);
  const view=contextView(u,cid),response={...view,receipt:{requestId:cmd.requestId,revision:c.revision+1,action:cmd.action,reference:view.reference} as SelectionReceipt,replayed:false},at=now();
  run('INSERT INTO agent_conversation_turns (id,conversation_id,revision,request_id,request_hash,request_json,response_json,created_at) VALUES (?,?,?,?,?,?,?,?)',id(),cid,c.revision+1,cmd.requestId,hash,JSON.stringify(cmd),JSON.stringify(response),at);
  return response;
 });
}
