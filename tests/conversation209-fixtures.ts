/** Comptes/projets fictifs, abonnement natif, jamais une clé de fournisseur. */
import { createUser, type User } from "@/lib/auth";
import { id, now, one, run } from "@/lib/db";
import { getSubscription, alignPeriod, syncAllowance } from "@/lib/billing";
import { createProjectWithSubscription } from "@/lib/project-billing";
import type { ConversationView } from "@/lib/orchestrator/conversation/contract";
import { conversationView, submitConversation, type TestDependencies } from "@/lib/orchestrator/conversation";
export async function account(paid=true): Promise<User> {
  const u = await createUser(`agent209-${id()}@example.invalid`,"Mot-de-passe-fictif","SIMULATION #209");
  run("UPDATE users SET role='client' WHERE id=?",u.id);
  if (paid) {
    getSubscription(u.id);
    run("UPDATE subscriptions SET status='manual',plan='dominer',billing='monthly',owner_user_id=?,project_id=NULL WHERE user_id=?",u.id,u.id);
    alignPeriod(u.id,now());syncAllowance(u.id);
  }
  return {...u,role:"client"};
}
export function project(u:User,business:"products"|"services"="products") {
  return createProjectWithSubscription(u.id,null,()=>{
    const pid=id();run("INSERT INTO projects(id,user_id,name,settings_json,business_type,created_at,updated_at) VALUES(?,?,?,'{\"language\":\"fr\"}',?,?,?)",pid,u.id,"SIMULATION — lot A",business,now(),now());
    return {projectId:pid,result:pid};
  });
}
export function sender(u:User,cid:string,deps:TestDependencies={}) {
  return async (action:Record<string,unknown>)=>{
    const v=conversationView(u,cid);
    return submitConversation(u,cid,{revision:v.revision,projectRevision:v.projectRevision,requestId:id(),...action},deps);
  };
}
export function emptySpend() {
  return {calls:one<{n:number}>("SELECT COUNT(*) n FROM ai_calls")!.n,jobs:one<{n:number}>("SELECT COUNT(*) n FROM jobs")!.n,usage:one<{n:number}>("SELECT COUNT(*) n FROM usage_events")!.n,ledger:one<{n:number}>("SELECT COUNT(*) n FROM ledger")!.n};
}
