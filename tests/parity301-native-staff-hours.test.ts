import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const jar=vi.hoisted(()=>({token:''}));vi.mock('next/headers',()=>({cookies:async()=>({get:()=>({value:jar.token})})}));
import {account,project,emptySpend} from './conversation209-fixtures';
import {serviceSpec} from './fixtures';
import {id,run,now,all} from '@/lib/db';
import {sha256} from '@/lib/secrets';
import {currentTheme,saveThemeVersion,loadProject} from '@/lib/projects';
import {readPrestations,savePrestations,previewPrestations} from '@/lib/contenus/prestations';
import {rdvSection} from '@/lib/rendez-vous';
import * as salon from '@/lib/salon/booking';
import {GET,PUT} from '@/app/api/projects/[id]/prestations/route';
const at=Date.parse('2026-11-05T08:00:00Z');
beforeEach(()=>{vi.stubGlobal('fetch',vi.fn(()=>{throw Error('NO_PROVIDER');}));vi.spyOn(Date,'now').mockReturnValue(at);});
afterEach(()=>{expect(fetch).not.toHaveBeenCalled();vi.unstubAllGlobals();vi.restoreAllMocks();});
async function fixture(theme='atelier-nuance'){
 const u=await account(),pid=project(u,'services');saveThemeVersion(pid,serviceSpec(theme as never),'Source fictive','user');
 if(theme==='atelier-nuance')savePrestations(pid,{services:[{name:'Diagnostic',duration:30,price:50,category:'coupe'}],staff:[{name:'Camille',days:[],skills:[]},{name:'Sam',days:[],skills:[]}],hours:{fri:'09:00-12:00, 14:00-22:00'}});
 const spec=structuredClone(currentTheme(pid)!.spec),sec=rdvSection(spec)!.section;sec.settings.booking_mode='live';
 if(theme==='atelier-nuance'){const members=Object.values(sec.blocks!).filter(b=>b.type==='member');members[0].settings.hours='10:00-17:00';members[0].settings.opaque={keep:true};members[1].settings.hours='';}
 saveThemeVersion(pid,spec,'Acquis fictifs','user');jar.token=id();run('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)',sha256(jar.token),u.id,now()+3600000,now());
 const ctx={params:Promise.resolve({id:pid})},req=(body?:unknown)=>new Request('http://localhost/api',{method:body?'PUT':'GET',headers:{origin:'http://localhost','content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return{pid,u,ctx,req,staff:readPrestations(pid)!.staff[0]};
}
it.each(['10:00-12:00, 14:00-16:00','20:00-22:00','00:00-24:00',''])('exact staff hours %s preview without write, PUT/readback, unchanged neighbours/profile/appointments',async hours=>{
 const f=await fixture(),before=currentTheme(f.pid)!,profile=loadProject(f.pid).services,spend=emptySpend(),cfg=salon.salonOf(f.pid).config;
 salon.createAppointment(f.pid,{service:cfg.services[0].id,staff:cfg.staff[0].id,date:'2026-11-20',time:'10:00',firstName:'Alex',lastName:'Fictif',email:'fictif@example.invalid',phone:'0000000000',terms:true},at);
 const records=all('SELECT * FROM salon_appointments WHERE project_id=?',f.pid),input={staffPatch:{id:f.staff.id,hours}},preview=previewPrestations(f.pid,input);expect(currentTheme(f.pid)).toEqual(before);
 expect((await PUT(f.req({ifVersion:before.version.id,...input}),f.ctx)).status).toBe(200);
 const expected=structuredClone(before.spec),target=Object.values(rdvSection(expected)!.section.blocks!).find(b=>b.type==='member'&&b.settings.member_id===f.staff.id)!;target.settings.hours=hours;
 expect(currentTheme(f.pid)!.spec).toEqual(expected);expect(preview.spec).toEqual(expected);expect(currentTheme(f.pid)!.version.number).toBe(before.version.number+1);
 expect((await(await GET(f.req(),f.ctx)).json()).staff[0]).toMatchObject({id:f.staff.id,hours});expect(all('SELECT * FROM salon_appointments WHERE project_id=?',f.pid)).toEqual(records);expect(loadProject(f.pid).services).toEqual(profile);expect(emptySpend()).toEqual(spend);
 const current=salon.salonOf(f.pid).config,slots=salon.core.slotsFor(current,{date:'2026-11-20',service:cfg.services[0].id,staff:f.staff.id,busy:{}},at);
 const times=slots.filter(s=>s.available).map(s=>s.time);
 if(hours==='20:00-22:00')expect(times).toEqual(['20:00','20:30','21:00','21:30']);
 if(hours==='')expect(times).toContain('09:00');
 if(hours==='00:00-24:00'){expect(times).toContain('09:00');expect(times).toContain('21:30');expect(times).not.toContain('23:00');}
 if(hours.startsWith('10:00')){expect(times).toEqual(['10:00','10:30','11:00','11:30','14:00','14:30','15:00','15:30']);}
});
it.each(['09:60-12:00','24:00-24:00','22:00-20:00','09:00-24:01','9:00-17:00','fermé','09:00-12:00,garbage'])('invalid hours %s cannot save a version',async hours=>{
 const f=await fixture(),before=currentTheme(f.pid);expect((await PUT(f.req({ifVersion:before!.version.id,staffPatch:{id:f.staff.id,hours}}),f.ctx)).status).toBe(400);expect(currentTheme(f.pid)).toEqual(before);
});
it.each(['parenthese','table-saison'])('%s cannot redirect staff hours to global booking hours',async theme=>{const f=await fixture(theme),before=currentTheme(f.pid);expect((await PUT(f.req({ifVersion:before!.version.id,staffPatch:{id:'camille',hours:'10:00-17:00'}}),f.ctx)).status).toBe(409);expect(currentTheme(f.pid)).toEqual(before);});
it('unknown or stale staff never modifies a neighbour',async()=>{const f=await fixture(),before=currentTheme(f.pid)!;expect((await PUT(f.req({ifVersion:before.version.id,staffPatch:{id:'absent',hours:'10:00-12:00'}}),f.ctx)).status).toBe(409);expect((await PUT(f.req({ifVersion:'old',staffPatch:{id:f.staff.id,hours:'10:00-12:00'}}),f.ctx)).status).toBe(409);expect(currentTheme(f.pid)).toEqual(before);});
