/**
 * LA DÉPENSE ANNONCÉE SUR L'ÉCRAN DES PUBLICITÉS (26 novembre 2026). Une nouvelle proposition (ad-editor.tsx) lancée par la
 * route des campagnes emporte le coût probable montré ; avant l'appel qui ferait dépasser le double, elle s'arrête, attend
 * l'accord du client, et la phrase de SINA est dans son message (l'écran des publicités et le suivi des tâches la
 * montrent ; « Reprendre » est son oui). Route et tâche réelles ; aucun fournisseur (repris de parity301-ad-new-version).
 */
import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import sharp from 'sharp';
import {account,project} from './conversation209-fixtures';
import {all,run,now} from '@/lib/db';
import {setSetting} from '@/lib/settings';
import {loadProject,saveProduct,saveBrand} from '@/lib/projects';
import {saveAsset,assetData,getAsset} from '@/lib/library';
import {projectAccountKey} from '@/lib/project-billing';
import {validatedBrand} from './preparation-mission-fixtures';
import type {CreativeRoute} from '@/lib/media/brand-mockups';
const trap=vi.hoisted(()=>({user:null as any,sdk:0,fetch:0}));
vi.mock('@/lib/auth',async o=>{const real=await o<any>();return{...real,requireUser:async()=>{if(!trap.user)throw new real.HttpError(401,'Connexion requise.');return trap.user;}};});
vi.mock('@anthropic-ai/sdk',async o=>{const real=await o<any>();const stream=()=>{trap.sdk++;throw Object.assign(Error('NO_REAL_PROVIDER_TRANSPORT'),{status:400});};class Fake{messages={countTokens:async()=>({input_tokens:100}),stream};beta={messages:{stream}};}Object.assign(Fake,{AuthenticationError:real.default.AuthenticationError,BadRequestError:real.default.BadRequestError,NotFoundError:real.default.NotFoundError});return{...real,default:Fake};});

vi.mock('@/lib/social-v2/ai-post',async o=>({...await o<any>(),publicationReadiness:async()=>({ready:true,mode:'one-step',reason:null})}));
beforeEach(()=>{trap.sdk=0;trap.fetch=0;vi.stubEnv('ANTHROPIC_API_KEY','synthetic-only');for(const k of ['OPENAI_API_KEY','GOOGLE_API_KEY','DASHSCOPE_API_KEY','FAL_KEY'])vi.stubEnv(k,'');vi.stubGlobal('fetch',vi.fn(()=>{trap.fetch++;throw Error('NO_EXTERNAL_NETWORK');}));setSetting('ai.prices.checkedAt',String(now()));});
afterEach(()=>{run("UPDATE jobs SET status='cancelled' WHERE status IN ('queued','running')");expect(trap.fetch).toBe(0);vi.unstubAllEnvs();vi.unstubAllGlobals();});
async function fixture(){const u=await account(),pid=project(u);trap.user=u;saveProduct(pid,{...loadProject(pid).product,name:'Outil fictif',summary:'Un outil pour le travail manuel.'});validatedBrand(pid);return{u,pid};}
const ctx=(pid:string)=>({params:Promise.resolve({id:pid})});
const request=(body:unknown)=>new Request('http://localhost/api',{method:'POST',headers:{origin:'http://localhost','content-type':'application/json'},body:JSON.stringify(body)});
const financial=(pid:string)=>({calls:all('SELECT * FROM ai_calls WHERE project_id=?',pid),usage:all('SELECT * FROM usage_events WHERE project_id=?',pid),reservations:all('SELECT * FROM ai_reservations WHERE project_id=?',pid),assets:all('SELECT * FROM assets WHERE project_id=?',pid),wallets:all('SELECT * FROM wallets WHERE user_id=?',projectAccountKey(pid))});

import {POST} from '@/app/api/projects/[id]/campaigns/v2/route';
import {requestCreativeVersion,type CreativeVersionOperation} from '@/lib/ad-doc/new-version-client';
async function post(f:Awaited<ReturnType<typeof fixture>>,body:Record<string,unknown>){const r=await POST(request(body),ctx(f.pid)),v=await r.json();if(!r.ok)throw Object.assign(Error(v.error),{status:r.status});return v;}
import * as billing from '@/lib/billing';
import {json as lire} from '@/lib/db';
import {getJob,annonceDe,resumeJob} from '@/lib/jobs';
import {withTrace,CostCapReached} from '@/lib/ai/trace';
import {attendreLAccordDeLaTache,phraseDuDepassement} from '@/lib/syna-agent/depense-annoncee';
import {runWithLang} from '@/lib/i18n-server';

it("une nouvelle proposition de publicité emporte le coût probable montré ; avant de dépasser le double, elle s'arrête et le client est prévenu par la phrase de SINA",async()=>{
  const f=await fixture(),operation:CreativeVersionOperation={current:null};let devis:any=null;
  const result=await requestCreativeVersion(b=>post(f,b),q=>{devis=q;return true;},operation);
  const jobId=result!.jobId,payload=lire<Record<string,unknown>>(getJob(jobId)!.payload,{});
  expect(annonceDe(payload)).toBe(devis.estimateMicro);
  const annonce=devis.estimateMicro as number,meta={task:'image_generation',provider:'openai',model:'simule',projectId:f.pid,jobId};
  await withTrace({jobId,costCapMicro:100*annonce,annonceMicro:annonceDe(payload)},async()=>{
    const rid=billing.reserve(f.u.id,Math.ceil(1.5*annonce),meta);billing.settle(rid,Math.ceil(1.5*annonce),null,'image');
    expect(()=>billing.reserve(f.u.id,annonce,meta)).toThrow(CostCapReached);
  });
  expect(attendreLAccordDeLaTache(jobId)).toBe(true);
  const j=getJob(jobId)!;
  expect(j.status).toBe('paused');
  expect(j.message).toBe(runWithLang({ui:'fr',content:'fr'},()=>phraseDuDepassement(f.u.id,f.pid,{depenseMicro:Math.ceil(1.5*annonce),annonceMicro:annonce})));
  expect(j.message).toMatch(/tu veux que je continue \?$/);
  resumeJob(jobId);
  expect(getJob(jobId)!.status).toBe('queued');
  expect(trap.sdk).toBe(0);
});
