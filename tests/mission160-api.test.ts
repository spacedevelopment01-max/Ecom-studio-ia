import {it,expect,vi,afterEach} from 'vitest';
const session=vi.hoisted(()=>({user:null as any}));
vi.mock('@/lib/auth',async original=>({...await original<typeof import('@/lib/auth')>(),requireUser:async()=>session.user}));
import {clientFixture} from './mission154-fixtures';
import {GET,POST} from '@/app/api/projects/[id]/marketing-strategy/route';
import {POST as build} from '@/app/api/projects/[id]/theme/build/route';
import {activeStrategy} from '@/lib/marketing-strategy';
import {all} from '@/lib/db';
const ctx=(id:string)=>({params:Promise.resolve({id})}) as never;
const request=(b:unknown)=>new Request('http://localhost/test',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)});
afterEach(()=>vi.unstubAllGlobals());
it('API : lire les cinq cartes ne consomme aucun droit ; le serveur refuse la construction avant choix',async()=>{
 vi.stubGlobal('fetch',async()=>{throw Error('Supplier forbidden');});const f=await clientFixture({strategy:null,incomplete:true,plan:'creer'});session.user=f.user;
 const state=await (await GET(new Request('http://localhost/test'),ctx(f.pid))).json();expect(state.angles).toHaveLength(5);expect(state.usedAngleIds).toHaveLength(0);expect(activeStrategy(f.pid)).toBeNull();
 expect((await build(request({direction:'fraise'}),ctx(f.pid))).status).toBe(409);expect(all('SELECT id FROM jobs WHERE project_id=?',f.pid)).toHaveLength(0);
 const prepared=await (await POST(request({action:'prepare',angleId:'generalist'}),ctx(f.pid))).json();
 expect((await POST(request({action:'activate',angleId:'generalist',preparationId:prepared.preparation.id,idempotencyKey:'api-initial-choice',confirmed:true,retainUnaligned:true}),ctx(f.pid))).status).toBe(200);
 expect((await POST(request({action:'prepare',angleId:'expression'}),ctx(f.pid))).status).toBe(402);
 expect(all('SELECT id FROM ai_calls WHERE project_id=?',f.pid)).toHaveLength(0);
});
it('API : double clic concurrent au choix du thème crée exactement une tâche',async()=>{
 const f=await clientFixture({plan:'dominer',incomplete:true});session.user=f.user;
 const responses=await Promise.all([build(request({direction:'traverse'}),ctx(f.pid)),build(request({direction:'traverse'}),ctx(f.pid))]);
 expect(responses.map(r=>r.status)).toEqual([200,200]);const bodies=await Promise.all(responses.map(r=>r.json()));expect(bodies[0].jobId).toBe(bodies[1].jobId);expect(all('SELECT id FROM jobs WHERE project_id=?',f.pid)).toHaveLength(1);
});
it('API : un autre compte ne lit ni ne prépare la stratégie, et ne certifie aucun de ses médias',async()=>{
 const a=await clientFixture({strategy:null,incomplete:true}),b=await clientFixture({strategy:null,incomplete:true});session.user=b.user;
 expect((await GET(new Request('http://localhost/test'),ctx(a.pid))).status).toBe(404);
 expect((await POST(request({action:'prepare',angleId:'usage'}),ctx(a.pid))).status).toBe(404);
});
