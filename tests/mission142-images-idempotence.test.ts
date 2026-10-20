/** Routes natives et base isolée ; aucune API ni génération d'image appelée. */
import { expect, it, vi } from "vitest";
const session=vi.hoisted(()=>({user:null as any}));
vi.mock("@/lib/auth",async orig=>({...await orig<any>(),requireUser:async()=>session.user,currentUser:async()=>session.user}));
import { createUser } from "@/lib/auth";
import { seedImageFixture, seedCutout } from "./image-v2-fixtures";
import { grantProjectPlan } from "@/lib/project-subscriptions";
import { all } from "@/lib/db";
import { POST } from "@/app/api/projects/[id]/images/v2/route";
async function project(){const u=await createUser(`idempotence-${crypto.randomUUID()}@example.invalid`,"motdepasse-test","Fictif");session.user={...u,role:"client"};const pid=seedImageFixture(u.id,"hightech");grantProjectPlan(pid,"vendre");return{u,pid};}
const post=(pid:string,data:any)=>POST(new Request("http://localhost/api/projects/"+pid+"/images/v2",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)}),{params:Promise.resolve({id:pid})});
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
  const first=await(await post(pid,data)).json();expect(first.jobId).toBeTruthy();expect((await(await post(pid,data)).json()).jobId).toBe(first.jobId);
  const foreign=seedImageFixture(u.id,"restaurant");grantProjectPlan(foreign,"vendre");expect((await post(foreign,data)).status).toBe(404);
  session.user={...(await createUser(`foreign-${crypto.randomUUID()}@example.invalid`,"motdepasse-test","Autre")),role:"client"};expect((await post(pid,data)).status).toBe(404);
});
