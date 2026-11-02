/** Ancien accord numérique : il ne constitue pas un devis signé/épinglé. Aucun worker ni fournisseur lancé. */
vi.mock('@/lib/public-download',()=>import('./public-download-double'));
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {beforeEach,afterEach,expect,it,vi}from'vitest';
const baselines=new Map<string,{calls:number;events:number}>();
const session=vi.hoisted(()=>({user:null as any}));
vi.mock('@/lib/auth',async orig=>({...await orig<any>(),currentUser:async()=>session.user,requireUser:async()=>{if(!session.user){const{HttpError}=await orig<any>();throw new HttpError(401,'Connexion requise');}return session.user;}}));
vi.mock('@/lib/ai/access',async orig=>({...await orig<any>(),aiActiveFor:()=>true}));
vi.mock('@/lib/social-v2/ai-post',async orig=>({...await orig<any>(),publicationReadiness:vi.fn(async()=>({ready:true,mode:'two_step'}))}));
import{createUser}from'@/lib/auth';
import{saveAsset,getAsset,assetData,assetMeta}from'@/lib/library';
import{all,one}from'@/lib/db';
import{seedImageFixture}from'./image-v2-fixtures';
import{grantProjectPlan}from'./communication-choice-fixture';
import{POST}from'@/app/api/projects/[id]/creative/image/[assetId]/route';
import{publicationReadiness}from'@/lib/social-v2/ai-post';
beforeEach(()=>{vi.stubGlobal('fetch',vi.fn(()=>{throw Error('External HTTP forbidden');}));vi.mocked(publicationReadiness).mockClear();});
afterEach(()=>vi.unstubAllGlobals());
async function fixture(role:'client'|'admin'='client'){
 const u=await createUser(`creative-consent-${crypto.randomUUID()}@example.invalid`,'synthetic-only','Test');session.user={...u,role};const pid=seedImageFixture(u.id,'restaurant');grantProjectPlan(pid,'dominer');
 const data=await sharp({create:{width:100,height:100,channels:3,background:'#abc'}}).png().toBuffer(),a=await saveAsset({userId:u.id,projectId:pid,data,name:'synthetic.png',mime:'image/png',origin:'generated',meta:{aiPost:{request:'Texte acquis à conserver'},aiAd:true,gate:{verdict:'FINAL'}}});
 const post=(body:unknown,target=pid,aid=a.id,origin='http://localhost')=>POST(new Request(`http://localhost/api/projects/${target}/creative/image/${aid}`,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)}),{params:Promise.resolve({id:target,assetId:aid})});baselines.set(pid,{calls:one<{n:number}>('SELECT COUNT(*) n FROM ai_calls WHERE project_id=?',pid)!.n,events:one<{n:number}>('SELECT COUNT(*) n FROM usage_events WHERE project_id=?',pid)!.n});return{u,pid,a,data,post};
}
function noPaid(pid:string){expect(all('SELECT id FROM jobs WHERE project_id=?',pid)).toHaveLength(0);expect(one<{n:number}>('SELECT COUNT(*) n FROM ai_calls WHERE project_id=?',pid)!.n).toBe(baselines.get(pid)!.calls);expect(one<{n:number}>('SELECT COUNT(*) n FROM usage_events WHERE project_id=?',pid)!.n).toBe(baselines.get(pid)!.events);expect(fetch).not.toHaveBeenCalled();expect(publicationReadiness).not.toHaveBeenCalled();}
it.each(['client','admin']as const)('quote %s annonce blocage explicite, pas une recomposition gratuite',async role=>{const f=await fixture(role),r=await f.post({action:'quote',aspect:'4:5'});expect(r.status).toBe(200);expect(await r.json()).toMatchObject({ai:false,estimateMicro:0,pct:0,consentBlocked:true,reason:expect.stringMatching(/devis|quote/)});noPaid(f.pid);});
it.each([undefined,0,350880,9000000000000])('redo montant %s ne suffit pas à autoriser une nouvelle dépense',async approvedEstimateMicro=>{const f=await fixture(),r=await f.post({action:'redo',aspect:'4:5',instruction:'Changer seulement la lumière',approvedEstimateMicro,operationId:crypto.randomUUID()});expect(r.status).toBe(409);expect(await r.json()).toMatchObject({code:'image_edit_complex_consent_unavailable'});expect(assetData(getAsset(f.a.id)!).equals(f.data)).toBe(true);noPaid(f.pid);});
it('session, CSRF, mauvais projet/source et schéma restent gardés avant le contrat',async()=>{const f=await fixture();expect((await f.post({action:'redo',aspect:'4:5'},f.pid,f.a.id,'https://foreign.invalid')).status).toBe(403);expect((await f.post({action:'redo',aspect:'invalid'})).status).toBe(400);expect((await f.post({action:'redo',aspect:'4:5'},f.pid,'missing')).status).toBe(404);const other=await createUser(`foreign-${crypto.randomUUID()}@example.invalid`,'synthetic-only','Other'),pid=seedImageFixture(other.id,'restaurant');expect((await f.post({action:'redo',aspect:'4:5'},pid)).status).toBe(404);session.user=null;expect((await f.post({action:'quote',aspect:'4:5'})).status).toBe(401);noPaid(f.pid);});
it('reformatage local acquis gratuit : pixels centraux/source/texte et reload conservés, état aperçu transparent',async()=>{const f=await fixture();session.user={...f.u,role:'admin'};const r=await f.post({action:'reformat',aspect:'4:5'});expect(r.status,await r.clone().text()).toBe(200);const out=await r.json(),a=getAsset(out.assetId)!;expect(a.source_asset_id).toBe(f.a.id);expect(a.status).toBe('draft');expect(assetMeta<any>(a)).toMatchObject({aiPost:{request:'Texte acquis à conserver'},gate:{verdict:'RETRY'},reformat:{from:f.a.id,method:'studio'}});const bytes=assetData(a),dimensions=await sharp(bytes).metadata();expect([dimensions.width,dimensions.height]).toEqual([1080,1350]);const center=await sharp(bytes).extract({left:0,top:135,width:1080,height:1080}).removeAlpha().raw().toBuffer(),original=await sharp(f.data).resize(1080,1080).removeAlpha().raw().toBuffer();expect(center.equals(original)).toBe(true);expect(assetData(getAsset(out.assetId)!).equals(bytes)).toBe(true);expect(assetData(getAsset(f.a.id)!).equals(f.data)).toBe(true);noPaid(f.pid);});
it('caller natif existant désactive le bouton payé et affiche la raison serveur',()=>{const s=fs.readFileSync(path.join(process.cwd(),'src/components/studio/ai-image-actions.tsx'),'utf8');expect(s).toContain('disabled={!quote?.ai');expect(s).toMatch(/quote\?\.reason[\s\S]*\{quote.reason\}/);expect(s).toMatch(/action: "quote"/);});
