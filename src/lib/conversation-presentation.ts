/** Le maximum montré au client reste une borne supérieure malgré l'arrondi d'affichage. */
export function displayMaximumPct(value:number){if(!Number.isFinite(value)||value<0)throw Error('invalid_quote_maximum');return value<10?Math.ceil(value*10)/10:Math.ceil(value);}

import type {ConversationView} from './orchestrator/conversation/contract';
export function conversationClientText(request:unknown):string{
  const r=request as Record<string,unknown>|null;if(!r||r.action==='agent-reply')return '';
  if(r.action==='decide-strategy-option'&&typeof r.reason==='string')return r.reason;
  if(r.action==='answer-ai'&&typeof r.clientAnswer==='string')return r.clientAnswer;
  if(typeof r.text==='string'&&r.text)return r.text;
  return typeof r.value==='string'?r.value:'';
}
/** Une réponse active reste visible et corrigible sans présenter de nouveau la même question. */
export function conversationQuestionState(view:ConversationView,history=view.history){
  const q=view.intelligence?.reply?.question;if(!q)return null;
  const actions=history.filter(turn=>{const r=turn.request as {action?:string;questionId?:string}|null;return r?.questionId===q.id&&['answer-ai','back-ai'].includes(r.action??'');});
  const last=actions.reduce<(typeof actions)[number]|undefined>((a,b)=>!a||b.revision>a.revision?b:a,undefined);
  const reopened=(last?.request as {action?:string}|undefined)?.action==='back-ai';
  const fact=view.summary.facts.find(f=>f.key===`conversation.ai.${q.id}`);
  const canonical=q.field==='target'?view.summary.target:q.field==='offerName'?view.summary.offerName:q.field==='brandName'?view.summary.brandName:q.field==='goals'?view.summary.goals:q.field==='business'?view.summary.business:null;
  return {show:reopened||!fact&&!canonical,answer:canonical||fact?.value||'',unknown:fact?.status==='unknown'&&!canonical,question:q};
}
/** Métadonnées seulement : le serveur vérifie déjà la capacité de lecture de l'aperçu. */
export function previewSelectionScope(pathname:string,projectId:string):{versionId:string;page:string}|null{
 const address=pathname.match(/^\/preview\/([^/]+)\/v\/([^/]+)(\/.*)?$/);
 if(!address||address[1]!==projectId||/[?#\\]/.test(pathname))return null;
 // Le suffixe ~capacité n'est ni un identifiant de version ni une donnée à conserver dans la mémoire.
 const versionId=address[2].split('~',1)[0];if(!/^[a-zA-Z0-9_-]+$/.test(versionId))return null;
 return{versionId,page:address[3]||'/'};
}
