/** Recette isolée #142. Aucun serveur fournisseur, paiement ni génération IA réels. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
const dir = process.env.DATA_DIR;
if (!dir || !path.isAbsolute(dir) || !path.basename(dir).startsWith("ecs-parcours-test-142-")) throw Error("DATA_DIR de recette isolée obligatoire");
fs.mkdirSync(dir, { recursive: true });
globalThis.fetch = async () => { throw Error("Aucun réseau fournisseur autorisé dans la recette #142"); };
const { all, one, run, now } = await import("../../src/lib/db");
const { createUser } = await import("../../src/lib/auth");
const billing = await import("../../src/lib/billing");
const { setSetting, getJsonSetting, setJsonSetting } = await import("../../src/lib/settings");
const { accountKeyFor } = await import("../../src/lib/project-billing");
const command = process.argv[2], pid = process.argv[3];
const privatePath = path.join(dir, "private.json");
if (command === "seed") {
  if (fs.existsSync(privatePath) || one<{ n: number }>("SELECT COUNT(*) n FROM projects")!.n) throw Error("Refus d'écraser un jeu de données existant");
  const accounts = [];
  for (const business of ["products", "services"]) {
    const user = await createUser(`test142-${crypto.randomUUID()}@example.invalid`, crypto.randomBytes(32).toString("hex"), "Compte fictif #142");
    run("UPDATE users SET role='client' WHERE id=?", user.id);
    billing.getSubscription(user.id);
    run("UPDATE subscriptions SET status='active',plan='dominer',billing='month',owner_user_id=? WHERE user_id=?", user.id,user.id);
    billing.alignPeriod(user.id,now());
    const token = crypto.randomBytes(32).toString("base64url");
    run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)", crypto.createHash("sha256").update(token).digest("hex"),user.id,now()+86400_000,now());
    accounts.push({ uid:user.id,token,business });
  }
  setSetting("provider.anthropic.apiKey","synthetic-never-contact-provider",true);
  setSetting("ai.prices.checkedAt",String(now()));
  fs.writeFileSync(privatePath,JSON.stringify(accounts),{mode:0o600});
  await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="700"><rect width="900" height="700" fill="#244d43"/><rect x="280" y="150" width="340" height="350" rx="24" fill="#e6dfc7"/><text x="450" y="95" font-size="29" text-anchor="middle" fill="white">MÉDIA FOURNI — TEST ISOLÉ #142</text><text x="450" y="590" font-size="25" text-anchor="middle" fill="white">Aucune qualité créative IA évaluée</text></svg>')).png().toFile(path.join(dir,"photo.png"));
  console.log("2 comptes fictifs avec forfait synthétique, zéro projet, zéro appel fournisseur");
} else if (command === "mode") {
  setSetting(`test142.mode.${pid}`,process.argv[4]);
} else if (command === "snapshot") {
  const p = one<{user_id:string}>("SELECT user_id FROM projects WHERE id=?",pid)!;
  const key = accountKeyFor(p.user_id,pid);
  console.log(JSON.stringify({simulation:true,balance:billing.balance(key),wallet:one("SELECT monthly_allowance,monthly_used,reserved,reserved_topup,topup_balance FROM wallets WHERE user_id=?",key),reservations:all("SELECT amount,actual,status FROM ai_reservations WHERE project_id=?",pid),usages:all("SELECT cost,billed FROM usage_events WHERE project_id=?",pid)}));
} else if (command === "budget") {
  const p = one<{user_id:string}>("SELECT user_id FROM projects WHERE id=?",pid)!;
  const key = accountKeyFor(p.user_id,pid), b = billing.balance(key);
  if (b.reserved) throw Error("Réservation encore ouverte : aucun budget de test réécrit");
  const mode = process.argv[4];
  if (mode === "empty") run("UPDATE wallets SET monthly_used=monthly_allowance,topup_balance=0 WHERE user_id=?",key);
  else if (mode === "quote-only") run("UPDATE wallets SET monthly_used=monthly_allowance-? WHERE user_id=?",(Number.isFinite(Number(process.argv[5])) ? Number(process.argv[5]) : JSON.parse(one<{value:string}>("SELECT value FROM memory WHERE project_id=? AND key=?",pid,`preparation.quote.${process.argv[5]}`)!.value).capMicro),key);
  else throw Error("Budget synthétique inconnu");
  console.log("État budgétaire synthétique injecté, aucun paiement");
} else if (command === "expire-lease") {
  run("UPDATE jobs SET locked_until=? WHERE id=? AND status='running'",now()-1,pid);
} else if (command === "worker") {
  const jobs = await import("../../src/lib/jobs");
  const { runPreparation } = await import("../../src/lib/preparation/engine");
  const { simulatedDependencies, syntheticAsset } = await import("../../tests/preparation-fixtures");
  const { runForUser } = await import("../../src/lib/ai/access");
  const { runWithLang } = await import("../../src/lib/i18n-server");
  const { stopInterruptedPaidJob } = await import("../../src/lib/job-recovery");
  const { getSetting } = await import("../../src/lib/settings");
  const sleep = (ms:number) => new Promise(r=>setTimeout(r,ms));
  while (true) {
    const job = jobs.claimNext(["project.prepare"]);
    if (!job) { await sleep(100); continue; }
    if (job.recovered && stopInterruptedPaidJob(job)) continue;
    jobs.markRunning(job.id);
    const lease = setInterval(()=>jobs.renewLease(job.id),3000);
    const ctx = new jobs.JobContext(job);
    const deps = { ...simulatedDependencies, async inspect(p:any, brief:any, c:InstanceType<typeof jobs.JobContext>) {
      const mode = () => getSetting(`test142.mode.${p.id}`);
      const asset = await c.step("142:paid-result",async()=>{
        const max = mode()==="hold" ? c.payload.capMicro : 100_000;
        const rid = billing.reserve(p.userId,max,{task:"copywriting",provider:"synthetic",model:"test-rate",projectId:p.id,jobId:job.id,usageKey:`${job.id}:inspect`});
        c.progress(.25,"Analyse simulée en cours ; les informations saisies sont enregistrées");
        while (mode()==="hold") await sleep(100);
        const aid = await syntheticAsset(p.id,"test142-acquired","generated",{simulation:true});
        billing.recordUsage({userId:p.userId,projectId:p.id,jobId:job.id,task:"copywriting",provider:"synthetic",model:"test-rate",unit:"request",costMicro:40_000,estimated:false,idempotencyKey:`${job.id}:inspect`},{reservationId:rid});
        return aid;
      });
      c.progress(.7,"Résultat simulé acquis et sauvegardé, finalisation du suivi");
      while (mode()==="interrupt-after-save") await sleep(100);
      if (mode()==="fail-after-save" && !getSetting(`test142.failed.${job.id}`)) {
        setSetting(`test142.failed.${job.id}`,"1");
        throw new jobs.PermanentError("Incident simulé après sauvegarde : votre photo, votre brief et le résultat acquis sont conservés.");
      }
      const { assetData, getAsset } = await import("../../src/lib/library");
      for (const aid of brief.input.photoIds) await sharp(assetData(getAsset(aid)!)).metadata();
      return {...brief,provenance:"simulation" as const,observations:[`Analyse de test, résultat ${asset} conservé. Aucun fournisseur réel.`]};
    } };
    try {
      const result = await runWithLang({ui:"fr",content:"fr"},()=>runForUser(job.user_id,()=>runPreparation(ctx,deps),"normal",job.project_id));
      jobs.completeJob(job.id,result);
    } catch(e) { jobs.failJob(jobs.getJob(job.id)!,e,{permanent:true}); }
    finally { clearInterval(lease); jobs.markFinished(job.id); }
  }
} else if (command === "report") {
  const report = {simulation:true,realSupplierCalls:0,realCostEur:0,projects:all("SELECT id,business_type,name FROM projects"),jobs:all("SELECT id,project_id,status,attempts,progress,error,checkpoint FROM jobs"),wallets:all("SELECT user_id,monthly_allowance,monthly_used,reserved,reserved_topup,topup_balance FROM wallets"),reservations:all("SELECT id,user_id,project_id,job_id,amount,actual,status FROM ai_reservations"),usages:all("SELECT project_id,job_id,task,cost,billed FROM usage_events"),assets:all("SELECT id,project_id,role,origin FROM assets"),themesCreated:one<{n:number}>("SELECT COUNT(*) n FROM theme_versions")!.n};
  fs.writeFileSync(path.join(dir,"ledger-public.json"),JSON.stringify(report,null,2));
  console.log("Preuve de comptes synthétiques écrite sans sessions ni configuration");
} else throw Error("Commande de recette inconnue");
