import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const jar = vi.hoisted(() => ({ token: '' }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => jar.token ? { value: jar.token } : undefined }) }));
import * as salon from '@/lib/salon/booking';
import * as cabinet from '@/lib/cabinet/booking';
import { account, emptySpend, project, sender } from './conversation209-fixtures';
import { historicalProject } from './conversation284-fixtures';
import { serviceSpec } from './fixtures';
import { all, id, now, run } from '@/lib/db';
import * as db from '@/lib/db';
import { openProjectConversation, conversationView, submitConversation } from '@/lib/orchestrator/conversation';
import { currentTheme, loadProject, saveThemeVersion } from '@/lib/projects';
import { readPrestations, savePrestations } from '@/lib/contenus/prestations';
import { rdvSection, listBookings } from '@/lib/rendez-vous';
import { seedSourcedAnglesForTest } from './sourced-strategy-fixture';
import { stateOf } from '@/lib/preparation/store';
import { projectAccountKey } from '@/lib/project-billing';
import { createCognitiveQuote, confirmCognitiveQuote } from '@/lib/orchestrator/conversation/intelligence';
import { bookingWindowCandidate } from '@/lib/orchestrator/conversation/local-booking-window';
import { studioOperationCatalogue } from '@/lib/orchestrator/conversation/studio-operations';
import { addWordingRule } from '@/lib/client-wording';
import { contextView, submitContext } from '@/lib/orchestrator/conversation/context-session';
import { sha256 } from '@/lib/secrets';
import * as thread from '@/app/api/studio-agent/conversations/[cid]/route';
import { GET as projectGet } from '@/app/api/projects/[id]/route';
import { GET as nativeGet } from '@/app/api/projects/[id]/prestations/route';

beforeEach(() => {
  for (const flag of ['LOT_A', 'AI', 'CONTEXT', 'BOOKING_WINDOW', 'BOOKING_SERVICE_CATALOG', 'BOOKING_SERVICE_TEXT', 'BOOKING_HOURS', 'BOOKING_EDIT', 'BOOKING_CLOSURES', 'BOOKING_STAFF', 'RESTAURANT_SETTINGS', 'SERVICE_PROFILE', 'PAGES', 'SEO', 'STOCK', 'FILES']) vi.stubEnv('STUDIO_CONVERSATION_' + flag, '1');
  vi.stubGlobal('fetch', vi.fn(() => { throw Error('NO_PROVIDER'); }));
});
afterEach(() => { expect(fetch).not.toHaveBeenCalled(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

async function fixture(theme = 'atelier-nuance', prepared = true) {
  const u = await account(), pid = project(u, 'services'), c = openProjectConversation(u, pid);
  saveThemeVersion(pid, serviceSpec(theme as never), 'Source fictive', 'user');
  if (theme !== 'table-saison') savePrestations(pid, { services: [{ name: 'Diagnostic acquis', short: 'Conserver', duration: 30, price: 50 }, { name: 'Voisine acquise', duration: 40, price: 75 }] });
  if(theme==='atelier-nuance')savePrestations(pid,{staff:[{name:'Camille',days:[],skills:[]}]});
  const spec = structuredClone(currentTheme(pid)!.spec), sec = rdvSection(spec)!;
  const neighbour = Object.values(sec.section.blocks ?? {}).find(b => b.settings.name === 'Voisine acquise');
  if (neighbour) { neighbour.settings.duration = ''; neighbour.settings.inconnu = 'CONSERVER'; }
  Object.assign(sec.section.settings,{booking_mode:'live',horizon_days:90,lead_minutes:0,slot_step:30,hours_tue:'09:00-12:00'});
  saveThemeVersion(pid, spec, 'Acquis atypiques', 'user');
  if (prepared) seedSourcedAnglesForTest(pid);
  return { u, pid, c, send: sender(u, c.id), native: readPrestations(pid)! };
}
type Fixture=Awaited<ReturnType<typeof fixture>>;
const phrase='Fixe le pas des créneaux à 60 minutes';
const say=(f:Fixture,text=phrase)=>f.send({action:'message',text,context:{tab:'rendez-vous',target:null}});
const agree=(v:ReturnType<typeof conversationView>)=>({action:'confirm-booking-window',proposalId:v.bookingWindow!.proposalId,confirmation:true,revision:v.revision,projectRevision:v.projectRevision,requestId:id()});
it.each([
 ['atelier-nuance',phrase,60],['parenthese','Peux-tu modifier le pas des créneaux à 45 minutes ?',45],['atelier-nuance','Propose des créneaux toutes les 20 minutes',20],['parenthese','Je voudrais proposer des créneaux toutes les 90 minutes',90],
] as const)('%s natural %s previews cadence, then one free native version and replay',async(theme,text,value)=>{
 const f=await fixture(theme),before=currentTheme(f.pid)!,profile=loadProject(f.pid).services,spend=emptySpend(),p=await say(f,text);expect(p.bookingWindow).toMatchObject({state:'proposed',field:'slotStepMinutes',diff:{before:30,after:value,unit:'minutes'},confirmationRequired:true,financialConsent:false,costEur:0,providerCalls:0});expect(p.bookingWindow!.warnings!.join(' ')).toMatch(/pas la durée/);expect(currentTheme(f.pid)).toEqual(before);expect(p.bookingHours).toBeUndefined();expect(p.serviceProfile).toBeUndefined();
 const cmd=agree(p),done=await submitConversation(f.u,f.c.id,cmd),expected=structuredClone(before.spec);rdvSection(expected)!.section.settings.slot_step=value;expect(currentTheme(f.pid)!.spec).toEqual(expected);expect(readPrestations(f.pid)!.bookingWindow.slotStepMinutes).toBe(value);expect((theme==='atelier-nuance'?salon.salonOf(f.pid).config:cabinet.cabinetOf(f.pid).config).step).toBe(value);expect(done.bookingWindow).toMatchObject({state:'applied',receiptId:cmd.requestId,resultVersionId:currentTheme(f.pid)!.version.id});expect(await submitConversation(f.u,f.c.id,cmd)).toEqual(done);expect(currentTheme(f.pid)!.version.number).toBe(before.version.number+1);expect(loadProject(f.pid).services).toEqual(profile);expect(emptySpend()).toEqual(spend);
});
it.each([['atelier-nuance','Fixe le pas des créneaux à 12 minutes'],['atelier-nuance','Fixe le pas des créneaux à 65 minutes'],['parenthese','Fixe le pas des créneaux à 20 minutes'],['parenthese','Fixe le pas des créneaux à 135 minutes'],['table-saison',phrase],['atelier-nuance','Fixe le pas des créneaux à -1 minute'],['atelier-nuance','Propose des créneaux toutes les 30 minutes et active mes réservations']])('%s invalid/rounded/combined %s clarifies without a new write or quote',async(theme,text)=>{const f=await fixture(theme),before=currentTheme(f.pid),p=await say(f,text);expect(p.bookingWindow).toMatchObject({state:'ambiguous',confirmationRequired:false});expect(currentTheme(f.pid)).toEqual(before);expect(()=>createCognitiveQuote(f.u,f.c.id,{revision:p.revision,projectRevision:p.projectRevision})).toThrow(/parcours gratuit de réservation/);});
it('same native cadence is a no-op and the registry advertises the exact free operation',async()=>{const f=await fixture(),before=currentTheme(f.pid),p=await say(f,phrase.replace('60','30'));expect(p.bookingWindow).toMatchObject({state:'ambiguous',confirmationRequired:false});expect(currentTheme(f.pid)).toEqual(before);expect(studioOperationCatalogue(f.pid,false).rows.find(r=>r.id==='appointments.window')!.supportedActions).toContain('set-exact-native-slot-step-minutes');});
it('outsideQuotes does not treat a quoted cadence sentence as an action',()=>{expect(bookingWindowCandidate('Explique « Propose des créneaux toutes les 30 minutes »')).toBe(false);expect(bookingWindowCandidate('« Fixe le pas des créneaux à 60 minutes »')).toBe(false);});
it('manual acquired hours create a conflict rather than being rebuilt by the cadence proposal',async()=>{const f=await fixture(),p=await say(f);savePrestations(f.pid,{hours:{tue:'10:00-12:00'}});const before=currentTheme(f.pid);await expect(submitConversation(f.u,f.c.id,agree(p))).rejects.toMatchObject({status:409});expect(currentTheme(f.pid)).toEqual(before);});
it('a new half-hour booking acquired after preview stays exact outside the new grid',async()=>{const at=Date.parse('2026-11-05T08:00:00Z');vi.spyOn(Date,'now').mockReturnValue(at);const f=await fixture(),p=await say(f),cfg=salon.salonOf(f.pid).config;salon.createAppointment(f.pid,{service:cfg.services[0].id,staff:cfg.staff[0].id,date:'2026-11-10',time:'09:30',firstName:'Alex',lastName:'Fictif',email:'fictif@example.invalid',phone:'0000000000',terms:true},at);const records=all('SELECT * FROM salon_appointments WHERE project_id=?',f.pid),busy=salon.busyFor(f.pid,'2026-11-10');await submitConversation(f.u,f.c.id,agree(p));expect(all('SELECT * FROM salon_appointments WHERE project_id=?',f.pid)).toEqual(records);expect(salon.busyFor(f.pid,'2026-11-10')).toEqual(busy);expect(salon.availability(f.pid,{date:'2026-11-10',service:cfg.services[0].id,staff:cfg.staff[0].id},at).slots.map(s=>s.time)).toEqual(['09:00','10:00','11:00']);});
it.each(['proposed','cancelled','disabled'])('%s cadence never creates or accepts a stale cognitive quote',async state=>{const f=await fixture(),p=await say(f);if(state==='cancelled')await f.send({action:'cancel-booking-window',proposalId:p.bookingWindow!.proposalId});if(state==='disabled')vi.stubEnv('STUDIO_CONVERSATION_BOOKING_WINDOW','0');const v=conversationView(f.u,f.c.id),spend=emptySpend(),quotes=all('SELECT * FROM agent_conversation_quotes');expect(()=>createCognitiveQuote(f.u,f.c.id,{revision:v.revision,projectRevision:v.projectRevision})).toThrow(/parcours gratuit de réservation/);expect(all('SELECT * FROM agent_conversation_quotes')).toEqual(quotes);const q=id();run('INSERT INTO agent_conversation_quotes(id,conversation_id,revision,project_revision,billing_key,plan_json,created_at) VALUES(?,?,?,?,?,?,?)',q,f.c.id,v.revision,v.projectRevision,f.u.id,'{}',now());expect(()=>confirmCognitiveQuote(f.u,f.c.id,q,id())).toThrow(/parcours gratuit de réservation/);expect(emptySpend()).toEqual(spend);});
it('cadence receipt failure rolls back the native setting and a legitimate retry saves once',async()=>{const f=await fixture(),p=await say(f),cmd=agree(p),before=currentTheme(f.pid),original=db.run,spy=vi.spyOn(db,'run').mockImplementation((sql,...args)=>{if(sql.includes('INSERT INTO agent_conversation_turns'))throw Error('step_receipt_failure');return original(sql,...args);});await expect(submitConversation(f.u,f.c.id,cmd)).rejects.toThrow(/step_receipt_failure/);spy.mockRestore();expect(currentTheme(f.pid)).toEqual(before);const done=await submitConversation(f.u,f.c.id,cmd);expect(await submitConversation(f.u,f.c.id,cmd)).toEqual(done);expect(currentTheme(f.pid)!.version.number).toBe(before!.version.number+1);});
it('historical A1 has no inferred cadence write permission',async()=>{const old=await historicalProject('services'),c=openProjectConversation(old.u,old.pid),before=loadProject(old.pid),p=await sender(old.u,c.id)({action:'message',text:phrase,context:{tab:'rendez-vous',target:null}});expect(p.bookingWindowExecution).toBeUndefined();expect(loadProject(old.pid)).toEqual(before);expect(stateOf(old.pid)).toBeNull();});
it('HTTP after real 17 seconds/project refresh keeps cadence preview, literal agreement and one native saved result',async()=>{
 const f=await fixture(),before=currentTheme(f.pid)!,spend=emptySpend(),v=conversationView(f.u,f.c.id);jar.token=id();run('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)',sha256(jar.token),f.u.id,now()+3600000,now());const ctx={params:Promise.resolve({cid:f.c.id})},req=(body?:unknown)=>new Request('http://localhost/api',{method:body?'POST':'GET',headers:{origin:'http://localhost','content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const r=await thread.POST(req({action:'message',text:phrase,context:{tab:'rendez-vous',target:null},revision:v.revision,projectRevision:v.projectRevision,requestId:id()}),ctx);expect(r.status).toBe(200);const p=await r.json();expect(p.bookingWindow).toMatchObject({state:'proposed',field:'slotStepMinutes'});const{waitAtLeast}=await import('../scripts/lot9/wait-at-least');expect(await waitAtLeast(17000,ms=>new Promise(resolve=>setTimeout(resolve,ms)))).toBeGreaterThanOrEqual(17000);expect((await projectGet(req(),{params:Promise.resolve({id:f.pid})})).status).toBe(200);expect((await(await thread.GET(req(),ctx)).json()).bookingWindow).toEqual(p.bookingWindow);expect(currentTheme(f.pid)).toEqual(before);
 const cmd=agree(p);for(const confirmation of [false,undefined,'true'])expect((await thread.POST(req({...cmd,confirmation,requestId:id()}),ctx)).status).toBe(400);const saved=await thread.POST(req(cmd),ctx);expect(saved.status).toBe(200);const done=await saved.json();expect(done.bookingWindow).toMatchObject({state:'applied',receiptId:cmd.requestId});expect((await(await nativeGet(req(),{params:Promise.resolve({id:f.pid})})).json()).bookingWindow.slotStepMinutes).toBe(60);expect(await(await thread.POST(req(cmd),ctx)).json()).toEqual(done);expect(all('SELECT * FROM agent_conversation_turns WHERE conversation_id=? AND request_id=?',f.c.id,cmd.requestId)).toHaveLength(1);expect(currentTheme(f.pid)!.version.number).toBe(before.version.number+1);expect(emptySpend()).toEqual(spend);
});
