/** Routes natives et base isolée ; aucune API ni génération d'image appelée. */
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const session=vi.hoisted(()=>({user:null as any}));
vi.mock("@/lib/auth",async orig=>({...await orig<any>(),requireUser:async()=>session.user,currentUser:async()=>session.user}));
vi.mock('@/lib/ai/config',async orig=>({...await orig<any>(),activeProviderKey:()=> 'FAUX FOURNISSEUR SANS APPEL'}));
import {nativeImageConfirmedFixture} from './native-image-consent-fixture';
import { createUser } from "@/lib/auth";
import { seedImageFixture, seedCutout } from "./image-v2-fixtures";
import { grantProjectPlan } from "@/lib/project-subscriptions";
import { all } from "@/lib/db";
import { POST } from "@/app/api/projects/[id]/images/v2/route";
import {setJsonSetting} from '@/lib/settings';
import {MEDIA_MODELS} from '@/lib/ai/media-models';
beforeEach(()=>{
  vi.stubGlobal('fetch',vi.fn(()=>{throw Error('HTTP fournisseur interdit : test de transport seulement');}));
  setJsonSetting('billing.markup',1);
  setJsonSetting('ai.media.models',Object.fromEntries(MEDIA_MODELS.filter(m=>m.kind==='image').map(m=>[`${m.provider}:${m.model}`,{enabled:true,confirmedAt:Date.now()}])));
});
afterEach(()=>vi.unstubAllGlobals());
async function project(){const u=await createUser(`idempotence-${crypto.randomUUID()}@example.invalid`,"motdepasse-test","Fictif");session.user={...u,role:"client"};const pid=seedImageFixture(u.id,"hightech");grantProjectPlan(pid,"vendre");return{u,pid};}
const rawPost=(pid:string,data:unknown)=>POST(new Request("http://localhost/api/projects/"+pid+"/images/v2",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)}),{params:Promise.resolve({id:pid})});
const post=(pid:string,data:any)=>nativeImageConfirmedFixture(body=>rawPost(pid,body),data);
it("double envoi de création : une seule tâche ; intention ou opération nouvelle distincte",async()=>{
  const {pid}=await project();
  const request={kind:"ambiance",count:1,allowGenerate:true,aspect:"4:5"};
  const data={action:"generate",operationId:"operation-image-isolee",request};
  const a=await post(pid,data),b=await post(pid,data);expect(a.status).toBe(200);expect(b.status).toBe(200);
  const aid=(await a.json()).jobId;expect((await b.json()).jobId).toBe(aid);
  expect(all("SELECT id FROM jobs WHERE project_id=?",pid)).toHaveLength(1);
  expect((await(await post(pid,{...data,request:{...request,aspect:"1:1"}})).json()).jobId).not.toBe(aid);
  expect((await(await post(pid,{...data,operationId:"nouvelle-operation-image"})).json()).jobId).not.toBe(aid);
});
it("retouche renvoyée : un seul job et aucun accès à la photo d'un autre projet",async()=>{
  const {u,pid}=await project();const aid=await seedCutout(u.id,pid);
  const data={action:"edit",operationId:"operation-retouche-isolee",assetId:aid,instruction:"Lumière plus chaude"};
  const unsigned=await rawPost(pid,data);expect(unsigned.status).toBe(409);
  expect(await unsigned.json()).toMatchObject({code:'image_consent_required'});
  expect(all("SELECT id FROM jobs WHERE project_id=?",pid)).toHaveLength(0);
  const quoteData={...data,action:'quote_edit'},quoted=await rawPost(pid,quoteData);
  expect(quoted.status,await quoted.clone().text()).toBe(200);
  const quote=await quoted.json();expect(quote.approvalToken).toBeTruthy();expect(quote.maximumCalls).toBe(1);expect(quote.maximumMicro).toBeGreaterThan(0);
  expect(all("SELECT id FROM jobs WHERE project_id=?",pid)).toHaveLength(0);
  const confirmed={...data,approvalToken:quote.approvalToken,confirmation:true};
  expect((await rawPost(pid,{...confirmed,confirmation:false})).status).toBe(409);
  expect(all("SELECT id FROM jobs WHERE project_id=?",pid)).toHaveLength(0);
  // Réponse perdue : l'accord est accepté, son corps est volontairement ignoré, puis même opération reprise.
  expect((await rawPost(pid,confirmed)).status).toBe(200);
  const jobs=all<{id:string}>("SELECT id FROM jobs WHERE project_id=?",pid);expect(jobs).toHaveLength(1);
  const retryQuote=await rawPost(pid,quoteData);expect(retryQuote.status).toBe(200);expect((await retryQuote.json()).jobId).toBe(jobs[0].id);
  for(let retry=0;retry<2;retry++){const response=await rawPost(pid,confirmed);expect(response.status).toBe(200);expect((await response.json()).jobId).toBe(jobs[0].id);}
  expect(all("SELECT id FROM jobs WHERE project_id=?",pid)).toHaveLength(1);
  expect(fetch).not.toHaveBeenCalled();
  const foreign=seedImageFixture(u.id,"restaurant");grantProjectPlan(foreign,"vendre");expect((await post(foreign,data)).status).toBe(404);
  session.user={...(await createUser(`foreign-${crypto.randomUUID()}@example.invalid`,"motdepasse-test","Autre")),role:"client"};expect((await post(pid,data)).status).toBe(404);
});
