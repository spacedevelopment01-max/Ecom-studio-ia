/** Propositions cognitives FICTIVES pour tests du moteur natif. Aucun fournisseur invoqué ici. */
import {account,project,sender} from './conversation209-fixtures';
import {openProjectConversation,conversationView} from '@/lib/orchestrator/conversation';
import {ownedConversation,metaOf} from '@/lib/orchestrator/conversation/store';
import {cognitiveContext} from '@/lib/orchestrator/conversation/intelligence-context';
import {id,run} from '@/lib/db';
import type {CataloguePlan} from '@/lib/orchestrator/conversation/catalogue-tool-contract';
import {quoteCatalogueChange,confirmCatalogueChange} from '@/lib/orchestrator/conversation/catalogue-tool-execution';
import {seedAgentUiSite} from '../scripts/agent211-ui-fixtures';
export async function catalogueFixture(business:'products'|'services'='products',theme=true){
 const u=await account(),pid=project(u,business),c=openProjectConversation(u,pid),send=sender(u,c.id);if(theme)await seedAgentUiSite(pid,business);
 const view=()=>conversationView(u,c.id);
 async function propose(text:string,fields:CataloguePlan['fields'],target?:CataloguePlan['target'],focus=true){
  await send({action:'message',text,...(target&&focus?{context:{tab:'catalogue',target:{kind:'catalogue-product',productId:target.productId,version:target.version}}}:{})});
  const row=ownedConversation(u,c.id),m=metaOf(row),ctx=cognitiveContext(row),source=ctx.context.lastClientRequest!;
  const evidence:CataloguePlan['evidence']=[];
  function leaves(v:unknown,path:string){if(Array.isArray(v)){if(!v.length)evidence.push({path,sourceId:source.sourceId!,quote:text});v.forEach((x,i)=>leaves(x,`${path}.${i}`));return;}if(v&&typeof v==='object'){for(const[k,x]of Object.entries(v))if(!['id','version','assetId'].includes(k))leaves(x,`${path}.${k}`);return;}if(!/^fields\.variants\.\d+\.options(?:\.|$)/.test(path))evidence.push({path,sourceId:source.sourceId!,quote:text});}
  leaves(fields,'fields');if(target&&!focus)evidence.push({path:'target',sourceId:source.sourceId!,quote:text});
  const plan:CataloguePlan={tool:'catalogue.draft',action:target?'update':'create',...(target?{target}:{}),fields,evidence},receipt=id();
  m.intelligence={lastReceiptId:receipt,sourceRevision:row.revision,sourceProjectRevision:view().projectRevision,lastReply:{message:'[Proposition de test, fournisseur non invoqué] Relisez le brouillon avant toute application.',status:'answer',business:null,businessEvidence:null,question:null,proposedChanges:[],knowledgeSourceIds:[],proposedTools:['catalogue.draft'],cataloguePlan:plan,actionsExecuted:false}};
  run('UPDATE agent_conversations SET state_json=? WHERE id=?',JSON.stringify(m),c.id);return{receipt,plan};
 }
 const quote=(receipt:string,requestNew=false)=>{const v=view();return quoteCatalogueChange(u,c.id,{action:'quote',revision:v.revision,projectRevision:v.projectRevision!,proposalReceiptId:receipt,requestNew});};
 const confirm=(qid:string)=>confirmCatalogueChange(u,c.id,{action:'confirm',quoteId:qid,confirmation:true,requestId:id()});
 return{u,pid,c,send,view,propose,quote,confirm};
}
