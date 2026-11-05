/**
 * #301 C21 — carte Contenus métier de SYNA, côté interface (contrat #310 de Codex, moteur inchangé).
 * Transport exercé contre le vrai moteur : bien, plat, réalisation ; accord explicite ; reçu = objet relu à une NOUVELLE
 * version ; réponse perdue rejouée à l'identique ; annulation par sélection A2 ; refus sans faux succès.
 */
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {serviceSpec} from './fixtures';
import {saveThemeVersion} from '@/lib/projects';
import {account,project} from './conversation209-fixtures';
import {openProjectConversation,conversationView,submitConversation} from '@/lib/orchestrator/conversation';
import {contextView,submitContext} from '@/lib/orchestrator/conversation/context-session';
import {adapter,updateContent} from '@/lib/contenus/api';
import {createBien} from '@/lib/biens';
import {addCategory,createItem} from '@/lib/contenus/carte';
import {createRealisation} from '@/lib/contenus/realisations';
import {id,one} from '@/lib/db';
import {createLocalBusinessContentConfirmation,hasNativeContentReceipt,handlesFreeContent,CONTENT_CHANGED_EVENT} from '@/lib/local-business-content-confirmation-client';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';

type Type='biens'|'plats'|'realisations';
beforeEach(()=>{for(const k of ['LOT_A','AI','CONTEXT','BUSINESS_CONTENT'])vi.stubEnv('STUDIO_CONVERSATION_'+k,'1');vi.stubGlobal('fetch',vi.fn(()=>{throw Error('Fournisseur interdit');}));});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
const noun=(type:Type)=>type==='biens'?'ce bien':type==='plats'?'ce plat':'cette réalisation';

async function fixture(type:Type='realisations',text?:string){
 const u=await account(),pid=project(u,'services'),c=openProjectConversation(u,pid);
 saveThemeVersion(pid,serviceSpec(type==='biens'?'maison-horizon':type==='plats'?'table-saison':'rive'),'Contexte métier fictif','user');
 const itemId=type==='biens'?createBien(u.id,pid,{transaction:'vente',data:{title:'Maison fictive',summary:'À Lyon.'}}).id:type==='plats'?createItem(pid,{categoryId:addCategory(pid,'Carte fictive').id,name:'Plat fictif',price:18,description:'Description conservée.'}).id:createRealisation(pid,{title:'Aménagement de van fictif',summary:'Rangements conservés.'}).id;
 const read=()=>adapter(type).get(pid,itemId),tab=type==='biens'?'biens':type==='plats'?'carte':'realisations';
 submitContext(u,c.id,{action:'select',revision:conversationView(u,c.id).revision,requestId:id(),context:{projectId:pid,tab,target:{kind:'content-item',type,itemId,version:read().version}}});
 const v0=conversationView(u,c.id);
 await submitConversation(u,c.id,{action:'message',revision:v0.revision,projectRevision:v0.projectRevision,requestId:id(),text:text??`Renomme ${noun(type)} en « Nouveau nom exact »`});
 let view=conversationView(u,c.id),lose=false;
 const bodies:Record<string,unknown>[]=[],applied=vi.fn(),storage=new Map<string,string>();
 const transport=vi.fn(async(url:unknown,init?:RequestInit)=>{
  const cmd=init?.body?JSON.parse(String(init.body)):undefined;
  try{
   let result;
   if(String(url).endsWith('/context'))result=cmd?submitContext(u,c.id,cmd):contextView(u,c.id);
   else{if(cmd)bodies.push(cmd);result=cmd?await submitConversation(u,c.id,cmd):conversationView(u,c.id);}
   if(cmd&&lose){lose=false;throw new TypeError('réponse perdue après enregistrement');}
   return Response.json(result);
  }catch(e){if(e instanceof TypeError)throw e;const err=e as Error&{status?:number};return Response.json({error:err.message},{status:err.status??500});}
 });
 const options={conversationId:c.id,fetch:transport as unknown as typeof fetch,view:()=>view,onView:(v:ConversationView)=>{view=v;},onState:vi.fn(),onApplied:applied,storage:{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>{storage.set(k,v);},removeItem:(k:string)=>{storage.delete(k);}},uuid:id};
 return{u,pid,c,itemId,type,read,bodies,applied,options,client:createLocalBusinessContentConfirmation(options),get:()=>view,lose:()=>{lose=true;}};
}

it.each(['biens','plats','realisations'] as const)('%s : proposition gratuite, accord, objet relu à une nouvelle version, espace prévenu une fois',async type=>{
 const t=await fixture(type),before=t.read();
 expect(t.get().localBusinessContent).toMatchObject({state:'proposed',costEur:0,providerCalls:0,financialConsent:false,publication:false,field:'title',diff:{after:'Nouveau nom exact'},target:{type,itemId:t.itemId,version:before.version}});
 expect(handlesFreeContent(t.get())).toBe(true);
 expect(t.read()).toEqual(before);
 await Promise.all([t.client.confirm(),t.client.confirm()]);
 expect(t.bodies).toHaveLength(1);
 expect(t.bodies[0]).toMatchObject({action:'confirm-business-content',confirmation:true});
 expect(hasNativeContentReceipt(t.get())).toBe(true);
 const after=t.read();
 expect(after.title).toBe('Nouveau nom exact');
 expect(after.version).not.toBe(before.version);
 expect(after.status).toBe(before.status);
 expect(t.applied).toHaveBeenCalledTimes(1);
 expect(t.applied).toHaveBeenCalledWith({projectId:t.pid,type,itemId:t.itemId,version:after.version,title:'Nouveau nom exact',receiptId:t.bodies[0].requestId});
 expect(one<{n:number}>('SELECT COUNT(*) n FROM ai_calls')!.n).toBe(0);
 expect(fetch).not.toHaveBeenCalled();
});

it('prix d’un plat : 18,50 € exact, rien d’autre ne change',async()=>{
 const t=await fixture('plats','Modifie le prix de ce plat à 18,50 €'),before=t.read();
 expect(t.get().localBusinessContent).toMatchObject({state:'proposed',field:'price',diff:{before:18,after:18.5}});
 await t.client.confirm();
 const after=t.read() as {title:string;data:{price:number;description:string}};
 expect(after.data.price).toBe(18.5);
 expect(after.title).toBe(before.title);
 expect(after.data.description).toBe('Description conservée.');
});

it('réponse perdue après enregistrement puis remontage : même corps, une seule écriture',async()=>{
 const t=await fixture();t.lose();await t.client.confirm();
 expect(t.client.getState().uncertain).toBe(true);
 expect(t.read().title).toBe('Nouveau nom exact');
 t.client.dispose();
 const retry=createLocalBusinessContentConfirmation(t.options);
 await retry.confirm();
 expect(t.bodies).toHaveLength(2);
 expect(t.bodies[1]).toEqual(t.bodies[0]);
 expect(retry.getState().uncertain).toBe(false);
 expect(hasNativeContentReceipt(t.get())).toBe(true);
});

it('réponse perdue : « Vérifier l’enregistrement » retrouve le reçu sans renvoyer la confirmation',async()=>{
 const t=await fixture();t.lose();await t.client.confirm();await t.client.refresh();
 expect(t.bodies).toHaveLength(1);
 expect(t.client.getState().uncertain).toBe(false);
});

it('annuler avant l’accord : proposition retirée, cible gardée, rien d’écrit',async()=>{
 const t=await fixture(),before=t.read(),selection=t.get().activeContext!.presentation!.selection;
 await t.client.cancel();
 expect(t.get().localBusinessContent).toBeUndefined();
 expect(t.get().activeContext!.presentation!.selection).toEqual(selection);
 expect(t.read()).toEqual(before);
});

it('modification dans l’écran natif entre la proposition et l’accord : refus, aucun faux succès, saisie humaine gardée',async()=>{
 const t=await fixture(),cur=t.read();
 updateContent(t.pid,'realisations',t.itemId,{title:'Titre saisi à la main'},cur.version);
 await t.client.confirm();
 expect(hasNativeContentReceipt(t.get())).toBe(false);
 expect(t.applied).not.toHaveBeenCalled();
 expect(t.client.getState().error).toMatch(/changé/);
 expect(t.read().title).toBe('Titre saisi à la main');
});

it('« applied » sans nouvelle version relue ne vaut jamais succès',async()=>{
 const t=await fixture(),s=t.get().localBusinessContent!;
 const item={id:t.itemId,type:'realisations' as const,version:s.target!.version,title:'x',fingerprint:'f'};
 expect(hasNativeContentReceipt({...t.get(),localBusinessContent:{...s,state:'applied',actionsExecuted:true,receiptId:'r',item}})).toBe(false);
 expect(hasNativeContentReceipt({...t.get(),localBusinessContent:{...s,state:'applied',receiptId:'r',item:{...item,version:'autre'}}})).toBe(false);
});

it.each([401,402,403,404])('HTTP %i : bloqué, aucune relance, aucun repli payant',async status=>{
 const t=await fixture(),denied=vi.fn(async()=>Response.json({error:'Accès indisponible'},{status}));
 const c=createLocalBusinessContentConfirmation({...t.options,fetch:denied as unknown as typeof fetch});
 await c.confirm();
 expect(c.getState().blocked).toBe(true);
 expect(denied).toHaveBeenCalledTimes(1);
});

it('drapeau fermé : aucune confirmation envoyée, bouton « Désigner » masqué par le drapeau du projet',async()=>{
 const t=await fixture(),before=t.read();vi.stubEnv('STUDIO_CONVERSATION_BUSINESS_CONTENT','0');
 await t.client.refresh();await t.client.confirm();
 expect(t.bodies).toHaveLength(0);
 expect(t.read()).toEqual(before);
});

it('raccordement : carte unique, bouton « Désigner pour SYNA » dans les trois espaces, relecture après écriture',()=>{
 const read=(p:string)=>fs.readFileSync(path.resolve(import.meta.dirname,'..',p),'utf8');
 const panel=read('src/components/studio/conversation-panel.tsx');
 expect(panel.match(/<ConversationLocalBusinessContent /g)).toHaveLength(1);
 expect(panel).toContain('!handlesFreeContent(v)');
 for(const [file,type] of [['tab-biens','biens'],['tab-carte','plats'],['tab-realisations','realisations']])expect(read(`src/components/studio/${file}.tsx`)).toMatch(new RegExp(`<DesignateContentForSyna type="${type}"[\\s\\S]*useContentChanged|useContentChanged\\("${type}"[\\s\\S]*<DesignateContentForSyna type="${type}"`));
 expect(read('src/app/api/projects/[id]/route.ts')).toContain('conversationBusinessContent:localBusinessContentEnabled()');
 expect(read('src/components/studio/syna-designate-content.tsx')).toContain('if(!agentUi||!data?.conversationBusinessContent||!updatedAt)return null;');
 expect(CONTENT_CHANGED_EVENT).toBe('studio:content-changed');
 expect(read('src/components/studio/conversation-local-business-content.tsx')).not.toMatch(/devis|quote/i);
});

it('désignation lisible : la version technique (horodatage) s’affiche en date « modifié le … », jamais en nombre brut',()=>{
 const panel=fs.readFileSync(path.resolve(import.meta.dirname,'..','src/components/studio/conversation-panel.tsx'),'utf8');
 expect(panel).toContain("t(' · modifié le ',' · edited on ')+new Date(Number(currentFocus.target.version))");
});
