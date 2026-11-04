/**
 * #301 « SYNA complète » — relevé : projet dont la préparation est engagée (recherche acquise, comme tout projet réellement
 * construit). La conversation y est « en lecture seule » pour la FICHE ; on relève quelles exécutions gratuites restent
 * projetées dans la vue, et si le serveur accepte une proposition puis un accord Stock. Relevé du 4 novembre : 7 exécutions
 * disparaissaient ; contrat retenu avec Codex (a593e6ea) : `readOnlyReason` reste réservé à la fiche et
 * `localEditsWritable` (propriétaire + forfait) ouvre les retouches gratuites. Ce test vérifie maintenant ce contrat.
 */
import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import fs from 'node:fs';
import {account,project,sender} from './conversation209-fixtures';
import {seedSourcedAnglesForTest} from './sourced-strategy-fixture';
import {openProjectConversation,conversationView,submitConversation} from '@/lib/orchestrator/conversation';
import {createProduct,getProduct} from '@/lib/products/catalog';
import {id} from '@/lib/db';
import {nativeLocalEditAllowed} from '@/lib/existing-local-edits';
const FLAGS=['LOT_A','AI','CONTEXT','SPECIALISTS','TOOLS','CATALOGUE','SOCIAL','THEME_TOOLS','SERVICE_PROFILE','LOCAL_SITE','FILES','BUSINESS_CONTENT','SITE_REQUESTS','AD_DOCUMENT_LOCAL'];
beforeEach(()=>{for(const f of FLAGS)vi.stubEnv('STUDIO_CONVERSATION_'+f,'1');vi.stubGlobal('fetch',vi.fn(()=>{throw Error('NO_PROVIDER');}));});
afterEach(()=>{expect(fetch).not.toHaveBeenCalled();vi.unstubAllGlobals();vi.unstubAllEnvs();});
const KEYS=['localSiteExecution','localFilesExecution','localStockExecution','localCalendarExecution','localThemeChoiceExecution','localPagesExecution','localSeoExecution','serviceProfileExecution','localBusinessContentExecution','localRequestsExecution','localAdDocumentExecution','localSiteMotionExecution','localThemeRestoreExecution','localFoldersExecution','localFileRestoreExecution'];
it('projet préparé : fiche en lecture seule, retouches gratuites toujours projetées et autorisées, Stock confirmé',async()=>{
 const u=await account(),pid=project(u),c=openProjectConversation(u,pid);
 const before=conversationView(u,c.id);
 seedSourcedAnglesForTest(pid);
 const v=conversationView(u,c.id);
 const releve={avant:{readOnlyReason:before.readOnlyReason,executions:KEYS.filter(k=>(before as any)[k]?.enabled)},apres:{readOnlyReason:v.readOnlyReason,executions:KEYS.filter(k=>(v as any)[k]?.enabled)}};
 const prod=createProduct(pid,{title:'Capteur fictif',price:1200,variants:[{options:[],sku:'U',stock:2,stockPolicy:'deny'}]});
 const p=await sender(u,c.id)({action:'message',text:'Mets le stock de ce produit à 12',context:{projectId:pid,tab:'catalogue',target:{kind:'catalogue-product',productId:prod.id,version:prod.version}}});
 const saved=await submitConversation(u,c.id,{action:'confirm-stock',proposalId:p.localStock!.proposalId!,confirmation:true,revision:p.revision,projectRevision:p.projectRevision,requestId:id()});
 const stock={proposition:p.localStock?.state,accord:saved.localStock?.state,stockRelu:getProduct(pid,prod.id).variants[0].stock,boutonProjete:!!(saved as any).localStockExecution?.enabled};
 if(process.env.PROBE_OUT)fs.writeFileSync(`${process.env.PROBE_OUT}-projet-prepare.json`,JSON.stringify({releve,stock},null,1)+'\n');
 expect(before.readOnlyReason).toBeNull();
 // La fiche reste en lecture seule, mais toutes les retouches gratuites restent ouvertes et l'interface les autorise.
 expect(v.readOnlyReason).toMatch(/préparation engagée/);
 expect((v as any).localEditsWritable).toBe(true);expect(nativeLocalEditAllowed(v)).toBe(true);
 expect(releve.apres.executions).toEqual(KEYS);
 expect(stock).toMatchObject({proposition:'proposed',accord:'applied',stockRelu:12,boutonProjete:true});
 console.log(JSON.stringify({releve,stock}));
},120000);
