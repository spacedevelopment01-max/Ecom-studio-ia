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
for(const kind of ['salon','cabinet','restaurant'] as const)it.each(['horizonDays','leadMinutes'] as const)(`${kind} exact %s uses native bounds and changes future availability without rewriting acquired bookings`,async field=>{
 const f=await fixture(kind),rules=rdvRules(f.pid,kind);proCreate(f.pid,kind,{service:rules.services[0].id,staff:rules.staff[0]?.id,modality:'cabinet',date:'2026-11-10',time:'10:00',party:2,firstName:'Alex',lastName:'Fictif',email:'fictif@example.invalid',phone:'0000000000'});
 const table=kind==='restaurant'?'restaurant_reservations':kind+'_appointments',records=all(`SELECT * FROM ${table} WHERE project_id=?`,f.pid),before=currentTheme(f.pid)!,profile=loadProject(f.pid).services,spend=emptySpend(),value=field==='horizonDays'?7:120,input={bookingWindowPatch:{[field]:value}},preview=previewPrestations(f.pid,input);
 expect(currentTheme(f.pid)).toEqual(before);expect((await PUT(f.req({ifVersion:before.version.id,...input}),f.ctx)).status).toBe(200);const expected=structuredClone(before.spec);rdvSection(expected)!.section.settings[field==='horizonDays'?'horizon_days':'lead_minutes']=value;expect(currentTheme(f.pid)!.spec).toEqual(expected);expect(preview.spec).toEqual(expected);expect((await(await GET(f.req(),f.ctx)).json()).bookingWindow[field]).toBe(value);expect(rdvRules(f.pid,kind)[field]).toBe(value);expect(all(`SELECT * FROM ${table} WHERE project_id=?`,f.pid)).toEqual(records);expect(loadProject(f.pid).services).toEqual(profile);expect(emptySpend()).toEqual(spend);expect(currentTheme(f.pid)!.version.number).toBe(before.version.number+1);
 const native=availability(f,field==='horizonDays'?'2026-11-20':'2026-11-05');if(field==='horizonDays')expect(native.status).toBe('beyond');else{const slots='slots' in native?native.slots:native.services.flatMap(s=>s.slots);expect(slots.find(s=>s.time==='09:30')?.available).toBe(false);}
});
it.each([
 ['salon',{leadMinutes:15}],['salon',{leadMinutes:1470}],['cabinet',{leadMinutes:30}],['cabinet',{leadMinutes:2940}],['restaurant',{leadMinutes:10}],['restaurant',{leadMinutes:255}],
 ['salon',{horizonDays:6}],['cabinet',{horizonDays:181}],['restaurant',{horizonDays:7.5}],['salon',{leadMinutes:-30}],['salon',{leadMinutes:'120'}],['salon',{}],['salon',{leadMinutes:120,horizonDays:30}],['salon',{horizonDays:30,activate:true}],
] as const)('%s invalid or rounded window %j is refused without a version',async(kind,patch)=>{const f=await fixture(kind),before=currentTheme(f.pid);expect((await PUT(f.req({ifVersion:before!.version.id,bookingWindowPatch:patch}),f.ctx)).status).toBe(400);expect(currentTheme(f.pid)).toEqual(before);});
it('a window cannot be mixed with other settings or use a stale version',async()=>{const f=await fixture(),before=currentTheme(f.pid)!;expect((await PUT(f.req({ifVersion:before.version.id,bookingWindowPatch:{horizonDays:30},hours:{tue:''}}),f.ctx)).status).toBe(400);expect((await PUT(f.req({ifVersion:'old',bookingWindowPatch:{horizonDays:30}}),f.ctx)).status).toBe(409);expect(currentTheme(f.pid)).toEqual(before);});
