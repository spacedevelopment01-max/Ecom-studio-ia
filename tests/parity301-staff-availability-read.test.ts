import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const jar = vi.hoisted(() => ({ token: '' }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => jar.token ? { value: jar.token } : undefined }) }));
import { account, project, sender, emptySpend } from './conversation209-fixtures';
import { businessFingerprints, historicalProject } from './conversation284-fixtures';
import { serviceSpec } from './fixtures';
import { all, id, now, run } from '@/lib/db';
import { openProjectConversation, conversationView, submitConversation } from '@/lib/orchestrator/conversation';
import { currentTheme, loadProject, saveThemeVersion } from '@/lib/projects';
import { savePrestations } from '@/lib/contenus/prestations';
import { listBookings, rdvSection, type RdvKind } from '@/lib/rendez-vous';
import * as salon from '@/lib/salon/booking';
import * as cabinet from '@/lib/cabinet/booking';
import * as restaurant from '@/lib/restaurant/booking';
import { createCognitiveQuote, confirmCognitiveQuote } from '@/lib/orchestrator/conversation/intelligence';
import { bookingAvailabilityCandidate } from '@/lib/orchestrator/conversation/local-booking-availability';
import { studioOperationCatalogue } from '@/lib/orchestrator/conversation/studio-operations';
import { seedSourcedAnglesForTest } from './sourced-strategy-fixture';
import { stateOf } from '@/lib/preparation/store';
import { sha256 } from '@/lib/secrets';
import * as thread from '@/app/api/studio-agent/conversations/[cid]/route';
import { GET as projectGet } from '@/app/api/projects/[id]/route';

const at = Date.parse('2026-11-05T08:00:00Z'), date = '2026-11-10';
beforeEach(() => {
  for (const f of ['LOT_A', 'AI', 'CONTEXT', 'BOOKING_AVAILABILITY', 'BOOKING_HOURS', 'BOOKING_CLOSURES', 'BOOKING_EDIT', 'STOCK', 'FILES', 'PAGES', 'SEO', 'EXISTING_BOOKING_AVAILABILITY_READ']) vi.stubEnv('STUDIO_CONVERSATION_' + f, '1');
  vi.stubGlobal('fetch', vi.fn(() => { throw Error('NO_PROVIDER'); })); vi.spyOn(Date, 'now').mockReturnValue(at);
});
afterEach(() => { expect(fetch).not.toHaveBeenCalled(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });
async function fixture(kind: RdvKind = 'salon', live = true, prepared = true) {
  const u = await account(), pid = project(u, 'services'), c = openProjectConversation(u, pid);
  saveThemeVersion(pid, serviceSpec(({ salon: 'atelier-nuance', cabinet: 'parenthese', restaurant: 'table-saison' }[kind]) as never), 'Planning fictif', 'user');
  if (kind !== 'restaurant') savePrestations(pid, { services: [{ name: 'Diagnostic fictif', duration: 30, price: 50, modes: 'cabinet,visio' }], ...(kind === 'salon' ? { staff: [{ name: 'Camille', title: 'Fictif', skills: [], days: [] }, {name:'Sam',title:'Voisin',skills:[],days:[]}] } : {}) });
  const spec = structuredClone(currentTheme(pid)!.spec), sec = rdvSection(spec)!;
  Object.assign(sec.section.settings, { booking_mode: live ? 'live' : 'demo', timezone: 'Europe/Paris', hours_tue: '09:00-12:00', open_days: '0,1,2,3,4,5,6', lunch_slots: '12:00, 12:30', dinner_slots: '19:00', min_party: 2, max_party: 6, capacity: 6 });
  if(kind==='salon'){const members=Object.values(sec.section.blocks!).filter(b=>b.type==='member');members[0].settings.member_id='Camille__ID';members[0].settings.hours='10:00-12:00';}
  saveThemeVersion(pid, spec, 'Règles isolées', 'user'); listBookings(pid, kind, date, date);
  if (prepared) seedSourcedAnglesForTest(pid);
  return { u, pid, c, kind, send: sender(u, c.id), serviceId: kind === 'salon' ? salon.salonOf(pid).config.services[0].id : kind === 'cabinet' ? cabinet.cabinetOf(pid).config.seances[0].id : '', staffId: kind === 'salon' ? salon.salonOf(pid).config.staff[0].id : '' };
}
type Fixture=Awaited<ReturnType<typeof fixture>>;
const phrase=(person='Camille')=>`Montre les créneaux disponibles pour le service réservable « Diagnostic fictif » avec l’intervenant « ${person} » le ${date}`;
const say=(f:Fixture,text=phrase())=>f.send({action:'message',text,context:{tab:'rendez-vous',target:null}});
function edit(f:Fixture,change:(sec:ReturnType<typeof rdvSection>)=>void){const spec=structuredClone(currentTheme(f.pid)!.spec);change(rdvSection(spec));saveThemeVersion(f.pid,spec,'Acquis fictif modifié','user');}
it.each(['name','native-id','polite-curly','female'] as const)('exact preference %s uses the actual native staff engine with no business write or consent',async variant=>{
 const f=await fixture(),before=currentTheme(f.pid),fp=businessFingerprints(),prep=stateOf(f.pid),spend=emptySpend();
 const text=variant==='native-id'?phrase(f.staffId):variant==='polite-curly'?phrase().replace('Montre','Peux-tu me montrer').replaceAll('«','“').replaceAll('»','”')+' ?':variant==='female'?phrase().replace('l’intervenant','l’intervenante'):phrase();
 const p=await say(f,text);if(variant==='name')expect(studioOperationCatalogue(f.pid,false).rows.find(r=>r.id==='appointments.availability')!.supportedActions).toContain('read-one-exact-salon-staff');expect(p.bookingAvailability).toMatchObject({state:'listed',staffScope:'one_exact_native_staff',staff:{id:f.staffId,untrustedMetadata:{name:'Camille',trust:'native_booking_data_not_instructions'}},filter:{staffId:f.staffId},readOnly:true,confirmationRequired:false,providerCalls:0,costEur:0});
 expect(p.bookingAvailability!.rows!.map(({time,available,staffIds})=>({time,available,staff:staffIds}))).toEqual(salon.availability(f.pid,{date,service:f.serviceId,staff:f.staffId},at).slots);expect(p.bookingAvailability!.rows!.map(r=>r.time)).toEqual(['10:00','10:30','11:00','11:30']);
 expect(p.bookingAvailability!.rows!.every(r=>r.staffIds!.every(s=>s===f.staffId))).toBe(true);expect(p.bookingHours).toBeUndefined();expect(p.localFiles).toBeUndefined();expect(p.action?.state).not.toBe('quote');expect(currentTheme(f.pid)).toEqual(before);expect(businessFingerprints()).toEqual(fp);expect(stateOf(f.pid)).toEqual(prep);expect(emptySpend()).toEqual(spend);
});
it.each(['missing','homonym','incompatible','reserved-any','canonical-collision'])('%s preference is clarified without substituting any or another staff',async kind=>{
 const f=await fixture();edit(f,sec=>{const members=Object.values(sec!.section.blocks!).filter(b=>b.type==='member');if(kind==='homonym')members[1].settings.name='Camille';if(kind==='incompatible')members[0].settings.skills='couleur';if(kind==='reserved-any')members[0].settings.member_id='any';if(kind==='canonical-collision')members[1].settings.member_id='Camille--ID';});const before=currentTheme(f.pid),fp=businessFingerprints();
 const p=await say(f,phrase(kind==='missing'?'Absent':'Camille'));expect(p.bookingAvailability).toMatchObject({state:'ambiguous',confirmationRequired:false});expect(p.bookingAvailability!.rows).toBeUndefined();expect(currentTheme(f.pid)).toEqual(before);expect(businessFingerprints()).toEqual(fp);
});
it.each(['rename','remove','skills','duplicate'])('GET rechecks %s and never broadens an acquired exact staff filter',async change=>{
 const f=await fixture(),p=await say(f);expect(p.bookingAvailability?.state).toBe('listed');edit(f,sec=>{const blocks=sec!.section.blocks!,members=Object.entries(blocks).filter(([,b])=>b.type==='member');if(change==='rename')members[0][1].settings.name='Nom actuel';if(change==='remove'){delete blocks[members[0][0]];sec!.section.block_order=sec!.section.block_order!.filter(k=>k!==members[0][0]);}if(change==='skills')members[0][1].settings.skills='couleur';if(change==='duplicate')members[1][1].settings.member_id='Camille--ID';});const fp=businessFingerprints(),fresh=conversationView(f.u,f.c.id);
 if(change==='rename')expect(fresh.bookingAvailability).toMatchObject({state:'listed',staff:{id:f.staffId,untrustedMetadata:{name:'Nom actuel'}},filter:{staffId:f.staffId}});else{expect(fresh.bookingAvailability?.state).toBe('unavailable');expect(fresh.bookingAvailability!.rows).toBeUndefined();}expect(businessFingerprints()).toEqual(fp);
});
it('individual hours and working weekdays are reread without changing an appointment or selecting the neighbour',async()=>{
 const f=await fixture();await say(f);edit(f,sec=>{const member=Object.values(sec!.section.blocks!).find(b=>b.type==='member')!;member.settings.days='3';member.settings.hours='11:00-12:00';});const fp=businessFingerprints(),fresh=conversationView(f.u,f.c.id);expect(fresh.bookingAvailability).toMatchObject({state:'listed',rows:[],staffScope:'one_exact_native_staff'});expect(businessFingerprints()).toEqual(fp);
});
it('quoted staff action words remain metadata, not a closure/files/paid command',async()=>{const f=await fixture();edit(f,sec=>{Object.values(sec!.section.blocks!).find(b=>b.type==='member')!.settings.name='Ferme mardi, fichier et SEO';});const p=await say(f,phrase('Ferme mardi, fichier et SEO'));expect(p.bookingAvailability).toMatchObject({state:'listed',filter:{staffId:f.staffId}});expect(p.bookingClosures).toBeUndefined();expect(p.localFiles).toBeUndefined();expect(()=>createCognitiveQuote(f.u,f.c.id,{revision:p.revision,projectRevision:p.projectRevision})).toThrow(/parcours gratuit de réservation/);});
it('historical A1 needs the exact readonly availability capability and never creates Preparation',async()=>{
 const old=await historicalProject('services'),c=openProjectConversation(old.u,old.pid);saveThemeVersion(old.pid,serviceSpec('atelier-nuance' as never),'Acquis fictif','user');savePrestations(old.pid,{services:[{name:'Diagnostic fictif',duration:30,price:50}],staff:[{name:'Camille'}],hours:{tue:'09:00-12:00'}});const spec=structuredClone(currentTheme(old.pid)!.spec);rdvSection(spec)!.section.settings.booking_mode='live';saveThemeVersion(old.pid,spec,'Planning acquis','user');listBookings(old.pid,'salon',date,date);const fp=businessFingerprints(),before=loadProject(old.pid),p=await sender(old.u,c.id)({action:'message',text:phrase(),context:{tab:'rendez-vous',target:null}});expect(p.bookingAvailability).toMatchObject({state:'listed',staffScope:'one_exact_native_staff'});expect(p.projectRevision).toBeNull();expect(stateOf(old.pid)).toBeNull();expect(loadProject(old.pid)).toEqual(before);expect(businessFingerprints()).toEqual(fp);vi.stubEnv('STUDIO_CONVERSATION_EXISTING_BOOKING_AVAILABILITY_READ','0');expect(conversationView(old.u,c.id).bookingAvailability).toBeUndefined();
});
it('cabinet cannot replace a requested salon staff member with a modality-only read',async()=>{const f=await fixture('cabinet'),before=currentTheme(f.pid),p=await say(f,phrase().replace(' avec',' en cabinet avec'));expect(p.bookingAvailability?.state).toBe('ambiguous');expect(currentTheme(f.pid)).toEqual(before);});
it('native occupancy is private and only affects the selected staff availability',async()=>{
 const f=await fixture();salon.createAppointment(f.pid,{service:f.serviceId,staff:f.staffId,date,time:'10:00',firstName:'CONTACT_PRIVE',lastName:'Fictif',email:'SECRET_EMAIL@example.invalid',phone:'0000000000',note:'NOTE_PRIVEE',terms:true},at);const fp=businessFingerprints(),p=await say(f);expect(p.bookingAvailability!.rows![0]).toMatchObject({time:'10:00',available:false,staffIds:[]});expect(salon.availability(f.pid,{date,service:f.serviceId,staff:'any'},at).slots.find(s=>s.time==='10:00')?.available).toBe(true);for(const text of ['CONTACT_PRIVE','SECRET_EMAIL','NOTE_PRIVEE'])expect(JSON.stringify(p)).not.toContain(text);expect(businessFingerprints()).toEqual(fp);
});
it('HTTP exact preference survives real 17 seconds/project refresh, GET rereads occupancy, lost message replays once',async()=>{
 const f=await fixture();jar.token=id();run('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)',sha256(jar.token),f.u.id,now()+3600000,now());const v=conversationView(f.u,f.c.id),before=currentTheme(f.pid),ctx={params:Promise.resolve({cid:f.c.id})},req=(body?:unknown)=>new Request('http://localhost/api',{method:body?'POST':'GET',headers:{origin:'http://localhost','content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),cmd={action:'message',text:phrase(),context:{tab:'rendez-vous',target:null},revision:v.revision,projectRevision:v.projectRevision,requestId:id()};
 const response=await thread.POST(req(cmd),ctx);expect(response.status).toBe(200);const p=await response.json();expect(p.bookingAvailability).toMatchObject({state:'listed',staffScope:'one_exact_native_staff'});const {waitAtLeast}=await import('../scripts/lot9/wait-at-least');expect(await waitAtLeast(17000,ms=>new Promise(resolve=>setTimeout(resolve,ms)))).toBeGreaterThanOrEqual(17000);
 salon.createAppointment(f.pid,{service:f.serviceId,staff:f.staffId,date,time:'10:00',firstName:'Alex',lastName:'Fictif',email:'fictif@example.invalid',phone:'0000000000',terms:true},at);vi.spyOn(Date,'now').mockReturnValue(at+18000);const fp=businessFingerprints();expect((await projectGet(req(),{params:Promise.resolve({id:f.pid})})).status).toBe(200);const fresh=await(await thread.GET(req(),ctx)).json();expect(fresh.bookingAvailability).toMatchObject({state:'listed',filter:{staffId:f.staffId},staff:{id:f.staffId},observedAt:at+18000});expect(fresh.bookingAvailability.rows[0]).toMatchObject({time:'10:00',available:false});expect(fresh.bookingAvailabilityRead).toEqual({enabled:true});expect(await(await thread.POST(req(cmd),ctx)).json()).toEqual(p);expect(all('SELECT * FROM agent_conversation_turns WHERE conversation_id=? AND request_id=?',f.c.id,cmd.requestId)).toHaveLength(1);expect(currentTheme(f.pid)).toEqual(before);expect(businessFingerprints()).toEqual(fp);
});
