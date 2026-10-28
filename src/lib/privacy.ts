/** Accès compte et préparation d'effacement. L'effacement automatique réel reste désactivé. */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { all, one, run, tx, db, DATA_DIR, id, now } from "./db";
import { HttpError } from "./auth";
import { randomToken, sha256 } from "./secrets";
import { STORAGE_DIR, storagePath } from "./storage";
import type { Asset } from "./library";
import { createSupportRequest } from "./support";
import type { User } from "./auth";
import { redact } from "./redact";

const excluded = new Set(["sessions","password_resets","admin_claims","oauth_states","pending_registrations","settings","error_log","worker_heartbeat","rate_events","asset_cache_entries","wallets","ledger","ai_reservations","ai_calls","usage_events","billing_mutations","stripe_event_claims","stripe_events","stripe_cancellations"]);
const internalBudgetField=/^(?:cost(?:_micro|Micro)|billed(?:_micro|Micro)?|costCapMicro|internalCost|maxCostMicro|cap(?:_micro|Micro)|estimateMicro|budgetMicro|monthly_allowance|monthly_used|reserved(?:_topup)?|topup_balance|topup_period_used)$/i;
const quote = (name: string) => { if (!/^\w+$/.test(name)) throw new Error("Invalid schema identifier"); return `"${name}"`; };
const columns = (table: string) => all<{name:string}>(`PRAGMA table_info(${quote(table)})`).map(c=>c.name);
function withoutCredentials(value:unknown,depth=0):unknown{
  if(depth>40)throw new HttpError(422,"Donnée trop imbriquée : examen manuel nécessaire / Deeply nested data requires manual review");
  if(typeof value==="string"){
    if(/^[\s]*[\[{]/.test(value)){try{return JSON.stringify(withoutCredentials(JSON.parse(value),depth+1));}catch(e){if(e instanceof HttpError)throw e;}}
    return redact(value);
  }
  if(Array.isArray(value))return value.map(v=>withoutCredentials(v,depth+1));
  if(value&&typeof value==="object")return Object.fromEntries(Object.entries(value).filter(([key])=>!/(?:password|secret|token|credential|cipher|authorization|cookie|api[_-]?key)/i.test(key)&&!internalBudgetField.test(key)).map(([k,v])=>[k,withoutCredentials(v,depth+1)]));
  return value;
}
export function personalDataInventory() {
  return all<{name:string}>("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").map(({name})=>{
    const fields=columns(name);
    const scope=name==="agent_request_jobs"?'agent_request':name==="support_messages"?"support_ticket":["agent_conversation_turns","agent_conversation_quotes","agent_request_bounds"].includes(name)?"conversation":fields.includes("project_id")?"project":fields.includes("owner_user_id")?"subscription_owner":fields.includes("user_id")?"account":name==="users"?"identity":"manual_review";
    return {table:name,fields,scope,exported:!excluded.has(name)&&scope!=="manual_review"};
  });
}

function whereOwned(table:string, fields:string[], userId:string):{sql:string;args:unknown[]} | null {
  if(table==="users")return{sql:"id=?",args:[userId]};
  if(table==="support_messages")return{sql:"ticket_id IN (SELECT id FROM support_tickets WHERE user_id=?)",args:[userId]};
  if(table==='agent_request_jobs')return{sql:'bound_id IN (SELECT id FROM agent_request_bounds WHERE user_id=?)',args:[userId]};
  if(["agent_conversation_turns","agent_conversation_quotes","agent_request_bounds"].includes(table))return{sql:"conversation_id IN (SELECT id FROM agent_conversations WHERE user_id=? AND (project_id IS NULL OR project_id IN (SELECT id FROM projects WHERE user_id=?)))",args:[userId,userId]};
  if(fields.includes("owner_user_id"))return{sql:"owner_user_id=?",args:[userId]};
  const project = "project_id IN (SELECT id FROM projects WHERE user_id=?)";
  if(fields.includes("project_id")&&fields.includes("user_id"))return{sql:`user_id=? AND (project_id IS NULL OR ${project})`,args:[userId,userId]};
  if(fields.includes("project_id"))return{sql:project,args:[userId]};
  if(fields.includes("user_id"))return{sql:"user_id=?",args:[userId]};
  return null;
}

export function exportAccountData(userId:string) {
  if(!one("SELECT 1 FROM users WHERE id=?",userId))throw new HttpError(404,"Compte introuvable / Account not found");
  return tx(()=>{
    const tables:Record<string,unknown[]>= {}, manualReview:string[]=[];
    for(const t of personalDataInventory()){
      if(excluded.has(t.table))continue;
      const scope=whereOwned(t.table,t.fields,userId);
      if(!scope){manualReview.push(t.table);continue;}
      const safe=t.fields.filter(c=>!/(?:password|secret|token|credential|cipher|storage_key|thumb_key|request_key|idempotency_key)/i.test(c));
      tables[t.table]=all(`SELECT ${safe.map(quote).join(",")} FROM ${quote(t.table)} WHERE ${scope.sql}`,...scope.args).map(row=>withoutCredentials(row));
    }
    const media=all<{id:string;name:string;size:number}>("SELECT a.id,a.name,a.size FROM assets a JOIN projects p ON p.id=a.project_id WHERE a.user_id=? AND p.user_id=?",userId,userId).map(a=>({id:a.id,name:a.name,size:a.size,download:`/api/me/data-file/${a.id}`}));
    return {schema:"account-data-export-1",capturedAt:new Date().toISOString(),tables,media,coverage:{binaryFilesIncluded:false,downloadRequiresOwnSession:true,securitySecretsExcluded:true,excludedTables:[...excluded],unscopedTablesForManualReview:manualReview,backupsAndExternalProvidersIncluded:false},erasure:{automaticEnabled:false,reason:"Conservation, sauvegardes et prestataires à valider / Retention, backups and providers require review"}};
  });
}

export function requestAccountErasure(userId:string){
  return tx(()=>{
    if(!one("SELECT 1 FROM users WHERE id=?",userId))throw new HttpError(404,"Compte introuvable / Account not found");
    const existing=one<{id:string;status:string}>("SELECT id,status FROM privacy_requests WHERE user_id=? AND status='pending_policy'",userId);
    if(existing)return existing;
    const rid=id();run("INSERT INTO privacy_requests(id,user_id,status,created_at) VALUES(?,?,'pending_policy',?)",rid,userId,now());
    const user=one<User>("SELECT id,email,name,role,timezone,created_at FROM users WHERE id=?",userId)!;
    createSupportRequest(user,{subject:"Demande d’effacement / Erasure request",category:"account",text:"Examen demandé depuis Mon compte. Aucune suppression automatique effectuée. Conservation financière, assistance, sauvegardes et prestataires à vérifier avant décision.",requestKey:`privacy:${rid}`});
    return{id:rid,status:"pending_policy"};
  });
}

export const ERASURE_DECISIONS=["financial_retention","support_retention","backup_expiry","external_provider_requests","unindexed_legacy_caches","responsible_operator"] as const;
export function planAccountErasure(userId:string){
  if(!one("SELECT 1 FROM users WHERE id=?",userId))throw new HttpError(404,"Compte introuvable / Account not found");
  return{automaticEnabled:false,decisionsRequired:ERASURE_DECISIONS,projects:one<{n:number}>("SELECT COUNT(*) n FROM projects WHERE user_id=?",userId)!.n,media:one<{n:number}>("SELECT COUNT(*) n FROM assets WHERE user_id=? AND project_id IN (SELECT id FROM projects WHERE user_id=?)",userId,userId)!.n};
}

export type FixtureErasurePolicy={financial:"retain";support:"retain";backups:"manual_pending";externalProviders:"manual_pending";legacyCaches:"manual_pending"};
/** Banc d'essai seulement : impossible via une route et refusé sur un chemin de studio réel. */
export function eraseIsolatedAccountFixture(userId:string,policy:FixtureErasurePolicy){
  const root=path.resolve(DATA_DIR),parent=path.dirname(root);
  if(process.env.NODE_ENV!=="test" || path.dirname(parent)!==path.resolve(os.tmpdir()) || !path.basename(parent).startsWith("ecs-test-") || !path.basename(root).startsWith("case-") || path.resolve(db().name)!==path.join(root,"studio.db") || path.resolve(STORAGE_DIR)!==path.join(root,"storage")) throw new Error("Fixture-only erasure refused outside an isolated test database");
  if(policy.financial!=="retain"||policy.support!=="retain"||policy.backups!=="manual_pending"||policy.externalProviders!=="manual_pending"||policy.legacyCaches!=="manual_pending")throw new Error("Explicit fixture retention policy required");
  planAccountErasure(userId);
  const assets=all<Asset>("SELECT a.* FROM assets a JOIN projects p ON p.id=a.project_id WHERE a.user_id=? AND p.user_id=?",userId,userId);
  const files=assets.flatMap(a=>[a.storage_key,a.thumb_key].filter((k):k is string=>!!k).map(k=>{if(!k.startsWith(`${userId}/${a.project_id}/`))throw new Error("Crossed storage reference refused");return storagePath(k);}));
  const cache=all<{cache_key:string}>("SELECT cache_key FROM asset_cache_entries WHERE user_id=? AND project_id IN (SELECT id FROM projects WHERE user_id=?)",userId,userId).map(c=>{if(!/^[0-9a-f]{40}\.[a-z0-9]+$/.test(c.cache_key))throw new Error("Invalid cache reference");return path.join(root,"cache","theme-assets",c.cache_key);});
  tx(()=>{
    run("UPDATE jobs SET status='cancelled',locked_by=NULL,locked_until=NULL,payload='{}',result=NULL,checkpoint='{}',error=NULL,message='',finished_at=?,updated_at=? WHERE user_id=?",now(),now(),userId);
    for(const table of ["sessions","password_resets","admin_claims","oauth_states","connections"]){run(`DELETE FROM ${quote(table)} WHERE user_id=?`,userId);}
    run("DELETE FROM pending_registrations WHERE email=(SELECT email FROM users WHERE id=?)",userId);
    for(const t of personalDataInventory()){
      // Traces financières, assistance et identité pseudonymisée conservées par la politique FICTIVE explicite.
      if(["users","projects","jobs","support_tickets","support_messages","privacy_requests"].includes(t.table)||excluded.has(t.table)||/subscription|wallet|ledger|reserv|quota|payment|purchase|balance|usage|ai_calls|checkout|billing|stripe|expense|charge|booking/.test(t.table))continue;
      const scope=whereOwned(t.table,t.fields,userId);if(scope)run(`DELETE FROM ${quote(t.table)} WHERE ${scope.sql}`,...scope.args);
    }
    run("DELETE FROM asset_cache_entries WHERE user_id=?",userId);
    run("UPDATE projects SET archived=1,hidden=1,name='Compte effacé — recette isolée',product_json='{}',brand_json='{}',strategy_json='{}',settings_json='{}',sources_json='[]',catalog_json='[]',cover_asset_id=NULL,current_theme_version_id=NULL,store_url=NULL WHERE user_id=?",userId);
    run("UPDATE users SET email=?,name='Compte effacé — recette isolée',password_hash=?,role='client' WHERE id=?",`erased-${id()}@example.invalid`,sha256(randomToken(32)),userId);
  });
  for(const file of [...files,...cache]){try{fs.unlinkSync(file);}catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e;}}
  return{status:"isolated_fixture_erased",originalsAndThumbnailsRemoved:files.length,indexedCachesRemoved:cache.length,automaticProductionErasure:false,retainedByFixturePolicy:["financial_records","support","pseudonymized_identity"],pending:["backups","external_providers","unindexed_legacy_caches"]};
}
