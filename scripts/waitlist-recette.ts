/**
 * Recette #420 — liste d'attente, de bout en bout sur le Studio lancé en local (base temporaire, SMTP local de test,
 * aucun e-mail réel, données fictives) :
 *  1. inscription signée envoyée au serveur Next comme le fera le site → 201, une notification à l'adresse interne ;
 *  2. même inscription renvoyée → doublon, aucun second e-mail ;
 *  3. panne SMTP → inscription enregistrée, « Nouvel essai prévu » dans l'onglet, « Retenter » après retour → un e-mail ;
 *  4. import d'anciennes lignes → aucun e-mail, « Consentement non enregistré » ;
 *  5. Administration › Liste d'attente (ordinateur 1440 px et téléphone 390 px) : lignes, consentements, états ;
 *  6. client non administrateur : /admin renvoie au Studio, l'API répond 403, aucune coordonnée.
 * Usage : npx tsx scripts/waitlist-recette.ts <dossier de captures>
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

if (process.env.DATABASE_FILE || process.env.STORAGE_DIR || process.env.DATA_DIR) throw Error("Refus du stockage préexistant");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-waitlist-420-"));
process.env.DATA_DIR = dir; process.env.APP_SECRET = "waitlist-420-" + randomUUID();
for (const key of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "DASHSCOPE_API_KEY", "FAL_KEY", "GOOGLE_API_KEY", "PIXABAY_API_KEY"]) process.env[key] = "";
const out = path.resolve(process.argv[2] ?? "work/recette-waitlist-420");
fs.mkdirSync(out, { recursive: true });

const { account } = await import("../tests/conversation209-fixtures");
const { id, now, run, all } = await import("../src/lib/db");
const { sha256 } = await import("../src/lib/secrets");
const { setSetting } = await import("../src/lib/settings");
const { rotateIngestSecret, signPayload, ensureWaitlistTables, DEFAULT_NOTIFY_TO } = await import("../src/lib/waitlist");
const { SmtpSink } = await import("../tests/smtp-sink");
const { chromium } = await import("playwright");

const sink = await new SmtpSink().start();
setSetting("smtp.host", "127.0.0.1"); setSetting("smtp.port", String(sink.port)); setSetting("smtp.from", "Studio Test <notifications@studio.test>");
ensureWaitlistTables();
const secret = rotateIngestSecret();
const adminUser = await account(), client = await account();
run("UPDATE users SET role = 'admin' WHERE id = ?", adminUser.id);
const session = (uid: string) => { const t = id(); run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)", sha256(t), uid, now() + 3600000, now()); return t; };
const adminToken = session(adminUser.id), clientToken = session(client.id);

const port = 6900 + Math.floor(Math.random() * 90), origin = `http://localhost:${port}`;
const server = spawn(process.execPath, [path.resolve("node_modules/next/dist/bin/next"), "dev", "-p", String(port), "-H", "127.0.0.1"], { env: { ...process.env, APP_URL: origin, NEXT_TELEMETRY_DISABLED: "1", NODE_OPTIONS: `--import=${path.resolve("scripts/lot9/network-guard.mjs")}` }, stdio: ["ignore", "pipe", "pipe"], detached: true });
let log = ""; server.stdout.on("data", (d) => { log += d; }); server.stderr.on("data", (d) => { log += d; });
const stop = () => { try { process.kill(-server.pid!, "SIGTERM"); } catch { /* arrêté */ } };
process.on("exit", stop);

const steps: { etape: string; ok: boolean; detail?: string }[] = [];
const check = (c: unknown, m: string) => { if (!c) throw Error(m); };
const step = async (etape: string, fn: () => Promise<string | void>) => {
  try { const d = await fn(); steps.push({ etape, ok: true, ...(d ? { detail: d } : {}) }); console.log(`  ✓ ${etape}${d ? " — " + d : ""}`); }
  catch (e) { steps.push({ etape, ok: false, detail: String(e).slice(0, 400) }); console.log(`  ✗ ${etape} : ${String(e).slice(0, 300)}`); }
};
const fake = (n: number) => ({ id: `d1-recette-${n}`, firstName: `Prénom${n}`, email: `inscrit.recette.${n}@example.com`, category: n % 2 ? "Boutique en ligne" : "Prestations de services", description: `Projet fictif de recette n°${n}`, consent: true, consentAt: new Date().toISOString(), createdAt: new Date().toISOString() });
const ingest = async (payload: unknown, sig?: string) => { const raw = JSON.stringify(payload); return fetch(`${origin}/api/waitlist/ingest`, { method: "POST", headers: { "content-type": "application/json", "x-waitlist-signature": sig ?? signPayload(raw, secret) }, body: raw }); };
const rows = () => all<{ email: string; notify_status: string; notify_attempts: number }>("SELECT email, notify_status, notify_attempts FROM waitlist_signups ORDER BY received_at");
const waitFor = async (cond: () => boolean, ms = 30000) => { const end = Date.now() + ms; while (!cond()) { if (Date.now() > end) throw Error("délai dépassé"); await new Promise((r) => setTimeout(r, 100)); } };

try {
  const start = Date.now();
  for (;;) { if (Date.now() - start > 240000) throw Error("Next non prêt : " + log.slice(-800)); try { if ((await fetch(origin + "/connexion", { signal: AbortSignal.timeout(3000) })).ok) break; } catch { /* attente */ } await new Promise((r) => setTimeout(r, 1000)); }
  await step("Inscription fictive signée → 201, notification unique à l'adresse interne", async () => {
    const r = await ingest({ kind: "signup", signup: fake(1) });
    const body = await r.text(); check(r.status === 201 && !body.includes("example.com"), `${r.status} ${body}`);
    await waitFor(() => sink.messages.length === 1);
    check(sink.messages[0].to.join() === DEFAULT_NOTIFY_TO, `destinataire ${sink.messages[0].to}`);
    return `e-mail reçu par le SMTP local pour ${DEFAULT_NOTIFY_TO}`;
  });
  await step("Requête non signée ou mal signée → 401, rien d'enregistré", async () => {
    const r = await ingest({ kind: "signup", signup: fake(99) }, "t=1,v1=" + "0".repeat(64));
    check(r.status === 401 && !rows().some((x) => x.email.includes(".99@")), `${r.status}`);
  });
  await step("Même inscription renvoyée → doublon, aucun second e-mail", async () => {
    const r = await ingest({ kind: "signup", signup: { ...fake(1), email: "INSCRIT.recette.1@example.com" } });
    const j = await r.json(); check(r.status === 200 && j.status === "duplicate", JSON.stringify(j));
    await new Promise((res) => setTimeout(res, 1500)); check(sink.messages.length === 1 && rows().length === 1, `${sink.messages.length} e-mails`);
  });
  await step("Panne SMTP → inscription enregistrée, notification en attente", async () => {
    sink.mode = "tempfail";
    check((await ingest({ kind: "signup", signup: fake(2) })).status === 201, "réception");
    await waitFor(() => rows().some((x) => x.email.includes(".2@") && x.notify_status === "pending" && x.notify_attempts === 1));
    check(sink.messages.length === 1, "aucun e-mail pendant la panne");
  });
  await step("Import de deux anciennes inscriptions → aucun e-mail", async () => {
    const r = await ingest({ kind: "import", signups: [{ email: "ancienne.1@example.com", category: "Restaurant", created_at: "2026-10-20 09:15:00" }, { email: "ancienne.2@example.com", prenom: "Ancienne", categorie: "Site vitrine", consentement: "oui", created_at: "2026-10-21 17:40:00" }] });
    check((await r.json()).created === 2, "import"); check(sink.messages.length === 1, "e-mail rétroactif");
  });
  const b = await chromium.launch({ args: ["--no-sandbox", "--disable-background-networking"] });
  for (const format of ["ordinateur", "telephone"] as const) {
    const ctx = await b.newContext({ viewport: format === "ordinateur" ? { width: 1440, height: 1000 } : { width: 390, height: 844 }, locale: "fr-FR", ...(format === "telephone" ? { isMobile: true, hasTouch: true } : {}) });
    await ctx.addInitScript(() => { try { sessionStorage.setItem("ecsSeen", "1"); } catch { /* */ } });
    await ctx.addCookies([{ name: "ecs_session", value: adminToken, url: origin }]);
    await ctx.route("**/*", (r) => (new URL(r.request().url()).origin === origin ? r.continue() : r.abort()));
    const page = await ctx.newPage(); page.setDefaultTimeout(120000);
    const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
    await step(`${format} : Administration › Liste d'attente montre les 4 inscriptions avec consentement et état`, async () => {
      await page.goto(`${origin}/admin`, { waitUntil: "networkidle", timeout: 180000 });
      await page.getByRole("button", { name: "Liste d'attente", exact: true }).click();
      const list = page.getByRole("list", { name: "Inscriptions" }); await list.waitFor();
      const txt = await list.innerText();
      for (const s of ["inscrit.recette.1@example.com", "Prénom1", "Boutique en ligne", "Projet fictif de recette n°1", "Notifiée", "inscrit.recette.2@example.com", format === "ordinateur" ? "Nouvel essai prévu" : "Notifiée", "ancienne.1@example.com", "Consentement non enregistré", "Importée — sans e-mail", "Consentement donné", "Réinscrite 1 fois"]) check(txt.includes(s), `absent : ${s}`);
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "débordement horizontal");
      await page.screenshot({ path: path.join(out, `${format}-1-liste.png`), fullPage: true });
      check(!errors.length, errors.join(" | "));
    });
    if (format === "ordinateur") await step("Retour du SMTP → « Retenter la notification » → Notifiée, un seul e-mail de plus", async () => {
      sink.mode = "ok";
      const row = page.locator("li", { hasText: "inscrit.recette.2@example.com" });
      await row.getByRole("button", { name: "Retenter la notification" }).click();
      await row.getByText(/Notifiée/).waitFor();
      check(sink.messages.length === 2, `${sink.messages.length} e-mails`);
      await page.screenshot({ path: path.join(out, `${format}-2-retente.png`), fullPage: true });
    });
    await ctx.close();
  }
  await step("Client non administrateur : /admin renvoie au Studio, API 403 sans coordonnées", async () => {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addCookies([{ name: "ecs_session", value: clientToken, url: origin }]);
    await ctx.route("**/*", (r) => (new URL(r.request().url()).origin === origin ? r.continue() : r.abort()));
    const page = await ctx.newPage(); page.setDefaultTimeout(120000);
    await page.goto(`${origin}/admin`, { waitUntil: "networkidle", timeout: 180000 });
    check(!new URL(page.url()).pathname.startsWith("/admin"), `resté sur ${page.url()}`);
    const r = await page.request.get(`${origin}/api/admin/waitlist`); const body = await r.text();
    check(r.status() === 403 && !body.includes("example.com"), `${r.status()} ${body.slice(0, 120)}`);
    const anon = await fetch(`${origin}/api/admin/waitlist`); check(anon.status === 401, `anonyme ${anon.status}`);
    await ctx.close();
    return `redirigé vers ${new URL(page.url()).pathname}`;
  });
  await b.close();
} catch (e) { steps.push({ etape: "recette", ok: false, detail: String(e) }); console.error("✗ " + String(e)); }
finally {
  stop(); await sink.stop();
  fs.writeFileSync(path.join(out, "RESUME-WAITLIST-420.json"), JSON.stringify({ steps, emails: sink.messages.length }, null, 2) + "\n");
  fs.writeFileSync(path.join(out, "serveur-local.log"), log.slice(-100000));
  fs.rmSync(dir, { recursive: true, force: true });
  const ok = steps.filter((s) => s.ok).length; console.log(`${ok}/${steps.length} étapes réussies`);
  if (ok !== steps.length) process.exitCode = 1;
}
