import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {account,project,emptySpend} from './conversation209-fixtures';
import {all,id,now,run} from '@/lib/db';
import {currentTheme,loadProject,saveThemeVersion} from '@/lib/projects';
import {previewPrestations,savePrestations,readPrestations} from '@/lib/contenus/prestations';
import {rdvSection} from '@/lib/rendez-vous';
import {listAppointments} from '@/lib/salon/booking';
import {serviceSpec} from './fixtures';
beforeEach(()=>vi.stubGlobal('fetch',vi.fn(()=>{throw Error('NO_PROVIDER');})));
afterEach(()=>{expect(fetch).not.toHaveBeenCalled();vi.unstubAllGlobals();});
async function fixture(theme='atelier-nuance'){const u=await account(),pid=project(u,'services');saveThemeVersion(pid,serviceSpec(theme as never),'Aperçu fictif','user');return{u,pid};}
const state=(pid:string)=>({project:loadProject(pid),theme:currentTheme(pid),versions:all('SELECT * FROM theme_versions WHERE project_id=? ORDER BY number',pid),spend:emptySpend()});
it.each(['atelier-nuance','parenthese','table-saison'])('native %s preview is deterministic and leaves project/profile/theme/versions/spend untouched',async theme=>{
 const f=await fixture(theme),before=state(f.pid),input={address:'12 rue Fictive, 69000 Lyon',closures:'2027-01-01'},a=previewPrestations(f.pid,input),b=previewPrestations(f.pid,input);
 expect(a).toEqual(b);expect(a.sourceVersionId).toBe(before.theme!.version.id);expect(a.address).toBe(input.address);expect(rdvSection(a.spec)!.section.settings).toMatchObject({address:input.address,closures:input.closures});expect(state(f.pid)).toEqual(before);
 const saved=savePrestations(f.pid,input);expect(currentTheme(f.pid)!.spec).toEqual(a.spec);expect(saved.warnings).toEqual(a.warnings);expect(saved.versionId).not.toBe(a.sourceVersionId);expect(loadProject(f.pid).services.address).toBe(input.address);
});
it('staff-only preview preserves acquired service fields and can be discarded without any mutation',async()=>{const f=await fixture(),native=readPrestations(f.pid)!,before=state(f.pid),a=previewPrestations(f.pid,{staff:[{name:'Alex',title:'Fictif',skills:[],days:[0]}]});expect(rdvSection(a.spec)!.section.blocks).not.toEqual(rdvSection(before.theme!.spec)!.section.blocks);expect(state(f.pid)).toEqual(before);const section=rdvSection(a.spec)!.section;expect(Object.values(section.blocks!).filter(x=>x.type==='service')).toEqual(Object.values(rdvSection(before.theme!.spec)!.section.blocks!).filter(x=>x.type==='service'));expect(readPrestations(f.pid)).toEqual(native);});
it('preview refuses invalid input and duplicate identities without creating a version',async()=>{const f=await fixture(),before=state(f.pid);for(const input of [{hours:{mon:'18:00-09:00'}},{staff:[{id:'same',name:'A'},{id:'same',name:'B'}]}])expect(()=>previewPrestations(f.pid,input)).toThrow();expect(state(f.pid)).toEqual(before);});
it('future confirmed appointments protect deletions and retain their acquired duration and price during preview',async()=>{
 const f=await fixture();savePrestations(f.pid,{services:[{name:'Diagnostic fictif',duration:30,price:50,category:'coupe'}]});listAppointments(f.pid,'2099-01-01','2099-12-31');const native=readPrestations(f.pid)!,service=native.services[0],stamp=now();
 run(`INSERT INTO salon_appointments(id,project_id,number,status,service,service_name,staff,date,start_min,end_min,price,client_id,first_name,last_name,email,phone,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,id(),f.pid,'FICTIF-1','confirmed',service.id,service.name,'fictif','2099-01-01',600,630,50,'fictif','Alex','Fictif','fictif@example.invalid','0000000000',stamp,stamp);
 const before=state(f.pid),appointments=all('SELECT * FROM salon_appointments WHERE project_id=?',f.pid);expect(()=>previewPrestations(f.pid,{services:[]})).toThrow(/rendez-vous à venir/);
 const a=previewPrestations(f.pid,{services:[{...service,duration:60,price:80}]});expect(a.warnings.join(' ')).toMatch(/30 min/);expect(state(f.pid)).toEqual(before);expect(all('SELECT * FROM salon_appointments WHERE project_id=?',f.pid)).toEqual(appointments);
});
it('an independently changed native theme produces a new source token instead of reusing a stale preview',async()=>{const f=await fixture(),a=previewPrestations(f.pid,{address:'Ancienne demande fictive'});savePrestations(f.pid,{closures:'2027-02-01'});const before=state(f.pid),b=previewPrestations(f.pid,{address:'Ancienne demande fictive'});expect(b.sourceVersionId).not.toBe(a.sourceVersionId);expect(rdvSection(b.spec)!.section.settings!.closures).toBe('2027-02-01');expect(state(f.pid)).toEqual(before);});
