import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {account,project,sender} from './conversation209-fixtures';
import {createProduct,getProduct} from '@/lib/products/catalog';
import {openProjectConversation,submitConversation} from '@/lib/orchestrator/conversation';
import {id} from '@/lib/db';
// Studio : « Désigner pour SINA » dans Catalogue envoie la désignation AVEC la phrase (pas de sélection préalable).
beforeEach(()=>{for(const f of ['LOT_A','AI','CONTEXT','SPECIALISTS','TOOLS','CATALOGUE'])vi.stubEnv('STUDIO_CONVERSATION_'+f,'1');vi.stubGlobal('fetch',vi.fn(()=>{throw Error('NO_PROVIDER');}));});
afterEach(()=>{expect(fetch).not.toHaveBeenCalled();vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('la désignation jointe à la phrase suffit au moteur Stock, proposition puis accord gratuit',async()=>{
 const u=await account(),pid=project(u),c=openProjectConversation(u,pid),send=sender(u,c.id);
 const p=createProduct(pid,{title:'Capteur fictif',price:1200,variants:[{options:[],sku:'UNI',stock:2,stockPolicy:'continue'}]});
 const v=await send({action:'message',text:'Mets le stock de ce produit à 12',context:{projectId:pid,tab:'catalogue',target:{kind:'catalogue-product',productId:p.id,version:p.version}}});
 expect(v.localStock).toMatchObject({state:'proposed',diff:{before:2,after:12},target:{label:'Capteur fictif'}});
 const saved=await submitConversation(u,c.id,{action:'confirm-stock',proposalId:v.localStock!.proposalId!,confirmation:true,revision:v.revision,projectRevision:v.projectRevision,requestId:id()});
 expect(saved.localStock?.state).toBe('applied');expect(getProduct(pid,p.id).variants[0].stock).toBe(12);
});
