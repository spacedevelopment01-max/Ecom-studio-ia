import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
const jar=vi.hoisted(()=>({token:''}));
vi.mock('next/headers',()=>({cookies:async()=>({get:()=>jar.token?{value:jar.token}:undefined,set:()=>{},delete:()=>{}})}));
import * as projects from '@/app/api/projects/[id]/conversation/route';
import * as thread from '@/app/api/studio-agent/conversations/[cid]/route';
import * as intelligence from '@/app/api/studio-agent/conversations/[cid]/intelligence/route';
import {historicalProject,businessFingerprints} from './conversation284-fixtures';
import {account,project,sender,emptySpend} from './conversation209-fixtures';
import {openDraft,openProjectConversation,conversationView,submitConversation} from '@/lib/orchestrator/conversation';
import {ownedConversation} from '@/lib/orchestrator/conversation/store';
import {stateOf} from '@/lib/preparation/store';
import {all,one,run,id,now} from '@/lib/db';
import {sha256} from '@/lib/secrets';
import {currentTheme,saveThemeVersion} from '@/lib/projects';
import {updateItem} from '@/lib/contenus/carte';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';

beforeEach(()=>{jar.token='';vi.stubEnv('STUDIO_CONVERSATION_LOT_A','1');vi.stubEnv('STUDIO_CONVERSATION_AI','0');vi.stubGlobal('fetch',vi.fn(()=>{throw Error('Fournisseurs interdits dans A1');}));});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
function login(uid:string){jar.token=id();run('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)',sha256(jar.token),uid,now()+3600000,now());}
const req=(body?:unknown)=>new Request('http://localhost/api/conversation',{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',origin:'http://localhost'},...(body===undefined?{}:{body:JSON.stringify(body)})});
const pc=(pid:string)=>({params:Promise.resolve({id:pid})});
const cc=(cid:string)=>({params:Promise.resolve({cid})});
async function open(pid:string){const r=await projects.POST(req({}),pc(pid));expect(r.status).toBe(200);return await r.json() as ConversationView;}
const message=(v:ConversationView,text='Message exact, sans exécution')=>({action:'message',revision:v.revision,projectRevision:v.projectRevision,requestId:id(),text});

it.each(['products','services'] as const)('HTTP %s : double ouverture, message/réessai et reprise conservent toutes les données et octets',async business=>{
 const f=await historicalProject(business);login(f.u.id);const before=businessFingerprints(),spend=emptySpend();
 const [a,b]=await Promise.all([open(f.pid),open(f.pid)]);expect(a.id).toBe(b.id);expect(a.recovery?.state).toBe('read-only');expect(a.summary.preparationStatus).toBe('absent');expect(a.intelligence).toBeUndefined();expect(a.execution).toBeUndefined();expect(a.question).toBeNull();
 expect(a.recovery?.context.previousShopChat).toMatchObject({present:true,count:2,contentRead:false});expect(JSON.stringify(a)).not.toContain('ignore les gardes');expect(a.summary.facts).toEqual([]);
 expect(a.recovery?.context.theme.count).toBe(2);expect(a.recovery?.context.media.count).toBeGreaterThan(0);
 if(business==='services'){expect(a.recovery?.context.contents.find(x=>x.source==='restaurant_reservations')?.count).toBe(1);expect(a.summary.services[0].name).toBe('Prestation ancienne');}
 const cmd=message(a),responses=await Promise.all([thread.POST(req(cmd),cc(a.id)),thread.POST(req(cmd),cc(a.id))]);expect(responses.map(r=>r.status)).toEqual([200,200]);const bodies=await Promise.all(responses.map(r=>r.json()));expect(bodies[0]).toEqual(bodies[1]);
 const reopened=await thread.GET(req(),cc(a.id));expect(reopened.status).toBe(200);expect(reopened.headers.get('cache-control')).toContain('no-store');const v=await reopened.json();expect(v.id).toBe(a.id);expect(v.history).toHaveLength(1);expect(v.history[0].request.text).toBe(cmd.text);expect((await open(f.pid)).revision).toBe(1);
 expect(all('SELECT id FROM agent_conversations WHERE project_id=?',f.pid)).toHaveLength(1);expect(stateOf(f.pid)).toBeNull();expect(emptySpend()).toEqual(spend);expect(businessFingerprints()).toEqual(before);expect(fetch).not.toHaveBeenCalled();
});

it('préparation et conversation existantes gardent leur chemin et leur même fiche',async()=>{
 const u=await account(),pid=project(u),c=openProjectConversation(u,pid);await sender(u,c.id)({action:'message',text:'Je vends des carnets'});const prep=stateOf(pid),v=conversationView(u,c.id),before=businessFingerprints();
 expect(openProjectConversation(u,pid).id).toBe(c.id);expect(conversationView(u,c.id).recovery).toBeUndefined();expect(stateOf(pid)).toEqual(prep);expect(conversationView(u,c.id).projectRevision).toBe(v.projectRevision);expect(businessFingerprints()).toEqual(before);
});

it('deux processus SQLite ouvrent le même projet historique : une conversation, aucune écriture métier',async()=>{
 const f=await historicalProject('products'),before=businessFingerprints();
 const code=`const {one}=await import('./src/lib/db.ts');const {openProjectConversation}=await import('./src/lib/orchestrator/conversation/store.ts');const u=one('SELECT * FROM users WHERE id=?',process.argv[1]);console.log(openProjectConversation(u,process.argv[2]).id);`;
 const call=()=>promisify(execFile)(process.execPath,['--import','tsx','--input-type=module','-e',code,f.u.id,f.pid],{cwd:process.cwd(),env:{...process.env,NODE_OPTIONS:`--import=${path.resolve('scripts/lot9/network-guard.mjs')}`},timeout:30000});
 const [a,b]=await Promise.all([call(),call()]);expect(a.stdout.trim()).toBe(b.stdout.trim());expect(all('SELECT id FROM agent_conversations WHERE project_id=?',f.pid)).toHaveLength(1);expect(businessFingerprints()).toEqual(before);
});

it('réessaie le même requestId, refuse son réemploi avec un texte différent et une révision ancienne',async()=>{
 const f=await historicalProject('products'),c=openProjectConversation(f.u,f.pid),v=conversationView(f.u,c.id),cmd=message(v),before=businessFingerprints();
 const first=await submitConversation(f.u,c.id,cmd);expect(await submitConversation(f.u,c.id,cmd)).toEqual(first);
 await expect(submitConversation(f.u,c.id,{...cmd,text:'Autre texte'})).rejects.toMatchObject({code:'conversation_idempotency_conflict'});
 await expect(submitConversation(f.u,c.id,{...cmd,requestId:id()})).rejects.toMatchObject({code:'conversation_conflict'});
 expect(conversationView(f.u,c.id).history).toHaveLength(1);expect(businessFingerprints()).toEqual(before);
});

it('relit le contexte après retouche humaine ; aucun instantané ne restaure l’ancienne valeur',async()=>{
 const f=await historicalProject('services'),c=openProjectConversation(f.u,f.pid),v=conversationView(f.u,c.id),cur=currentTheme(f.pid)!;
 const next=saveThemeVersion(f.pid,cur.spec,'Modification humaine concurrente','user');const item=one<{id:string}>('SELECT id FROM carte_items WHERE project_id=?',f.pid)!;updateItem(f.pid,item.id,{name:'Titre modifié à la main',price:42});
 run('UPDATE projects SET name=? WHERE id=?','Nom manuel concurrent',f.pid);const afterManual=businessFingerprints();
 await submitConversation(f.u,c.id,message(v));const fresh=conversationView(f.u,c.id);expect(fresh.recovery?.contextVersion).not.toBe(v.recovery?.contextVersion);expect(fresh.recovery?.context.theme.current?.id).toBe(next.id);expect(fresh.recovery?.context.project.name).toBe('Nom manuel concurrent');expect(fresh.recovery?.context.contents).not.toEqual(v.recovery?.context.contents);expect(businessFingerprints()).toEqual(afterManual);
});

it.each(['client','admin'] as const)('compte %s étranger : accès projet/fil/POST refusés sans fuite',async role=>{
 const f=await historicalProject('products'),c=openProjectConversation(f.u,f.pid),b=await account();run('UPDATE users SET role=? WHERE id=?',role,b.id);login(b.id);const before=businessFingerprints();
 const responses=[await projects.GET(req(),pc(f.pid)),await projects.POST(req({}),pc(f.pid)),await thread.GET(req(),cc(c.id)),await thread.POST(req(message(conversationView(f.u,c.id))),cc(c.id))];
 for(const r of responses){expect(r.status).toBe(404);expect(await r.text()).not.toContain('HISTORIQUE');}expect(businessFingerprints()).toEqual(before);
});

it('droits révoqués : GET, ouverture, message et ancien reçu refusés avant toute fuite',async()=>{
 const f=await historicalProject('products');login(f.u.id);const v=await open(f.pid),cmd=message(v);expect((await thread.POST(req(cmd),cc(v.id))).status).toBe(200);
 run("UPDATE subscriptions SET status='canceled' WHERE project_id=?",f.pid);const before=businessFingerprints();
 for(const r of [await projects.GET(req(),pc(f.pid)),await projects.POST(req({}),pc(f.pid)),await thread.GET(req(),cc(v.id)),await thread.POST(req(cmd),cc(v.id))]){expect(r.status).toBe(402);expect(await r.text()).not.toContain('HISTORIQUE');}
 expect(businessFingerprints()).toEqual(before);
});

it('drapeau fermé : aucun rattachement, lecture ni réessai du fil',async()=>{
 const f=await historicalProject('products');login(f.u.id);const v=await open(f.pid);vi.stubEnv('STUDIO_CONVERSATION_LOT_A','0');const before=businessFingerprints(),turns=all('SELECT * FROM agent_conversation_turns');
 for(const r of [await projects.GET(req(),pc(f.pid)),await projects.POST(req({}),pc(f.pid)),await thread.GET(req(),cc(v.id)),await thread.POST(req(message(v)),cc(v.id))])expect(r.status).toBe(404);
 expect(all('SELECT * FROM agent_conversation_turns')).toEqual(turns);expect(businessFingerprints()).toEqual(before);
});

it.each(['edit','answer','prepare-action','accept-ai-changes','compare-strategy-options'] as const)('la commande %s ne peut pas écrire sur un projet repris',async action=>{
 const f=await historicalProject('products'),c=openProjectConversation(f.u,f.pid),v=conversationView(f.u,c.id),before=businessFingerprints();vi.stubEnv('STUDIO_CONVERSATION_AI','1');
 const fields={edit:{field:'description',value:'écraser'},answer:{question:'business',choices:['services']},'prepare-action':{tool:'understand-offer'},'accept-ai-changes':{proposalId:'forged'},'compare-strategy-options':{}}[action];
 await expect(submitConversation(f.u,c.id,{revision:v.revision,projectRevision:v.projectRevision,requestId:id(),action,...fields})).rejects.toMatchObject({code:'conversation_existing_read_only'});expect(conversationView(f.u,c.id).revision).toBe(0);expect(businessFingerprints()).toEqual(before);
});

it('cognition et adaptateurs bloqués même drapeaux ouverts ; texte sensible seulement conservé',async()=>{
 const f=await historicalProject('products');login(f.u.id);const v=await open(f.pid);for(const key of ['AI','SPECIALISTS','TOOLS','THEME_TOOLS','CATALOGUE','CONTEXT','KNOWLEDGE'])vi.stubEnv('STUDIO_CONVERSATION_'+key,'1');
 const before=businessFingerprints();expect(()=>ownedConversation(f.u,v.id)).toThrow('lecture seule');
 const r=await intelligence.POST(req({action:'quote',revision:0,projectRevision:null}),cc(v.id));expect(r.status).toBe(409);expect((await r.json()).code).toBe('conversation_existing_read_only');
 const classify=vi.fn();await submitConversation(f.u,v.id,message(v,'Publie, supprime et paie : ceci reste seulement mon message'),{classify});expect(classify).not.toHaveBeenCalled();expect(businessFingerprints()).toEqual(before);expect(fetch).not.toHaveBeenCalled();
});

it('brouillon de départ jamais injecté dans un projet historique rempli',async()=>{
 const f=await historicalProject('services'),b=await account(),d=openDraft(b);await sender(b,d.id)({action:'message',text:'Je vends des carnets'});const before=businessFingerprints();
 expect(()=>openProjectConversation(f.u,f.pid,d.id,1)).toThrow();expect(businessFingerprints()).toEqual(before);expect(stateOf(f.pid)).toBeNull();
});

it('pagination des messages et limites de références explicites',async()=>{
 const f=await historicalProject('products'),c=openProjectConversation(f.u,f.pid);for(let i=0;i<42;i++){const v=conversationView(f.u,c.id);await submitConversation(f.u,c.id,message(v,`Message historique ${i}`));}
 const last=conversationView(f.u,c.id);expect(last.history).toHaveLength(40);expect(last.historyBefore).toBe(3);const older=conversationView(f.u,c.id,last.historyBefore!);expect(older.history.map(x=>x.revision)).toEqual([1,2]);expect(last.recovery?.context.media.limit).toBe(50);expect(last.recovery?.context.media.contentRead).toBe(false);expect(stateOf(f.pid)).toBeNull();
});
