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

it.each(['09:90-18:00','09:00-17:99'])('rejects impossible native opening hours without saving a version: %s',async hours=>{const f=await fixture(),before=currentTheme(f.pid),spend=emptySpend(),r=await f.put({ifVersion:f.native.versionId,hours:{tue:hours}});expect(r.status).toBe(400);expect(currentTheme(f.pid)).toEqual(before);expect(emptySpend()).toEqual(spend);});
it.each(['12:99','99:00'])('rejects impossible restaurant start slots before saving: %s',async slots=>{const f=await fixture('table-saison'),before=currentTheme(f.pid),spend=emptySpend(),r=await f.put({ifVersion:f.native.versionId,restaurant:{...f.native.restaurant,lunchSlots:slots}});expect(r.status).toBe(400);expect(currentTheme(f.pid)).toEqual(before);expect(emptySpend()).toEqual(spend);});
it.each(['00:00-24:00','09:00-12:00, 14:00-18:00',''])('keeps valid native opening hours and an explicit closed day: %s',async hours=>{const f=await fixture(),r=await f.put({ifVersion:f.native.versionId,hours:{tue:hours}});expect(r.status).toBe(200);expect((await f.read()).hours.tue).toBe(hours);});
