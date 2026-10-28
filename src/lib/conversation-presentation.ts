/** Le maximum montré au client reste une borne supérieure malgré l'arrondi d'affichage. */
export function displayMaximumPct(value:number){if(!Number.isFinite(value)||value<0)throw Error('invalid_quote_maximum');return value<10?Math.ceil(value*10)/10:Math.ceil(value);}

import type {ConversationView} from './orchestrator/conversation/contract';
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
