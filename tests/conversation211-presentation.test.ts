import{expect,it}from'vitest';
import{conversationQuestionState,displayMaximumPct}from'@/lib/conversation-presentation';
import type{ConversationView}from'@/lib/orchestrator/conversation/contract';
it('un maximum positif ne paraît jamais nul ou inférieur au plafond transmis par le serveur',()=>{
  for(const value of [0,0.000001,0.049,0.10001,2.44,9.99,10.01,89.1,100]){const shown=displayMaximumPct(value);expect(shown).toBeGreaterThanOrEqual(value);if(value>0)expect(shown).toBeGreaterThan(0);}
  expect(()=>displayMaximumPct(NaN)).toThrow();expect(()=>displayMaximumPct(-1)).toThrow();
});
it('la question n’est plus reposée après réponse, peut être rouverte, puis différée et retrouvée sans historique chargé',()=>{
  const view={summary:{facts:[],target:''},history:[],intelligence:{reply:{question:{id:'clients',field:'target'}}}}as unknown as ConversationView;
  expect(conversationQuestionState(view)?.show).toBe(true);
  view.summary.facts.push({key:'conversation.ai.clients',value:'Écoles rurales',status:'confirmed',label:'Clients',source:'user'});
  view.summary.target='Écoles rurales';expect(conversationQuestionState(view)).toMatchObject({show:false,answer:'Écoles rurales'});
  view.history=[{revision:5,at:0,message:'',request:{action:'back-ai',questionId:'clients'}}];expect(conversationQuestionState(view)?.show).toBe(true);
  view.history.push({revision:6,at:0,message:'',request:{action:'answer-ai',questionId:'clients',unknown:true}});
  view.summary.target='';view.summary.facts[0].value='';view.summary.facts[0].status='unknown';expect(conversationQuestionState(view)).toMatchObject({show:false,unknown:true});
  view.history=[];expect(conversationQuestionState(view)).toMatchObject({show:false,unknown:true});
  view.summary.target='Associations d’apiculteurs';expect(conversationQuestionState(view)).toMatchObject({show:false,answer:'Associations d’apiculteurs',unknown:false});
});
it('une réponse manuelle active évite la répétition, mais des consignes existantes ne répondent pas à une nouvelle question',()=>{
  const view={summary:{facts:[],target:'Écoles rurales',constraints:'Aucun avis inventé'},history:[],intelligence:{reply:{question:{id:'clients',field:'target'}}}}as unknown as ConversationView;
  expect(conversationQuestionState(view)).toMatchObject({show:false,answer:'Écoles rurales'});
  view.intelligence!.reply!.question!.field='constraints';expect(conversationQuestionState(view)?.show).toBe(true);
});
