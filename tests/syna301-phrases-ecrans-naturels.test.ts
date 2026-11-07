/**
 * #301 « SINA complète » — phrases 11, 14, 15 et 16 du relevé d'origine, envoyées depuis leur écran naturel (Site,
 * Activité, Calendrier, Catalogue) sans aménagement : chacune reçoit une réponse gratuite (proposition ou précision),
 * rien n'est écrit sans accord, aucun appel IA. Relevé écrit dans PROBE_OUT si fourni.
 */
import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import fs from 'node:fs';
import {account,project,sender} from './conversation209-fixtures';
import {localSiteFixture} from './conversation284-b1-fixtures';
import {openProjectConversation,submitConversation} from '@/lib/orchestrator/conversation';
import {createManualPost} from '@/lib/social-v2/manual';
import {createProduct,getProduct} from '@/lib/products/catalog';
import {currentTheme,loadProject,saveProduct,saveBrand,saveServices} from '@/lib/projects';
import {localBrand} from '@/lib/engine/local';
import {emptyServiceProfile} from '@/lib/project-types';
import {one,now} from '@/lib/db';
const FLAGS=['LOT_A','AI','CONTEXT','SPECIALISTS','TOOLS','CATALOGUE','SOCIAL','THEME_TOOLS','SERVICE_PROFILE','LOCAL_SITE'];
beforeEach(()=>{for(const f of FLAGS)vi.stubEnv('STUDIO_CONVERSATION_'+f,'1');vi.stubGlobal('fetch',vi.fn(()=>{throw Error('NO_PROVIDER');}));});
afterEach(()=>{expect(fetch).not.toHaveBeenCalled();vi.unstubAllGlobals();vi.unstubAllEnvs();});
// Mêmes textes, mot pour mot, que PHRASES dans tests/syna301-sondes-348.test.ts (non importé : il rejouerait toute la sonde).
const ORIGINE:Record<string,string>={'C06 thème':'Choisis le thème Rive pour mon site','C21 prestation':'Renomme cette prestation en « Aménagement complet »','C16 calendrier':'Déplace ma prochaine publication au 12 novembre','C12 stock':'Mets le stock de ce produit à 12'};
const phrase=(op:string)=>ORIGINE[op];
it('les phrases d’origine sont identiques à la sonde permanente',()=>{const sonde=fs.readFileSync('tests/syna301-sondes-348.test.ts','utf8');for(const [op,text] of Object.entries(ORIGINE))expect(sonde).toContain(`['${op}','${text}']`);});
const aiCalls=()=>one<{n:number}>('SELECT COUNT(*) n FROM ai_calls')!.n;
it('phrases thème, prestation, calendrier et stock depuis leur écran : réponse gratuite, aucune écriture, aucun appel IA',async()=>{
 const out:Record<string,unknown>[]=[],calls=aiCalls();
 { // 11 — Site
  const f=await localSiteFixture('services'),p=loadProject(f.pid);saveProduct(f.pid,{...p.product,name:'Atelier fictif',summary:'Présentation fournie.'});saveBrand(f.pid,localBrand(loadProject(f.pid).product,'Atelier fictif',{business:'services',services:p.services}).brand);
  const before=currentTheme(f.pid)!.version.id,v=await submitConversation(f.u,f.c.id,{...f.message(phrase('C06 thème')),context:{tab:'boutique',target:null}});
  expect(currentTheme(f.pid)!.version.id).toBe(before);expect(['proposed','ambiguous']).toContain(v.localThemeChoice?.state);expect(v.action?.state).not.toBe('quote');
  out.push({op:'C06 thème',ecran:'Site',etat:v.localThemeChoice?.state,message:v.localThemeChoice?.message.slice(0,160)});
 }
 { // 14 — Activité
  const u=await account(),pid=project(u,'services'),c=openProjectConversation(u,pid),send=sender(u,c.id);
  saveServices(pid,{...emptyServiceProfile(),hours:'Lundi 09–17',services:[{name:'Diagnostic',description:'Examen fourni',price:'50 €',duration:'30 min'},{name:'Pose',description:'Pose fournie',price:'100 €',duration:'60 min'}]} as never);
  const before=JSON.stringify(loadProject(pid).services),v=await send({action:'message',text:phrase('C21 prestation'),context:{tab:'produit',target:null}});
  expect(JSON.stringify(loadProject(pid).services)).toBe(before);expect(v.action?.state).not.toBe('quote');
  out.push({op:'C21 prestation',ecran:'Activité',etat:v.serviceProfile?.state,champ:(v.serviceProfile as {field?:string}|undefined)?.field,choix:(v.serviceProfile as {choices?:unknown[]}|undefined)?.choices?.length,message:v.serviceProfile?.message.slice(0,160)});
 }
 { // 15 — Calendrier
  const u=await account(),pid=project(u),c=openProjectConversation(u,pid),send=sender(u,c.id);
  const post=createManualPost(loadProject(pid),u.id,{network:'facebook',format:'text',title:'Brouillon fictif',caption:'Texte',hashtags:'',media:[],scheduledAt:Math.floor(now()/60000)*60000+3*86400000});
  const before=JSON.stringify(one('SELECT * FROM posts WHERE id=?',post.id)),v=await send({action:'message',text:phrase('C16 calendrier'),context:{tab:'calendrier',target:null}});
  expect(JSON.stringify(one('SELECT * FROM posts WHERE id=?',post.id))).toBe(before);expect(['proposed','ambiguous']).toContain(v.localCalendar?.state);expect(v.action?.state).not.toBe('quote');
  out.push({op:'C16 calendrier',ecran:'Calendrier',etat:v.localCalendar?.state,message:v.localCalendar?.message.slice(0,160)});
 }
 { // 16 — Catalogue (produit désigné avec la phrase)
  const u=await account(),pid=project(u),c=openProjectConversation(u,pid),send=sender(u,c.id);
  const prod=createProduct(pid,{title:'Capteur fictif',price:1200,variants:[{options:[],sku:'U',stock:2,stockPolicy:'deny'}]});
  const v=await send({action:'message',text:phrase('C12 stock'),context:{projectId:pid,tab:'catalogue',target:{kind:'catalogue-product',productId:prod.id,version:prod.version}}});
  expect(getProduct(pid,prod.id).variants[0].stock).toBe(2);expect(v.localStock?.state).toBe('proposed');
  out.push({op:'C12 stock',ecran:'Catalogue',etat:v.localStock?.state,message:v.localStock?.message.slice(0,160)});
 }
 expect(aiCalls()).toBe(calls);
 if(process.env.PROBE_OUT)fs.writeFileSync(`${process.env.PROBE_OUT}-ecrans-naturels.json`,JSON.stringify(out,null,1)+'\n');
},240000);
