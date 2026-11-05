import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {account,project,emptySpend} from './conversation209-fixtures';
import {serviceSpec} from './fixtures';
import {all} from '@/lib/db';
import {currentTheme,saveThemeVersion} from '@/lib/projects';
import {readPrestations,savePrestations} from '@/lib/contenus/prestations';
import {rdvSection} from '@/lib/rendez-vous';
import * as salon from '@/lib/salon/booking';
const at=Date.parse('2026-11-05T08:00:00Z');
beforeEach(()=>{vi.stubGlobal('fetch',vi.fn(()=>{throw Error('NO_PROVIDER');}));vi.spyOn(Date,'now').mockReturnValue(at);});afterEach(()=>{expect(fetch).not.toHaveBeenCalled();vi.unstubAllGlobals();vi.restoreAllMocks();});
async function fixture(){const u=await account(),pid=project(u,'services');saveThemeVersion(pid,serviceSpec('atelier-nuance' as never),'Fictif','user');savePrestations(pid,{services:[{name:'Diagnostic',duration:30,price:50}],staff:[{name:'Voisin acquis',days:[],skills:[]}],hours:{tue:'09:00-12:00'}});const spec=structuredClone(currentTheme(pid)!.spec);rdvSection(spec)!.section.settings.booking_mode='live';saveThemeVersion(pid,spec,'Planning fictif','user');return{pid};}
function book(pid:string,staff:string){return salon.createAppointment(pid,{service:salon.salonOf(pid).config.services[0].id,staff,date:'2026-11-10',time:'09:00',firstName:'Alex',lastName:'Fictif',email:'fictif@example.invalid',phone:'0000000000',terms:true},at).appointment;}
it.each(['targeted','whole-list'])('%s creation of Any must select that exact new staff, not the native no-preference sentinel',async mode=>{
 const f=await fixture(),before=currentTheme(f.pid)!,old=readPrestations(f.pid)!.staff[0],spend=emptySpend();
 savePrestations(f.pid,mode==='targeted'?{staffAdd:{name:'Any',days:[],skills:[]}}:{staff:[old,{name:'Any',days:[],skills:[]}]});
 const staff=readPrestations(f.pid)!.staff,added=staff[1],appt=book(f.pid,added.id);expect(appt.staff).toBe(added.id);expect(added.id).toBe('any-2');expect(staff[0]).toEqual(old);expect(currentTheme(f.pid)!.version.number).toBe(before.version.number+1);expect(emptySpend()).toEqual(spend);
});
it('new Any also reserves acquired canonical any-2 and leaves its opaque identity exact',async()=>{
 const f=await fixture(),spec=structuredClone(currentTheme(f.pid)!.spec);Object.values(rdvSection(spec)!.section.blocks!).find(b=>b.type==='member')!.settings.member_id='Any__2';saveThemeVersion(f.pid,spec,'Identité acquise','user');const old=readPrestations(f.pid)!.staff[0];savePrestations(f.pid,{staffAdd:{name:'Any'}});expect(readPrestations(f.pid)!.staff.map(s=>s.id)).toEqual(['Any__2','any-3']);expect(readPrestations(f.pid)!.staff[0]).toEqual(old);
});
it('legacy acquired ANY identity and its native appointment stay exact while a new Any receives a safe ID',async()=>{
 const f=await fixture(),spec=structuredClone(currentTheme(f.pid)!.spec);Object.values(rdvSection(spec)!.section.blocks!).find(b=>b.type==='member')!.settings.member_id='ANY';saveThemeVersion(f.pid,spec,'Identité acquise','user');book(f.pid,'any');const records=all('SELECT * FROM salon_appointments WHERE project_id=?',f.pid),old=readPrestations(f.pid)!.staff[0];savePrestations(f.pid,{staff:[old,{name:'Any'}]});expect(readPrestations(f.pid)!.staff.map(s=>s.id)).toEqual(['ANY','any-2']);expect(readPrestations(f.pid)!.staff[0]).toEqual(old);expect(all('SELECT * FROM salon_appointments WHERE project_id=?',f.pid)).toEqual(records);
});
