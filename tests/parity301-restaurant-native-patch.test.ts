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
async function fixture(theme="atelier-nuance"){const u=await account(),pid=project(u,'services');saveThemeVersion(pid,serviceSpec(theme as never),'Réservation fictive','user');jar.token=id();run('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)',sha256(jar.token),u.id,now()+3600000,now());const ctx={params:Promise.resolve({id:pid})},put=(body:unknown)=>PUT(request(body),ctx),read=async()=>{const r=await GET(new Request('http://localhost/api'),ctx);expect(r.status).toBe(200);return r.json();};let native=await read();if(theme==='table-saison')return{u,pid,ctx,put,read,native};const seeded=await put({ifVersion:native.versionId,services:[{name:'Diagnostic fictif',duration:30,price:50,category:'coupe'}],staff:[{name:'Alex',title:'Fictif A',skills:[],days:[0]},{name:'Sam',title:'Fictif B',skills:[],days:[1]}]});expect(seeded.status).toBe(200);native=await read();expect(native.services).toHaveLength(1);expect(native.staff).toHaveLength(2);return{u,pid,ctx,put,read,native};}


import {restaurantOf} from '@/lib/restaurant/booking';
import {rdvSection} from '@/lib/rendez-vous';
it('closing all native restaurant days must really close Sunday too',async()=>{const f=await fixture('table-saison'),r=await f.put({ifVersion:f.native.versionId,restaurant:{...f.native.restaurant,openDays:[]}});expect(r.status).toBe(200);expect((await f.read()).restaurant.openDays).toEqual([]);expect(restaurantOf(f.pid).config.openDays).toEqual([]);});
it('a targeted lunch-slot PUT changes only the native lunch field, preserving unknown acquired neighbour values',async()=>{const f=await fixture('table-saison'),spec=structuredClone(currentTheme(f.pid)!.spec),sec=rdvSection(spec)!.section;sec.settings!.capacity='';sec.settings!.custom_acquired='KEEP';saveThemeVersion(f.pid,spec,'Source fictive atypique','user');const before=currentTheme(f.pid)!,r=await f.put({ifVersion:before.version.id,restaurantPatch:{lunchSlots:'12:15, 13:00'}});expect(r.status).toBe(200);const expected=structuredClone(before.spec);rdvSection(expected)!.section.settings!.lunch_slots='12:15, 13:00';expect(currentTheme(f.pid)!.spec).toEqual(expected);expect((await f.read()).restaurant.lunchSlots).toBe('12:15, 13:00');});
it.each([{lunchSlots:'12:99'},{dinnerSlots:'24:00'},{openDays:[7]},{capacity:100},{}])('rejects an invalid or unbounded native targeted patch atomically: %s',async patch=>{const f=await fixture('table-saison'),before=currentTheme(f.pid),r=await f.put({ifVersion:f.native.versionId,restaurantPatch:patch});expect(r.status).toBe(400);expect(currentTheme(f.pid)).toEqual(before);});
it('a targeted restaurant edit cannot silently succeed on a salon or mix with full replacement',async()=>{const f=await fixture(),before=currentTheme(f.pid);expect((await f.put({ifVersion:f.native.versionId,restaurantPatch:{lunchSlots:'12:15'}})).status).toBe(409);expect(currentTheme(f.pid)).toEqual(before);const r=await fixture('table-saison'),restaurantBefore=currentTheme(r.pid);expect((await r.put({ifVersion:r.native.versionId,restaurant:r.native.restaurant,restaurantPatch:{lunchSlots:'12:15'}})).status).toBe(400);expect(currentTheme(r.pid)).toEqual(restaurantBefore);});
import fs from 'node:fs';
import vm from 'node:vm';
import {core} from '@/lib/restaurant/booking';
it('the actual public restaurant rules also keep an explicitly empty week closed',()=>{const source=fs.readFileSync('theme-base/assets/table-saison.js','utf8'),start=source.indexOf('function rules() {'),end=source.indexOf('function partyText',start),rules=source.slice(start,end).trim(),config=vm.runInNewContext('('+rules+')()',{core:()=>core,CFG:{openDays:'',timezone:'Europe/Paris',services:[]}});expect(config.openDays).toEqual([]);});
