import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
const jar=vi.hoisted(()=>({token:''}));vi.mock('next/headers',()=>({cookies:async()=>({get:()=>jar.token?{value:jar.token}:undefined,set:()=>{},delete:()=>{}})}));
import {account,project,sender} from './conversation209-fixtures';
import {openProjectConversation} from '@/lib/orchestrator/conversation';
import {saveServices,saveThemeVersion,listThemeVersions} from '@/lib/projects';
import {readPrestations,savePrestations} from '@/lib/contenus/prestations';
import {serviceSpec} from './fixtures';
import {emptyServiceProfile} from '@/lib/project-types';
import {seedSourcedAnglesForTest} from './sourced-strategy-fixture';
import {id,now,run} from '@/lib/db';
import {sha256} from '@/lib/secrets';
import * as thread from '@/app/api/studio-agent/conversations/[cid]/route';
import {createLocalBookingEditConfirmation,hasLocalBookingEditReceipt} from '@/lib/local-booking-edit-confirmation-client';
import {ConversationLocalBookingEdit,handlesLocalBookingEdit} from '@/components/studio/conversation-local-booking-edit';
const providers=vi.fn(()=>{throw Error('NO_PROVIDER');});
beforeEach(()=>{for(const f of ['LOT_A','AI','CONTEXT','BOOKING_EDIT'])vi.stubEnv('STUDIO_CONVERSATION_'+f,'1');vi.stubGlobal('fetch',providers);});
afterEach(()=>{expect(providers).not.toHaveBeenCalled();vi.unstubAllGlobals();vi.unstubAllEnvs();});
const idle={controller:null,state:{busy:false,error:'',uncertain:false}} as never;
const html=(view:any,confirmation=idle)=>renderToStaticMarkup(createElement(ConversationLocalBookingEdit,{view,confirmation,busy:false}));
async function fixture(prepared:boolean){
 const u=await account(),pid=project(u,'services'),c=openProjectConversation(u,pid);
 saveServices(pid,{...emptyServiceProfile(),services:[{name:'Diagnostic fictif',description:'Profil distinct',price:'Sur devis',duration:'Durée du profil'}]});
 saveThemeVersion(pid,serviceSpec('atelier-nuance' as never),'Fictif','user');
 savePrestations(pid,{services:[{name:'Diagnostic fictif',duration:30,price:50,category:'coupe'},{name:'Autre fictif',duration:20,price:35,category:'soin'}]});
 if(prepared)seedSourcedAnglesForTest(pid);
 jar.token=id();run('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)',sha256(jar.token),u.id,now()+3600000,now());
 const params={params:Promise.resolve({cid:c.id})},hdr={origin:'http://localhost','content-type':'application/json'};
 let lose=false;
 const transport=(async(_url:unknown,init?:RequestInit)=>{const r=init?.method==='POST'?await thread.POST(new Request('http://localhost/x',{method:'POST',headers:hdr,body:init.body as string}),params):await thread.GET(new Request('http://localhost/x',{headers:hdr}),params);if(lose&&init?.method==='POST'){lose=false;throw new TypeError('Failed to fetch');}return r;}) as typeof fetch;
 return{u,pid,c,send:sender(u,c.id),transport,loseNext:()=>{lose=true;}};
}
const price=(pid:string)=>readPrestations(pid)!.services.find(s=>s.name==='Diagnostic fictif')!.price;
it.each([false,true])('phrase naturelle → avant / après en euros → accord gratuit → valeur relue (projet préparé=%s)',async prepared=>{
 const f=await fixture(prepared),v=await f.send({action:'message',text:'Mets le prix réservable de « Diagnostic fictif » à 60 €',context:{tab:'rendez-vous',target:null}});
 expect(handlesLocalBookingEdit(v)).toBe(true);const card=html(v);
 expect(card).toContain('Retouche réservable — gratuit');expect(card).toContain('Diagnostic fictif');expect(card).toMatch(/50\s€/);expect(card).toMatch(/60\s€/);expect(card).toContain('Confirmer gratuitement');
 expect(price(f.pid)).toBe(50);
 let shown=v;const applied:any[]=[];
 const ctl=createLocalBookingEditConfirmation({conversationId:f.c.id,fetch:f.transport,view:()=>shown,onView:n=>{shown=n;},onState:()=>{},onApplied:x=>{applied.push(x);},uuid:()=>'req-'+f.c.id});
 await ctl.confirm();
 expect(hasLocalBookingEditReceipt(shown)).toBe(true);expect(price(f.pid)).toBe(60);expect(applied).toHaveLength(1);expect(applied[0]).toMatchObject({field:'price',after:60});
 const done=html(shown);expect(done).toContain('Enregistré et relu');expect(done).toContain(`href="/studio/${f.pid}/rendez-vous"`);expect(done).not.toContain('Confirmer gratuitement');
});
it('réponse perdue : la même confirmation reprise ne crée pas une seconde version',async()=>{
 const f=await fixture(false),v=await f.send({action:'message',text:'Peux-tu modifier la durée de réservation de « Diagnostic fictif » à 45 minutes ?',context:{tab:'rendez-vous',target:null}});
 expect(v.bookingEdit?.state).toBe('proposed');expect(html(v)).toContain('45 min');
 let shown=v,st:any={};const store=new Map<string,string>(),storage={getItem:(k:string)=>store.get(k)??null,setItem:(k:string,x:string)=>{store.set(k,x);},removeItem:(k:string)=>{store.delete(k);}};
 const ctl=createLocalBookingEditConfirmation({conversationId:f.c.id,fetch:f.transport,view:()=>shown,onView:n=>{shown=n;},onState:s=>{st=s;},onApplied:()=>{},storage,uuid:()=>'req-perdue'});
 f.loseNext();await ctl.confirm();expect(st.uncertain).toBe(true);
 const versions=listThemeVersions(f.pid).length;
 await ctl.confirm();expect(st.uncertain).toBe(false);expect(hasLocalBookingEditReceipt(shown)).toBe(true);expect(shown.bookingEdit!.receiptId).toBe('req-perdue');
 expect(listThemeVersions(f.pid).length).toBe(versions);expect(readPrestations(f.pid)!.services.find(s=>s.name==='Diagnostic fictif')!.duration).toBe(45);
});
it('annuler ne modifie rien ; aucune carte sans le réglage ni sur un ancien projet ; lien inconnu jamais affiché',async()=>{
 const f=await fixture(false),v=await f.send({action:'message',text:'Mets le prix réservable de « Diagnostic fictif » à 70 €',context:{tab:'rendez-vous',target:null}});
 let shown=v;const ctl=createLocalBookingEditConfirmation({conversationId:f.c.id,fetch:f.transport,view:()=>shown,onView:n=>{shown=n;},onState:()=>{},onApplied:()=>{},uuid:()=>id()});
 await ctl.cancel();expect(shown.bookingEdit?.state).not.toBe('proposed');expect(price(f.pid)).toBe(50);
 expect(html({...v,bookingEditExecution:undefined})).not.toContain('Confirmer gratuitement');
 expect(html({...v,recovery:{} as never})).toBe('');expect(html({...v,localEditsWritable:false})).toBe('');
 expect(html({...v,bookingEdit:{...v.bookingEdit!,state:'applied',receiptId:'r',resultVersionId:'x',actionsExecuted:true,confirmationRequired:false,nativeHref:'https://exemple.test/'}})).not.toContain('exemple.test');
});
it('le panneau monte la carte, la verrouille avec les autres et la page Rendez-vous se relit après le reçu',()=>{
 const p=readFileSync('src/components/studio/conversation-panel.tsx','utf8');
 expect(p).toContain('<ConversationLocalBookingEdit view={v} confirmation={bookingEdit} busy={interactionBusy}/>');expect(p).toContain('!handlesLocalBookingEdit(v)&&');expect(p).toContain('bookingEdit.state.busy');
 expect(readFileSync('src/components/studio/tab-rendez-vous.tsx','utf8')).toContain('window.addEventListener("studio:booking-changed", on)');
});
import {freeTurnSettled} from '@/lib/conversation-free-turn';
it('après un accord ou une annulation gratuite, SYNA ne propose pas de devis payant pour la même demande',async()=>{
 const f=await fixture(false),v=await f.send({action:'message',text:'Mets le prix réservable de « Diagnostic fictif » à 80 €',context:{tab:'rendez-vous',target:null}});
 expect(freeTurnSettled(v)).toBe(false);
 let shown=v;const ctl=createLocalBookingEditConfirmation({conversationId:f.c.id,fetch:f.transport,view:()=>shown,onView:n=>{shown=n;},onState:()=>{},onApplied:()=>{},uuid:()=>id()});
 await ctl.cancel();expect(freeTurnSettled(shown)).toBe(true);
 const again=await f.send({action:'message',text:'Bonjour',context:{tab:'rendez-vous',target:null}});expect(freeTurnSettled(again)).toBe(false);
 expect(readFileSync('src/components/studio/conversation-panel.tsx','utf8')).toContain('{v&&!freeTurnSettled(v)&&');
});
