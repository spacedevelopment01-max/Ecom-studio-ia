/**
 * Recette #301 C21 — modifier un bien, un plat ou une réalisation depuis SINA (contrat #310 de Codex), vrai parcours
 * dans la coquille Encre / Plein cadre, ordinateur (1440 px) et téléphone (390 px) :
 *   encre · ordinateur  : plat — prix « 18,50 € », réponse perdue après l'enregistrement, vérification sans 2e écriture ;
 *   encre · téléphone   : bien — nouveau nom ;
 *   plein · ordinateur  : réalisation — demande ambiguë, annulation, nouveau nom (adresse de page annoncée) ;
 *   plein · téléphone   : plat — prix.
 * À chaque fois : « Désigner pour SINA » dans l'espace natif, carte avant / après « Gratuit — 0 € » sans devis,
 * reçu relu, liste de l'espace à jour sans recharger, rechargement, statut inchangé, 0 appel IA, aucun débordement.
 * Stockage temporaire isolé, clés vides, réseau hors boucle locale refusé, comptes et contenus fictifs.
 * Usage : npx tsx scripts/syna301-contenus-recette.ts <dossier de sortie>
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

if (process.env.DATABASE_FILE || process.env.STORAGE_DIR || process.env.DATA_DIR) throw Error("Refus du stockage préexistant");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-contenus301-"));
process.env.DATA_DIR = dir; process.env.STOCK_OFFLINE = "1"; process.env.APP_SECRET = "contenus301-" + randomUUID();
for (const key of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "DASHSCOPE_API_KEY", "FAL_KEY", "GOOGLE_API_KEY", "PIXABAY_API_KEY"]) process.env[key] = "";
Object.assign(process.env, Object.fromEntries(["LOT_A", "AI", "UI", "CONTEXT", "BUSINESS_CONTENT"].map((k) => ["STUDIO_CONVERSATION_" + k, "1"])), { STUDIO_SYNA_SHELL: "1" });
const out = path.resolve(process.argv[2] ?? "work/recette-contenus-301");
fs.mkdirSync(out, { recursive: true });

const { account, project } = await import("../tests/conversation209-fixtures");
const { serviceSpec } = await import("../tests/fixtures");
const { saveThemeVersion } = await import("../src/lib/projects");
const { openProjectConversation } = await import("../src/lib/orchestrator/conversation");
const { adapter } = await import("../src/lib/contenus/api");
const { createBien } = await import("../src/lib/biens");
const { addCategory, createItem } = await import("../src/lib/contenus/carte");
const { createRealisation } = await import("../src/lib/contenus/realisations");
const { writeSynaPrefs } = await import("../src/lib/syna-ui/prefs-store");
const { id, run, one, all, now } = await import("../src/lib/db");
const { sha256 } = await import("../src/lib/secrets");
const { chromium } = await import("playwright");

type Mode = "encre" | "plein";
type Type = "biens" | "plats" | "realisations";
type Case = { mode: Mode; format: "ordinateur" | "telephone"; type: Type; ask: string; expect: { field: "title" | "price"; value: string | number; shown: RegExp }; extras: boolean; lose: boolean; second: { ask: string; field: "title" | "price"; value: string | number } };
const CASES: Case[] = [
  { mode: "encre", format: "ordinateur", type: "plats", ask: "Modifie le prix de ce plat à 18,50 €", expect: { field: "price", value: 18.5, shown: /18,50?\s?€/ }, extras: false, lose: true, second: { ask: "Modifie le prix de ce plat à 19 €", field: "price", value: 19 } },
  { mode: "encre", format: "telephone", type: "biens", ask: "Renomme ce bien en « Maison des Tilleuls »", expect: { field: "title", value: "Maison des Tilleuls", shown: /Maison des Tilleuls/ }, extras: false, lose: false, second: { ask: "Renomme ce bien en « Maison des Saules »", field: "title", value: "Maison des Saules" } },
  { mode: "plein", format: "ordinateur", type: "realisations", ask: "Renomme cette réalisation en « Van Sprinter aménagé »", expect: { field: "title", value: "Van Sprinter aménagé", shown: /Van Sprinter aménagé/ }, extras: true, lose: false, second: { ask: "Renomme cette réalisation en « Fourgon aménagé »", field: "title", value: "Fourgon aménagé" } },
  { mode: "plein", format: "telephone", type: "plats", ask: "Modifie le prix de ce plat à 21 €", expect: { field: "price", value: 21, shown: /21(,00)?\s?€/ }, extras: false, lose: false, second: { ask: "Modifie le prix de ce plat à 22 €", field: "price", value: 22 } },
];
const TAB = { biens: "biens", plats: "carte", realisations: "realisations" } as const;
const INITIAL = { biens: "Maison fictive", plats: "Velouté de saison", realisations: "Aménagement de van fictif" } as const;
const SIZE = { ordinateur: { width: 1440, height: 1000 }, telephone: { width: 390, height: 844 } } as const;

const prepared = [] as (Case & { pid: string; cid: string; itemId: string; token: string; status: string | null })[];
for (const k of CASES) {
  const u = await account(), pid = project(u, "services"), c = openProjectConversation(u, pid);
  saveThemeVersion(pid, serviceSpec(k.type === "biens" ? "maison-horizon" : k.type === "plats" ? "table-saison" : "rive"), "Contexte métier fictif", "user");
  const itemId = k.type === "biens" ? createBien(u.id, pid, { transaction: "vente", data: { title: INITIAL.biens, summary: "À Lyon." } }).id
    : k.type === "plats" ? createItem(pid, { categoryId: addCategory(pid, "Entrées").id, name: INITIAL.plats, price: 16, description: "Légumes du marché." }).id
    : createRealisation(pid, { title: INITIAL.realisations, summary: "Rangements sur mesure." }).id;
  const token = id();
  run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)", sha256(token), u.id, now() + 3600000, now());
  writeSynaPrefs(u.id, "account", null, { mode: k.mode, panel: "collapsed" });
  prepared.push({ ...k, pid, cid: c.id, itemId, token, status: adapter(k.type).get(pid, itemId).status });
}

const port = 5600 + Math.floor(Math.random() * 150), origin = `http://localhost:${port}`;
const server = spawn(process.execPath, [path.resolve("node_modules/next/dist/bin/next"), "dev", "-p", String(port), "-H", "127.0.0.1"], {
  env: { ...process.env, APP_URL: origin, NEXT_TELEMETRY_DISABLED: "1", NODE_OPTIONS: `--import=${path.resolve("scripts/lot9/network-guard.mjs")}` },
  stdio: ["ignore", "pipe", "pipe"], detached: true,
});
let log = "";
server.stdout.on("data", (d) => { log += d; }); server.stderr.on("data", (d) => { log += d; });
const stop = () => { try { process.kill(-server.pid!, "SIGTERM"); } catch { /* déjà arrêté */ } };
process.on("exit", stop);

type Step = { etape: string; ok: boolean; detail?: string; capture?: string };
const results: { mode: Mode; format: string; type: Type; steps: Step[]; ok: boolean }[] = [];
const errors: string[] = [], forbidden: string[] = [], jsErrors: string[] = [];
const check = (cond: unknown, message: string) => { if (!cond) throw Error(message); };

try {
  const start = Date.now();
  for (;;) {
    if (Date.now() - start > 240000) throw Error("Next non prêt : " + log.slice(-1200));
    try { if ((await fetch(origin + "/connexion", { signal: AbortSignal.timeout(3000) })).ok) break; } catch { /* attente */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  const b = await chromium.launch({ args: ["--no-sandbox", "--disable-background-networking"] });
  for (const k of prepared) {
    const label = `${k.mode}-${k.format}-${k.type}`, steps: Step[] = [];
    const context = await b.newContext({ viewport: SIZE[k.format], locale: "fr-FR", reducedMotion: "reduce" });
    await context.addInitScript(() => { (globalThis as { __name?: unknown }).__name = (t: unknown) => t; });
    await context.addCookies([{ name: "ecs_session", value: k.token, url: origin }]);
    await context.route("**/*", (r) => { if (new URL(r.request().url()).origin === origin) return r.continue(); forbidden.push(r.request().url()); return r.abort(); });
    const page = await context.newPage();
    page.setDefaultTimeout(45000);
    page.on("pageerror", (e) => jsErrors.push(`${label} : ${e.message}`));
    const confirmBodies: Record<string, unknown>[] = [];
    page.on("request", (r) => { if (r.method() === "POST" && /"confirm-business-content"/.test(r.postData() ?? "")) confirmBodies.push(JSON.parse(r.postData()!)); });
    const panel = page.locator("#syna-panel:visible"), card = panel.getByRole("region", { name: "Modification gratuite du contenu", exact: true });
    const shot = async (name: string) => { const file = `${label}-${name}.png`; await page.screenshot({ path: path.join(out, file) }); return file; };
    const step = async (etape: string, fn: () => Promise<string | void>) => {
      try { const detail = await fn(); steps.push({ etape, ok: true, ...(detail ? { detail } : {}) }); console.log(`  ✓ ${label} · ${etape}${detail ? " — " + detail : ""}`); }
      catch (e) { steps.push({ etape, ok: false, detail: String(e).slice(0, 400), capture: await shot("echec-" + steps.length).catch(() => undefined) }); console.log(`  ✗ ${label} · ${etape} : ${String(e).slice(0, 300)}`); throw e; }
    };
    const closeSyna = async () => { if (await panel.count()) await panel.getByRole("button", { name: "Replier SINA", exact: true }).first().click(); await page.locator("#syna-panel:visible").waitFor({ state: "detached" }).catch(() => {}); };
    const designate = async () => {
      await closeSyna();
      await page.getByRole("button", { name: "Désigner pour SINA", exact: true }).first().click();
      await panel.waitFor();
      await panel.locator("[data-agent-active-context]").getByText(/Contenu désigné/).waitFor();
    };
    const send = async (text: string) => {
      await panel.getByRole("textbox", { name: "Décrivez votre projet ou posez votre question à SINA" }).fill(text);
      await panel.getByRole("button", { name: "Enregistrer", exact: true }).click();
    };
    const item = () => adapter(k.type).get(k.pid, k.itemId) as { title: string; status: string | null; version: string; data: { price?: number | null } };
    const noOverflow = async () => check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "débordement horizontal");
    try {
      await step("ouverture de l'espace natif dans le mode du compte", async () => {
        await page.goto(`${origin}/studio/${k.pid}/${TAB[k.type]}`, { waitUntil: "networkidle", timeout: 180000 });
        await page.locator("#ecs-splash").waitFor({ state: "hidden" });
        const nudge = page.locator("[data-tuto-nudge]");
        if (await nudge.isVisible()) await nudge.locator("button").last().click();
        const mode = await page.locator("[data-syna-shell]").first().getAttribute("data-syna-shell");
        check(mode === k.mode, `mode ${mode} au lieu de ${k.mode}`);
        await page.getByText(INITIAL[k.type], { exact: true }).first().waitFor();
        await noOverflow();
        await shot("0-espace");
      });
      await step("« Désigner pour SINA » : la fiche devient la cible", async () => {
        await designate();
        const line = await panel.locator("[data-agent-active-context]").innerText();
        check(line.includes(INITIAL[k.type]), `désignation inattendue : ${line}`);
        await shot("1-designation");
        return line.split("\n").find((l) => /désign/.test(l))?.trim();
      });
      if (k.extras) {
        await step("demande ambiguë : explication, aucun bouton, rien d'écrit", async () => {
          const before = item().version;
          await send("Renomme cette réalisation joliment");
          await card.getByText(/Précisez : Renomme cette réalisation/).waitFor();
          check(!(await card.getByRole("button", { name: "Confirmer gratuitement" }).count()), "bouton sur une demande ambiguë");
          check(item().version === before, "écriture sur une demande ambiguë");
          await shot("2-ambigu");
        });
        await step("annulation avant l'accord : rien n'est écrit", async () => {
          const before = item().version;
          await send("Renomme cette réalisation en « Nom à ne pas garder »");
          await card.getByRole("button", { name: "Annuler", exact: true }).click();
          await card.waitFor({ state: "detached" });
          check(item().version === before && item().title === INITIAL[k.type], "écriture malgré l'annulation");
        });
      }
      await step("proposition : avant / après, Gratuit — 0 €, aucun devis, aucune écriture", async () => {
        const before = item().version;
        await send(k.ask);
        await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).waitFor();
        const txt = await card.innerText();
        check(/Gratuit — 0 €/.test(txt) && /Avant : /.test(txt) && k.expect.shown.test(txt), `carte incomplète : ${txt}`);
        check(/Aucun appel de publication/.test(txt), "absence de publication non annoncée");
        check(!(await panel.getByRole("button", { name: "Voir le devis de la réponse de SINA" }).count()), "bouton de devis pour une modification gratuite");
        check(item().version === before, "écriture avant l'accord");
        await noOverflow();
        await shot("3-proposition");
        return txt.split("\n").filter((l) => /Avant|Après/.test(l)).join(" | ");
      });
      if (k.lose) {
        await step("réponse perdue après l'enregistrement : vérification sans deuxième écriture", async () => {
          let lost = false;
          await page.route(`**/api/studio-agent/conversations/${k.cid}`, async (r) => {
            if (!lost && r.request().method() === "POST" && /"confirm-business-content"/.test(r.request().postData() ?? "")) { lost = true; await r.fetch(); return r.abort("connectionreset"); }
            return r.continue();
          });
          await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).click();
          await card.getByRole("button", { name: "Vérifier l’enregistrement", exact: true }).waitFor();
          await shot("4-reponse-perdue");
          await card.getByRole("button", { name: "Vérifier l’enregistrement", exact: true }).click();
          await card.getByRole("status").getByText(/Enregistré et relu · reçu/).waitFor();
          await page.unroute(`**/api/studio-agent/conversations/${k.cid}`);
          const turns = all<{ request_json: string }>("SELECT request_json FROM agent_conversation_turns WHERE conversation_id=?", k.cid).filter((t) => /confirm-business-content/.test(t.request_json));
          check(turns.length === 1, `${turns.length} confirmations enregistrées`);
          return "1 seule confirmation enregistrée";
        });
      } else {
        await step("confirmation gratuite", async () => {
          await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).click();
          await card.getByRole("status").getByText(/Enregistré et relu · reçu/).waitFor();
        });
      }
      await step("valeur exacte enregistrée, statut inchangé, espace à jour sans recharger", async () => {
        const it = item();
        if (k.expect.field === "title") check(it.title === k.expect.value, `titre ${it.title}`);
        else check(it.data.price === k.expect.value, `prix ${it.data.price}`);
        check(it.status === k.status, `statut changé : ${k.status} → ${it.status}`);
        await shot("5-recu");
        await closeSyna();
        if (k.expect.field === "title") await page.getByText(String(k.expect.value), { exact: true }).first().waitFor({ timeout: 10000 });
        else await page.getByText(k.expect.shown).first().waitFor({ timeout: 10000 });
        await noOverflow();
        await shot("6-espace-a-jour");
      });
      await step("la désignation suit la nouvelle version : une 2e demande reste possible", async () => {
        await page.getByRole("button", { name: /Désigné pour SINA|Désigner pour SINA/ }).first().waitFor();
        await page.locator('[aria-controls="syna-panel"]:visible').first().click();
        await panel.waitFor();
        const sel = await panel.locator("[data-agent-active-context]").innerText();
        check(/Contenu désigné/.test(sel), `désignation perdue : ${sel}`);
      });
      await step("rechargement : valeur et reçu conservés", async () => {
        await page.reload({ waitUntil: "networkidle" });
        if (k.expect.field === "title") await page.getByText(String(k.expect.value), { exact: true }).first().waitFor();
        else await page.getByText(k.expect.shown).first().waitFor();
        await page.locator('[aria-controls="syna-panel"]:visible').first().click();
        await card.getByRole("status").getByText(/Enregistré et relu · reçu/).waitFor();
        await shot("7-apres-rechargement");
      });
      await step("ancien accord resté en mémoire + rechargement : seule la nouvelle proposition est confirmée", async () => {
        const stale = confirmBodies.at(-1); check(stale?.proposalId, "corps de confirmation non relevé");
        const key = `syna-free-content:${k.cid}`;
        await page.evaluate(([kk, v]) => sessionStorage.setItem(kk, v), [key, JSON.stringify(stale)] as const);
        await page.reload({ waitUntil: "networkidle" });
        await designate();
        await send(k.second.ask);
        await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).waitFor();
        const turns = () => all<{ request_json: string }>("SELECT request_json FROM agent_conversation_turns WHERE conversation_id=?", k.cid).filter((t) => /confirm-business-content/.test(t.request_json)).length;
        const before = confirmBodies.length, n = turns();
        await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).click();
        await card.getByRole("status").getByText(/Enregistré et relu · reçu/).waitFor();
        const sent = confirmBodies.slice(before);
        check(sent.length === 1 && sent[0].proposalId !== stale!.proposalId && sent[0].requestId !== stale!.requestId, `envois : ${JSON.stringify(sent)}`);
        check(turns() === n + 1, "écritures en double ou absentes");
        const it = item();
        check(k.second.field === "title" ? it.title === k.second.value : it.data.price === k.second.value, `valeur relue : ${it.title} / ${it.data.price}`);
        check(!(await page.evaluate((kk) => sessionStorage.getItem(kk), key)), "accord encore en mémoire");
        await shot("8-ancien-accord-ecarte");
        return `envoyé ${sent[0].proposalId}, ancien ${stale!.proposalId} écarté`;
      });
    } catch (e) { errors.push(`${label} : ${String(e).slice(0, 300)}`); }
    results.push({ mode: k.mode, format: k.format, type: k.type, steps, ok: steps.length > 0 && steps.every((s) => s.ok) });
    await context.close();
  }
  await b.close();
  const calls = one<{ n: number }>("SELECT COUNT(*) n FROM ai_calls")!.n;
  console.log(`· appels IA : ${calls} · requêtes refusées hors boucle locale : ${forbidden.length} · erreurs JS : ${jsErrors.length}`);
  if (calls) errors.push(`ai_calls = ${calls}`);
  if (jsErrors.length) errors.push(...jsErrors);
} catch (e) {
  errors.push(String(e));
  console.error("✗ " + String(e));
} finally {
  stop();
  fs.writeFileSync(path.join(out, "RESUME-CONTENUS-301.json"), JSON.stringify({ schema: "syna301-contenus-recette-1", results, errors, forbidden, coutIA: 0 }, null, 2) + "\n");
  fs.writeFileSync(path.join(out, "serveur-local.log"), log);
  fs.rmSync(dir, { recursive: true, force: true });
  const ok = results.filter((r) => r.ok).length;
  console.log(`${ok}/${results.length} parcours réussis`);
  if (errors.length || ok !== results.length) process.exitCode = 1;
}
