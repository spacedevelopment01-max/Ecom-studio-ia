import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {account,project,emptySpend} from './conversation209-fixtures';
import {serviceSpec} from './fixtures';
const jar=vi.hoisted(()=>({token:''}));vi.mock('next/headers',()=>({cookies:async()=>({get:()=>({value:jar.token})})}));
import {all,id,run,now} from '@/lib/db';
import {sha256} from '@/lib/secrets';
import {POST} from '@/app/api/projects/[id]/rendez-vous/route';
import {currentTheme,saveThemeVersion} from '@/lib/projects';
import {savePrestations,readPrestations} from '@/lib/contenus/prestations';
import {rdvSection} from '@/lib/rendez-vous';
import * as salon from '@/lib/salon/booking';
import * as cabinet from '@/lib/cabinet/booking';
const at=Date.parse('2026-11-05T08:00:00Z'),oldDate='2026-11-10',date='2026-11-11';
beforeEach(()=>{vi.stubGlobal('fetch',vi.fn(()=>{throw Error('NO_PROVIDER');}));vi.spyOn(Date,'now').mockReturnValue(at);});afterEach(()=>{expect(fetch).not.toHaveBeenCalled();vi.unstubAllGlobals();vi.restoreAllMocks();});
async function fixture(kind:'salon'|'cabinet',oldDuration:number){
 const u=await account(),pid=project(u,'services');saveThemeVersion(pid,serviceSpec((kind==='salon'?'atelier-nuance':'parenthese') as never),'Fictif','user');savePrestations(pid,{services:[{name:'Diagnostic',duration:oldDuration,price:50,modes:'cabinet'}],...(kind==='salon'?{staff:[{name:'Camille',days:[],skills:[]}]}:{}),hours:{tue:'09:00-12:00',wed:'09:00-12:00'}});
 const spec=structuredClone(currentTheme(pid)!.spec);Object.assign(rdvSection(spec)!.section.settings,{booking_mode:'live',timezone:'Europe/Paris',slot_step:30,horizon_days:90,lead_minutes:0,cancel_hours:0});saveThemeVersion(pid,spec,'Planning fictif','user');const service=readPrestations(pid)!.services[0].id,staff=kind==='salon'?readPrestations(pid)!.staff[0].id:'';
 function create(day:string,time:string,email:string,length?:string){const contact={firstName:'Alex',lastName:'Fictif',email,phone:'0000000000',terms:true};if(kind==='salon'){const made=salon.createAppointment(pid,{...contact,service,staff,length,date:day,time},at);return{record:made.appointment,token:made.clientToken!};}const made=cabinet.createAppointment(pid,{...contact,kind:'seance',service,modality:'cabinet',date:day,time},at);return{record:made.appointment,token:made.token!};}
 const rows=()=>all<Record<string,unknown>>(`SELECT * FROM ${kind}_appointments WHERE project_id=? ORDER BY number`,pid);
 return{u,pid,kind,service,staff,create,rows};
}
type Fixture=Awaited<ReturnType<typeof fixture>>;
function move(f:Fixture,booking:ReturnType<Fixture['create']>,actor:'client'|'professional',time='09:00'){
 if(f.kind==='salon')return actor==='client'?salon.moveAppointment(f.pid,booking.token,booking.record.number,{date,time},at):salon.proMoveAppointment(f.pid,booking.record.number,{date,time},at);
 return actor==='client'?cabinet.moveAppointment(f.pid,booking.token,{date,time},at):cabinet.proMoveAppointment(f.pid,booking.record.number,{date,time},at);
}
for(const kind of ['salon','cabinet'] as const)for(const actor of ['client','professional'] as const)it.each(['shrink','grow'] as const)(`${kind} ${actor}: a %s in current service duration never changes the actual acquired interval used to validate a move`,async direction=>{
 const oldDuration=direction==='shrink'?60:30,newDuration=direction==='shrink'?30:60,f=await fixture(kind,oldDuration),booking=f.create(oldDate,'10:00','first@example.invalid'),other=f.create(date,'09:30','other@example.invalid');expect(booking.token).toBeTruthy();savePrestations(f.pid,{servicePatch:{id:f.service,duration:newDuration}});const rows=f.rows(),source=currentTheme(f.pid),spend=emptySpend();let error:unknown;try{move(f,booking,actor);}catch(e){error=e;}
 if(direction==='shrink'){expect(f.rows()).toEqual(rows);expect(error).toMatchObject({code:'unavailable',status:409});const alternatives=(error as {details:{alternatives:string[]}}).details.alternatives;expect(alternatives).not.toContain('09:00');}
 else{expect(error).toBeUndefined();expect(f.rows()).toEqual(rows.map(r=>r.number===booking.record.number?{...r,date,start_min:540,end_min:540+oldDuration,updated_at:at}:r));}
 expect(f.rows().find(r=>r.number===other.record.number)).toEqual(rows.find(r=>r.number===other.record.number));expect(currentTheme(f.pid)).toEqual(source);expect(emptySpend()).toEqual(spend);
});

for(const kind of ['salon','cabinet'] as const)it.each(['client','professional'] as const)(`${kind} %s cannot move an acquired hour past closing after the current service shrinks`,async actor=>{const f=await fixture(kind,60),booking=f.create(oldDate,'10:00','first@example.invalid');savePrestations(f.pid,{servicePatch:{id:f.service,duration:30}});const rows=f.rows(),source=currentTheme(f.pid);let error:unknown;try{move(f,booking,actor,'11:30');}catch(e){error=e;}expect(f.rows()).toEqual(rows);expect(error).toMatchObject({code:'unavailable',status:409});expect((error as {details:{alternatives:string[]}}).details.alternatives).not.toContain('11:30');expect(currentTheme(f.pid)).toEqual(source);});
it.each(['client','professional'] as const)('salon %s uses the acquired length duration and price, not the current length offer',async actor=>{
 const f=await fixture('salon',30),spec=structuredClone(currentTheme(f.pid)!.spec),block=Object.values(rdvSection(spec)!.section.blocks!).find(b=>b.type==='service')!;block.settings.short_duration=60;block.settings.short_price=80;saveThemeVersion(f.pid,spec,'Longueur acquise','user');const booking=f.create(oldDate,'10:00','first@example.invalid','short');f.create(date,'09:30','other@example.invalid');expect(booking.record.end_min-booking.record.start_min).toBe(60);expect(booking.record.price).toBe(80);const updated=structuredClone(currentTheme(f.pid)!.spec),service=Object.values(rdvSection(updated)!.section.blocks!).find(b=>b.type==='service')!;service.settings.short_duration=30;service.settings.short_price=100;saveThemeVersion(f.pid,updated,'Offre courante modifiée','user');const rows=f.rows(),source=currentTheme(f.pid);expect(()=>move(f,booking,actor)).toThrow(/unavailable/);expect(f.rows()).toEqual(rows);expect(currentTheme(f.pid)).toEqual(source);
});
it.each(['salon','cabinet'] as const)('%s keeps a known acquired duration movable when its source duration is later cleared, without making new bookings available',async kind=>{
 const f=await fixture(kind,60),booking=f.create(oldDate,'10:00','first@example.invalid'),spec=structuredClone(currentTheme(f.pid)!.spec),block=Object.values(rdvSection(spec)!.section.blocks!).find(b=>b.type===(kind==='salon'?'service':'seance'))!;block.settings.duration='';saveThemeVersion(f.pid,spec,'Valeur acquise effacée','user');const source=currentTheme(f.pid),rows=f.rows();move(f,booking,'professional');expect(f.rows()).toEqual(rows.map(r=>r.number===booking.record.number?{...r,date,start_min:540,end_min:600,updated_at:at}:r));const after=f.rows();expect(()=>f.create('2026-11-12','09:00','new@example.invalid')).toThrow();expect(f.rows()).toEqual(after);expect(currentTheme(f.pid)).toEqual(source);
});
it.each(['salon','cabinet'] as const)('%s owner HTTP refuses an actual overlap with the preserved duration and keeps both bookings exact',async kind=>{
 const f=await fixture(kind,60),booking=f.create(oldDate,'10:00','first@example.invalid');f.create(date,'09:30','other@example.invalid');savePrestations(f.pid,{servicePatch:{id:f.service,duration:30}});jar.token=id();run('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)',sha256(jar.token),f.u.id,now()+3600000,now());const rows=f.rows(),source=currentTheme(f.pid),spend=emptySpend(),r=await POST(new Request('http://localhost/api',{method:'POST',headers:{origin:'http://localhost','content-type':'application/json'},body:JSON.stringify({action:'move',number:booking.record.number,date,time:'09:00'})}),{params:Promise.resolve({id:f.pid})});expect(r.status).toBe(409);expect(f.rows()).toEqual(rows);expect(currentTheme(f.pid)).toEqual(source);expect(emptySpend()).toEqual(spend);
});
