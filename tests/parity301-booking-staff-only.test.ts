import {it,expect,vi,beforeEach,afterEach} from 'vitest';
const jar=vi.hoisted(()=>({token:''}));vi.mock('next/headers',()=>({cookies:async()=>({get:()=>jar.token?{value:jar.token}:undefined})}));
import {account,project,emptySpend} from './conversation209-fixtures';
import {GET,PUT} from '@/app/api/projects/[id]/prestations/route';
import {currentTheme,saveThemeVersion,loadProject} from '@/lib/projects';
import {serviceSpec} from './fixtures';
import {all,id,now,run} from '@/lib/db';
import {sha256} from '@/lib/secrets';
beforeEach(()=>{vi.stubGlobal('fetch',vi.fn(()=>{throw Error('NO_PROVIDER');}));});afterEach(()=>{expect(fetch).not.toHaveBeenCalled();vi.unstubAllGlobals();});
const request=(body:unknown)=>new Request('http://localhost/api',{method:'PUT',headers:{origin:'http://localhost','content-type':'application/json'},body:JSON.stringify(body)});
async function fixture(){const u=await account(),pid=project(u,'services');saveThemeVersion(pid,serviceSpec('atelier-nuance' as never),'Réservation fictive','user');jar.token=id();run('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)',sha256(jar.token),u.id,now()+3600000,now());const ctx={params:Promise.resolve({id:pid})},put=(body:unknown)=>PUT(request(body),ctx),read=async()=>{const r=await GET(new Request('http://localhost/api'),ctx);expect(r.status).toBe(200);return r.json();};let native=await read();const seeded=await put({ifVersion:native.versionId,services:[{name:'Diagnostic fictif',duration:30,price:50,category:'coupe'}],staff:[{name:'Alex',title:'Fictif A',skills:[],days:[0]},{name:'Sam',title:'Fictif B',skills:[],days:[1]}]});expect(seeded.status).toBe(200);native=await read();expect(native.services).toHaveLength(1);expect(native.staff).toHaveLength(2);return{u,pid,ctx,put,read,native};}

import {rdvSection} from '@/lib/rendez-vous';
it('a staff-only native PUT persists exactly the requested members and preserves all other source fields',async()=>{
 const f=await fixture(),cur=currentTheme(f.pid)!,spec=structuredClone(cur.spec),section=rdvSection(spec)!.section;
 const service=Object.values(section.blocks!).find(b=>b.type==='service')!;
 service.settings!.duration='';service.settings!.price='';service.settings!.custom_acquired_field='KEEP_EXACT';
 saveThemeVersion(f.pid,spec,'Source acquise atypique','user');
 const before=currentTheme(f.pid)!,native=await f.read(),profile=loadProject(f.pid).services,spend=emptySpend(),versions=all('SELECT id FROM theme_versions WHERE project_id=?',f.pid);
 const staff=[{...native.staff[0],name:'Alex modifié',title:'Responsable fictif',skills:[native.services[0].id],days:[2,4]},{name:'Nouvel intervenant',title:'Fictif',skills:[],days:[1]}];
 const r=await f.put({ifVersion:native.versionId,staff});expect(r.status).toBe(200);
 const after=await f.read();expect(after.staff[0]).toMatchObject(staff[0]);expect(after.staff[1]).toMatchObject(staff[1]);expect(after.staff).toHaveLength(2);expect(after.services).toEqual(native.services);
 const withoutStaff=(value:typeof spec)=>{const copy=structuredClone(value),sec=rdvSection(copy)!.section;for(const [key,b] of Object.entries(sec.blocks!))if(b.type==='member')delete sec.blocks![key];sec.block_order=sec.block_order!.filter(k=>!!sec.blocks![k]);return copy;};
 expect(withoutStaff(currentTheme(f.pid)!.spec)).toEqual(withoutStaff(before.spec));expect(loadProject(f.pid).services).toEqual(profile);expect(emptySpend()).toEqual(spend);expect(all('SELECT id FROM theme_versions WHERE project_id=?',f.pid)).toHaveLength(versions.length+1);
 const unchanged=currentTheme(f.pid);expect((await f.put({ifVersion:native.versionId,staff:[]})).status).toBe(409);expect(currentTheme(f.pid)).toEqual(unchanged);
});
it('an explicit empty staff-only list removes members without removing native services',async()=>{const f=await fixture(),r=await f.put({ifVersion:f.native.versionId,staff:[]});expect(r.status).toBe(200);const after=await f.read();expect(after.staff).toEqual([]);expect(after.services).toEqual(f.native.services);});
it('duplicate member IDs in a staff-only request fail before any native version or spend is created',async()=>{const f=await fixture(),before=currentTheme(f.pid),spend=emptySpend();expect((await f.put({ifVersion:f.native.versionId,staff:[f.native.staff[0],f.native.staff[0]]})).status).toBe(400);expect(currentTheme(f.pid)).toEqual(before);expect(emptySpend()).toEqual(spend);});
