import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const jar=vi.hoisted(()=>({token:''}));vi.mock('next/headers',()=>({cookies:async()=>({get:()=>({value:jar.token})})}));
import {account,project,emptySpend} from './conversation209-fixtures';
import {serviceSpec} from './fixtures';
import {id,run,now,all} from '@/lib/db';
import {sha256} from '@/lib/secrets';
import {currentTheme,saveThemeVersion,loadProject} from '@/lib/projects';
import {readPrestations,savePrestations,previewPrestations} from '@/lib/contenus/prestations';
import {rdvSection,rdvRules,proCreate,type RdvKind} from '@/lib/rendez-vous';
import * as salon from '@/lib/salon/booking';
import * as cabinet from '@/lib/cabinet/booking';
import * as restaurant from '@/lib/restaurant/booking';
import {GET,PUT} from '@/app/api/projects/[id]/prestations/route';
const at=Date.parse('2026-11-05T08:00:00Z');
beforeEach(()=>{vi.stubGlobal('fetch',vi.fn(()=>{throw Error('NO_PROVIDER');}));vi.spyOn(Date,'now').mockReturnValue(at);});afterEach(()=>{expect(fetch).not.toHaveBeenCalled();vi.unstubAllGlobals();vi.restoreAllMocks();});
async function fixture(kind:RdvKind='salon'){
 const u=await account(),pid=project(u,'services');saveThemeVersion(pid,serviceSpec(({salon:'atelier-nuance',cabinet:'parenthese',restaurant:'table-saison'}[kind]) as never),'Fictif','user');
 if(kind!=='restaurant')savePrestations(pid,{services:[{name:'Diagnostic',duration:30,price:50,modes:'cabinet'}],...(kind==='salon'?{staff:[{name:'Camille',days:[],skills:[]}]}:{})});
 const spec=structuredClone(currentTheme(pid)!.spec),s=rdvSection(spec)!.section;Object.assign(s.settings,{booking_mode:'live',timezone:'Europe/Paris',horizon_days:90,lead_minutes:0,slot_step:30,open_days:'0,1,2,3,4,5,6',lunch_slots:'09:30,10:00,12:00',dinner_slots:'19:00',min_party:1,max_party:6,capacity:8,opaque_acquired:{keep:true}});for(const day of ['mon','tue','wed','thu','fri','sat','sun'])s.settings['hours_'+day]='09:00-17:00';saveThemeVersion(pid,spec,'Acquis','user');jar.token=id();run('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)',sha256(jar.token),u.id,now()+3600000,now());
 const ctx={params:Promise.resolve({id:pid})},req=(body?:unknown)=>new Request('http://localhost/api',{method:body?'PUT':'GET',headers:{origin:'http://localhost','content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return{u,pid,kind,ctx,req};
}
function availability(f:Awaited<ReturnType<typeof fixture>>,date:string){const rules=rdvRules(f.pid,f.kind);return f.kind==='salon'?salon.availability(f.pid,{date,service:rules.services[0].id,staff:'any'},at):f.kind==='cabinet'?cabinet.availability(f.pid,{date,service:rules.services[0].id,modality:'cabinet'},at):restaurant.availability(f.pid,date,2,at);}
it.each(['salon','cabinet'] as const)('%s exact native slot step changes the offered grid while preserving an acquired half-hour booking',async kind=>{
 const f=await fixture(kind),rules=rdvRules(f.pid,kind);proCreate(f.pid,kind,{service:rules.services[0].id,staff:rules.staff[0]?.id,modality:'cabinet',date:'2026-11-10',time:'09:30',firstName:'Alex',lastName:'Fictif',email:'fictif@example.invalid',phone:'0000000000'});
 const table=kind+'_appointments',records=all(`SELECT * FROM ${table} WHERE project_id=?`,f.pid),before=currentTheme(f.pid)!,spend=emptySpend(),input={bookingWindowPatch:{slotStepMinutes:60}},preview=previewPrestations(f.pid,input);expect(currentTheme(f.pid)).toEqual(before);expect((await PUT(f.req({ifVersion:before.version.id,...input}),f.ctx)).status).toBe(200);
 const expected=structuredClone(before.spec);rdvSection(expected)!.section.settings.slot_step=60;expect(currentTheme(f.pid)!.spec).toEqual(expected);expect(preview.spec).toEqual(expected);expect(rdvRules(f.pid,kind).step).toBe(60);expect((await(await GET(f.req(),f.ctx)).json()).bookingWindow.slotStepMinutes).toBe(60);expect(all(`SELECT * FROM ${table} WHERE project_id=?`,f.pid)).toEqual(records);expect(emptySpend()).toEqual(spend);expect(currentTheme(f.pid)!.version.number).toBe(before.version.number+1);
 const native=kind==='salon'?salon.availability(f.pid,{date:'2026-11-10',service:rules.services[0].id,staff:rules.staff[0].id},at):cabinet.availability(f.pid,{date:'2026-11-10',service:rules.services[0].id,modality:'cabinet'},at);expect(native.slots.slice(0,3).map(s=>s.time)).toEqual(['09:00','10:00','11:00']);expect(native.slots.some(s=>s.time==='09:30')).toBe(false);
 expect(()=>proCreate(f.pid,kind,{service:rules.services[0].id,staff:rules.staff[0]?.id,modality:'cabinet',date:'2026-11-11',time:'09:30',firstName:'Autre',lastName:'Fictif',email:'autre@example.invalid',phone:'0000000000'})).toThrow();expect(all(`SELECT * FROM ${table} WHERE project_id=?`,f.pid)).toEqual(records);
});
it.each([['salon',12],['salon',65],['cabinet',10],['cabinet',20],['cabinet',135],['salon',0],['cabinet',15.5],['salon','30']] as const)('%s invalid/rounded step %s cannot save a version',async(kind,value)=>{const f=await fixture(kind),before=currentTheme(f.pid);expect((await PUT(f.req({ifVersion:before!.version.id,bookingWindowPatch:{slotStepMinutes:value}}),f.ctx)).status).toBe(400);expect(currentTheme(f.pid)).toEqual(before);});
it('restaurant has exact meal slots, not an implicit salon/cabinet step',async()=>{const f=await fixture('restaurant'),before=currentTheme(f.pid);expect((await PUT(f.req({ifVersion:before!.version.id,bookingWindowPatch:{slotStepMinutes:30}}),f.ctx)).status).toBe(409);expect(currentTheme(f.pid)).toEqual(before);});
it('step cannot be mixed with another window rule or use a stale version',async()=>{const f=await fixture(),before=currentTheme(f.pid)!;expect((await PUT(f.req({ifVersion:before.version.id,bookingWindowPatch:{slotStepMinutes:60,horizonDays:30}}),f.ctx)).status).toBe(400);expect((await PUT(f.req({ifVersion:'old',bookingWindowPatch:{slotStepMinutes:60}}),f.ctx)).status).toBe(409);expect(currentTheme(f.pid)).toEqual(before);});
