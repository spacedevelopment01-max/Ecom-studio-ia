import {it,expect,vi,beforeEach,afterEach} from "vitest";
const jar=vi.hoisted(()=>({token:""}));
vi.mock("next/headers",()=>({cookies:async()=>({get:()=>jar.token?{value:jar.token}:undefined,set:()=>{},delete:()=>{}})}));
import * as drafts from "@/app/api/studio-agent/draft/route";
import * as thread from "@/app/api/studio-agent/conversations/[cid]/route";
import * as projects from "@/app/api/projects/[id]/conversation/route";
import * as create from "@/app/api/projects/route";
import {account,project,sender,emptySpend} from "./conversation209-fixtures";
import {openDraft,openProjectConversation,conversationView} from "@/lib/orchestrator/conversation";
import {all,id,now,run,one} from "@/lib/db";
import {sha256} from "@/lib/secrets";
import {stateOf} from "@/lib/preparation/store";
import {pendingSubscriptions} from "@/lib/project-billing";
beforeEach(()=>{jar.token="";vi.stubEnv("STUDIO_CONVERSATION_LOT_A","1");vi.stubGlobal("fetch",vi.fn(()=>{throw Error("Aucun réseau dans la recette #209");}));});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
function login(uid?:string){jar.token=uid?id():"";if(uid)run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)",sha256(jar.token),uid,now()+3600000,now());}
const req=(method="GET",payload?:unknown,origin="http://localhost")=>new Request("http://localhost/api/studio-agent/draft",{method,headers:{"content-type":"application/json",origin},body:payload===undefined?undefined:JSON.stringify(payload)});
const ctx=(cid:string)=>({params:Promise.resolve({cid})});
it("désactivé par défaut : ni accueil ni route client remplacés, aucune écriture",async()=>{
  vi.stubEnv("STUDIO_CONVERSATION_LOT_A","");const before=all("SELECT * FROM agent_conversations");
  expect((await drafts.GET()).status).toBe(404);expect((await drafts.POST(req("POST",{}))).status).toBe(404);expect(all("SELECT * FROM agent_conversations")).toEqual(before);
});
it("session et abonnement requis ; administrateur sans forfait ne reçoit pas de passe-droit",async()=>{
  expect((await drafts.POST(req("POST",{}))).status).toBe(401);
  const u=await account(false);run("UPDATE users SET role='admin' WHERE id=?",u.id);login(u.id);
  expect((await drafts.POST(req("POST",{}))).status).toBe(402);
});
it.each(["GET","POST"] as const)("conversation %s : B et administrateur refusés sans fuite ; A retrouve après nouvelle session",async method=>{
  const a=await account(),b=await account(),d=openDraft(a);await sender(a,d.id)({action:"message",text:"Je vends des lampes, détail privé de A"});
  for(const role of ["client","admin"]){run("UPDATE users SET role=? WHERE id=?",role,b.id);login(b.id);const r=method==="GET"?await thread.GET(req(),ctx(d.id)):await thread.POST(req("POST",{action:"summary",revision:1,projectRevision:null,requestId:id()}),ctx(d.id));expect(r.status).toBe(404);expect(await r.text()).not.toContain("détail privé");}
  login(a.id);const r=await thread.GET(req(),ctx(d.id));expect(r.status).toBe(200);expect(r.headers.get("cache-control")).toContain("no-store");expect((await r.json()).summary.description).toContain("détail privé de A");
});
it("CSRF et outil forgé : aucune mutation ni tâche",async()=>{
  const u=await account();login(u.id);expect((await drafts.POST(req("POST",{},"https://intrus.invalid"))).status).toBe(403);
  const d=openDraft(u),before=emptySpend();
  const r=await thread.POST(req("POST",{action:"execute",tool:"publish",approve:true,revision:0,projectRevision:null,requestId:id()}),ctx(d.id));expect(r.status).toBe(400);expect(conversationView(u,d.id).revision).toBe(0);expect(emptySpend()).toEqual(before);
});
it.each(["products","services"] as const)("parcours HTTP réel %s : brouillon → API de création native → rattachement → reprise/correction, sans tâche ni coût",async business=>{
  const u=await account();login(u.id);const created=await drafts.POST(req("POST",{}));expect(created.status).toBe(200);let v=await created.json();
  async function send(payload:Record<string,unknown>){const r=await thread.POST(req("POST",{revision:v.revision,projectRevision:v.projectRevision,requestId:id(),...payload}),ctx(v.id));expect(r.status).toBe(200);v=await r.json();return v;}
  const before=emptySpend();
  await send({action:"message",text:business==="products"?"Je veux une marque de lampe pour chambre d'enfant":"J'aménage des fourgons apportés par les clients et je veux des devis et RDV"});
  if(business==="products")await send({action:"answer",question:"goals",choices:["brand"]});
  await send({action:"answer",question:"target",text:"Clients professionnels de la recette fictive"});
  if(business==="services")await send({action:"edit-services",items:[{name:"Rangements",description:"Dans le fourgon apporté par le client."}]});
  expect(v.creation.available).toBe(true);const form=new FormData();for(const [k,value] of Object.entries(v.creation.fields))form.set(k,value as string);
  const cr=await create.POST(new Request("http://localhost/api/projects",{method:"POST",headers:{origin:"http://localhost"},body:form}));expect(cr.status).toBe(200);const result=await cr.json();expect(result.jobId).toBeNull();expect(pendingSubscriptions(u.id)).toHaveLength(0);
  const linked=await projects.POST(req("POST",{draftId:v.id,draftRevision:v.revision}),{params:Promise.resolve({id:result.id})});expect(linked.status).toBe(200);v=await linked.json();expect(v.projectId).toBe(result.id);expect(v.summary.business).toBe(business);expect(v.creation).toBeNull();
  await send({action:"edit",field:"target",value:"Cible corrigée sans nouvelle analyse"});login(u.id);const reopened=await thread.GET(req(),ctx(v.id));const out=await reopened.json();expect(out.summary.target).toBe("Cible corrigée sans nouvelle analyse");expect(stateOf(result.id)!.stages.brief!.data.input.business).toBe(business);expect(out.history.length).toBeGreaterThanOrEqual(4);expect(emptySpend()).toEqual(before);
});
it("le rattachement refuse un projet non vide, un autre compte ou une révision périmée sans écraser le brouillon",async()=>{
  const u=await account(),d=openDraft(u);const v=await sender(u,d.id)({action:"message",text:"Je vends des lampes"});const pid=project(u);
  expect(()=>openProjectConversation(u,pid,d.id,0)).toThrow("changé");
  run("UPDATE projects SET product_json=? WHERE id=?",JSON.stringify({summary:"Acquis manuel du client"}),pid);
  expect(()=>openProjectConversation(u,pid,d.id,v.revision)).toThrow("contient déjà");expect(conversationView(u,d.id).projectId).toBeNull();expect(stateOf(pid)).toBeNull();
});
it("photo étrangère et dépôt avant projet : refus explicite, pas de média substitué ni texte perdu",async()=>{
  const u=await account(),d=openDraft(u),send=sender(u,d.id);
  await expect(send({action:"message",text:"Je vends des lampes",photoIds:["photo-etrangere"]})).rejects.toMatchObject({code:"conversation_draft_upload_unavailable"});expect(conversationView(u,d.id).revision).toBe(0);
  const pid=project(u),c=openProjectConversation(u,pid);await expect(sender(u,c.id)({action:"message",text:"Je vends des lampes",photoIds:["photo-etrangere"]})).rejects.toMatchObject({status:404});expect(conversationView(u,c.id).revision).toBe(0);
});
it("ouvrir le chat ne crée pas une préparation concurrente sur un ancien projet déjà construit",async()=>{
  const u=await account(),pid=project(u);run("UPDATE projects SET product_json=? WHERE id=?",JSON.stringify({summary:"Offre historique à préserver"}),pid);
  const before=emptySpend();expect(()=>openProjectConversation(u,pid)).toThrow("migration");expect(stateOf(pid)).toBeNull();expect(emptySpend()).toEqual(before);
});
it("un prix saisi à la main protège un ancien projet même sans titre ni résumé",async()=>{
  const u=await account(),pid=project(u);run("UPDATE projects SET product_json=? WHERE id=?",JSON.stringify({price:{amount:4200,status:"confirmed",currency:"EUR"}}),pid);
  expect(()=>openProjectConversation(u,pid)).toThrow("migration");expect(stateOf(pid)).toBeNull();
});
