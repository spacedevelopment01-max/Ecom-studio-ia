import {nativeLocalEditAllowed} from './existing-local-edits';
import type {ConversationView} from './orchestrator/conversation/contract';
/**
 * #301 C21 — transport sans interface de la confirmation gratuite d'un contenu métier (bien, plat, réalisation ;
 * contrat #310 de Codex). Même discipline que la carte Fichiers (#305) et la retouche gratuite du site.
 * Même discipline que la retouche gratuite du site : aucune règle métier, aucun devis, aucun consentement financier ;
 * le reçu affiché vient toujours du serveur, jamais d'un résultat optimiste.
 * Le reçu n'est accepté que si l'objet relu porte une NOUVELLE version (la version désignée change à chaque écriture).
 * - réponse perdue : la MÊME confirmation (corps et requestId identiques) est rejouée, jamais une nouvelle ;
 * - annulation avant accord : nouvelle sélection A2 de la même cible (la proposition est invalidée côté serveur).
 */
type Pending={action:'confirm-business-content';proposalId:string;confirmation:true;revision:number;projectRevision:number|null;requestId:string};
export type BusinessContentConfirmationState={busy:boolean;error:string;uncertain:boolean;blocked?:boolean};
export type BusinessContentChange={projectId:string;type:'biens'|'plats'|'realisations';itemId:string;version:string;title:string;receiptId:string};
export const CONTENT_CHANGED_EVENT='studio:content-changed';
export const hasNativeContentReceipt=(v:ConversationView)=>{const s=v.localBusinessContent;return s?.state==='applied'&&s.actionsExecuted===true&&!!s.receiptId&&!!s.item?.id&&!!s.item.version&&!!s.target&&s.item.version!==s.target.version;};
export const handlesFreeContent=(v:ConversationView)=>!!v.localBusinessContent&&(v.localBusinessContent.state==='proposed'||v.localBusinessContent.state==='applied'||!!v.localBusinessContentExecution?.enabled);
export function createLocalBusinessContentConfirmation(options:{conversationId:string;fetch:typeof fetch;view:()=>ConversationView;onView:(v:ConversationView)=>void;onState:(s:BusinessContentConfirmationState)=>void;onApplied:(change:BusinessContentChange)=>Promise<void>|void;storage?:Pick<Storage,'getItem'|'setItem'|'removeItem'>;uuid?:()=>string}){
 // A controller may outlive its rendered conversation until effect cleanup.
 const scopeProject=options.view().projectId;
 const inScope=()=>options.view().id===options.conversationId&&options.view().projectId===scopeProject;
 const route=`/api/studio-agent/conversations/${options.conversationId}`,key=`syna-free-content:${options.conversationId}`;
 let alive=true,busy=false,pending:Pending|null=null,applied:string|undefined;
 let state:BusinessContentConfirmationState={busy:false,error:'',uncertain:false};
 try{const raw=options.storage?.getItem(key);if(raw){const p=JSON.parse(raw);if(p.action==='confirm-business-content'&&typeof p.proposalId==='string'&&typeof p.requestId==='string'&&p.confirmation===true&&Number.isInteger(p.revision)&&(p.projectRevision===null||Number.isInteger(p.projectRevision)))pending=p;}}catch{/* stockage indisponible : jamais un accord */}
 state.uncertain=!!pending;
 const emit=(patch:Partial<BusinessContentConfirmationState>)=>{state={...state,...patch};if(alive&&inScope())options.onState(state);};
 const clear=()=>{pending=null;try{options.storage?.removeItem(key);}catch{}};
 const reconcile=(v:ConversationView)=>{const proposal=v.localBusinessContent;if(pending&&proposal?.state==='proposed'&&proposal.proposalId&&pending.proposalId!==proposal.proposalId){clear();emit({uncertain:false,error:''});}};
 const uuid=()=>options.uuid?.()??crypto.randomUUID();
 async function request(path:string,body?:unknown){if(!alive||!inScope())throw new Error('Conversation changée.');const r=await options.fetch(path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});const data=await r.json();if(!r.ok)throw Object.assign(new Error(data.error??`Erreur ${r.status}`),{status:r.status});return data;}
 async function accept(v:ConversationView){
  if(!alive||!inScope())return;options.onView(v);
  if(hasNativeContentReceipt(v)&&v.localBusinessContent!.receiptId!==applied){const s=v.localBusinessContent!;applied=s.receiptId;await options.onApplied({projectId:v.projectId!,type:s.item!.type,itemId:s.item!.id,version:s.item!.version,title:s.item!.title,receiptId:s.receiptId!});}
 }
 async function refresh(){const v=await request(route) as ConversationView;if(inScope())reconcile(v);await accept(v);emit({blocked:!nativeLocalEditAllowed(v)||!v.localBusinessContentExecution?.enabled});return v;}
 async function locked(action:()=>Promise<void>){
  if(busy||!alive||!inScope())return;reconcile(options.view());busy=true;emit({busy:true,error:''});
  try{await action();}
  catch(error){const e=error as Error&{status?:number};
   if(e.status){clear();emit({blocked:[401,402,403,404].includes(e.status),uncertain:false,error:e.message});if(e.status===409){try{await refresh();}catch{/* l'erreur affichée reste la vraie cause */}}}
   else emit({error:'Réponse non reçue. Vérifiez l’enregistrement ou réessayez la même confirmation gratuite.',uncertain:!!pending});
  }finally{busy=false;emit({busy:false});}
 }
 return{
  activate(){alive=true;},
  getState:()=>state,
  dispose(){alive=false;},
  refresh:()=>locked(async()=>{const v=await refresh();if(pending&&hasNativeContentReceipt(v)&&v.localBusinessContent!.receiptId===pending.requestId){clear();emit({uncertain:false,error:''});}}),
  confirm:()=>locked(async()=>{
   const v=options.view(),s=v.localBusinessContent;if(!nativeLocalEditAllowed(v)||!v.localBusinessContentExecution?.enabled)throw Object.assign(new Error('Modification gratuite indisponible.'),{status:403});
   if(!pending){if(s?.state!=='proposed'||!s.proposalId||!s.diff||!s.target)throw Object.assign(new Error('Demandez une nouvelle proposition gratuite.'),{status:409});pending={action:'confirm-business-content',proposalId:s.proposalId,confirmation:true,revision:v.revision,projectRevision:v.projectRevision,requestId:uuid()};try{options.storage?.setItem(key,JSON.stringify(pending));}catch{}}
   const command=pending;const response=await request(route,command) as ConversationView;
   if(!hasNativeContentReceipt(response))throw new Error('Enregistrement du contenu non confirmé.');
   const next=await refresh();if(!hasNativeContentReceipt(next)||next.localBusinessContent!.receiptId!==command.requestId)throw new Error('Modification enregistrée à vérifier.');clear();emit({uncertain:false});
  }),
  cancel:()=>locked(async()=>{
   if(pending)throw new Error('Vérifiez d’abord la confirmation dont la réponse est incertaine.');
   const proposal=options.view().localBusinessContent?.proposalId,v=await refresh(),context=v.activeContext?.presentation;
   if(!proposal||v.localBusinessContent?.proposalId!==proposal||v.localBusinessContent.state!=='proposed')return;
   if(context?.state!=='valid'||!context.selection)throw Object.assign(new Error('Le contenu désigné a changé : cette proposition ne peut plus être exécutée. Désignez-le de nouveau.'),{status:409});
   // La sélection A2 existante invalide la proposition en gardant exactement la même cible.
   await request(route+'/context',{action:'select',revision:v.revision,requestId:uuid(),context:context.selection});await refresh();
  }),
 };
}
