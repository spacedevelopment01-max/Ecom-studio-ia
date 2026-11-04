import {waitAtLeast} from "../../scripts/lot9/wait-at-least";
/**
 * Recette #301 « SYNA complète », lot 9 — retouche réservable (contrat #418 / #419 de Codex) dans la conversation SYNA du
 * Studio, Encre / Plein cadre × 1440 / 390 px, projet de services avec réservation native :
 *  1. Rendez-vous : « Mets le prix réservable de « nom » à N € » → carte avant / après en euros → accord gratuit → prix
 *     relu dans la réservation native ET affiché par l'écran Rendez-vous sans rechargement, puis après rechargement ;
 *  2. « Peux-tu modifier la durée de réservation de « nom » à 45 minutes ? » → avant / après en minutes → Annuler →
 *     aucune écriture, aucune nouvelle version.
 * Stockage isolé, clés vides, réseau hors boucle locale refusé, 0 appel IA exigé.
 * Usage : npx tsx scripts/syna301-lot9-recette.ts <dossier de sortie>
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

if (process.env.DATABASE_FILE || process.env.STORAGE_DIR || process.env.DATA_DIR) throw Error("Refus du stockage préexistant");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-lot9-301-"));
process.env.DATA_DIR = dir; process.env.STOCK_OFFLINE = "1"; process.env.APP_SECRET = "lot9-301-" + randomUUID();
for (const key of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "DASHSCOPE_API_KEY", "FAL_KEY", "FAL_API_KEY", "GEMINI_API_KEY", "ALIBABA_MODEL_STUDIO_API_KEY", "GOOGLE_API_KEY", "PIXABAY_API_KEY"]) process.env[key] = "";
Object.assign(process.env, Object.fromEntries(["LOT_A", "AI", "UI", "CONTEXT", "SPECIALISTS", "TOOLS", "THEME_TOOLS", "LOCAL_SITE", "FILES", "SERVICE_PROFILE", "BOOKING_READ", "BOOKING_EDIT"].map((k) => ["STUDIO_CONVERSATION_" + k, "1"])), { STUDIO_SYNA_SHELL: "1" });
const out = path.resolve(process.argv[2] ?? "work/recette-lot9-301");
fs.mkdirSync(out, { recursive: true });

const { localSiteFixture } = await import("../../tests/conversation284-b1-fixtures");
const { currentTheme, loadProject, saveServices } = await import("../../src/lib/projects");
const { saveAsset, getAsset, assetData } = await import("../../src/lib/library");
const { saveThemeVersion, listThemeVersions } = await import("../../src/lib/projects");
const { serviceSpec } = await import("../../tests/fixtures");
const native = await import("../../src/lib/contenus/prestations");
const { createHash } = await import("node:crypto");
const { emptyServiceProfile } = await import("../../src/lib/project-types");
const { runWithLang } = await import("../../src/lib/i18n-server");
const { id, run, one, all, now } = await import("../../src/lib/db");
const { sha256 } = await import("../../src/lib/secrets");
const { writeSynaPrefs } = await import("../../src/lib/syna-ui/prefs-store");
const sharp = (await import("sharp")).default;
const { chromium } = await import("playwright");
const { prepareProject, realAiCalls, simulatedFixtureCalls, PREPARED } = await import("../../scripts/syna301-recette-preparee");

type Mode = "encre" | "plein";
type Format = "ordinateur" | "telephone";
const ONLY = process.env.RECETTE_CAS;
const ALL_CASES: { mode: Mode; format: Format; business: "services" }[] = [
  { mode: "encre", format: "ordinateur", business: "services" }, { mode: "encre", format: "telephone", business: "services" },
  { mode: "plein", format: "ordinateur", business: "services" }, { mode: "plein", format: "telephone", business: "services" },
];
const CASES = ALL_CASES.filter((k) => !ONLY || ONLY.split(",").includes(`${k.mode}-${k.format}`));
const SIZE = { ordinateur: { width: 1440, height: 1000 }, telephone: { width: 390, height: 844 } } as const;
const prepared: (typeof CASES[number] & Awaited<ReturnType<typeof localSiteFixture>> & { token: string })[] = [];
for (const k of CASES) {
  const f = await runWithLang({ ui: "fr", content: "fr" }, () => localSiteFixture(k.business));
  saveThemeVersion(f.pid, serviceSpec("atelier-nuance" as never), "Réservation de démonstration", "user");
  prepareProject(f.u as never, f.c.id, f.pid);
  saveServices(f.pid, { ...emptyServiceProfile(), hours: "Lundi 09–17", phone: "04 00 00 00 00", email: "atelier@example.test", area: "Lyon", services: [{ name: "Diagnostic", description: "Examen fourni", price: "50 €", duration: "30 min" }] } as never);
  const token = id(); run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)", sha256(token), f.u.id, now() + 3600000, now());
  writeSynaPrefs(f.u.id, "account", null, { mode: k.mode, panel: "collapsed" });
  prepared.push({ ...k, ...f, token });
}
const photoFile = path.join(dir, "photo-atelier-recette.png");
fs.writeFileSync(photoFile, await sharp({ create: { width: 640, height: 480, channels: 3, background: { r: 40, g: 120, b: 90 } } }).png().toBuffer());

const waits:number[]=[];let servedVersion:any=null;
const baselineAI=JSON.stringify(all('SELECT * FROM ai_calls ORDER BY id'));
const spendSnapshot=()=>JSON.stringify(['usage_events','ledger','jobs'].map(t=>({t,n:one<{n:number}>('SELECT COUNT(*) n FROM '+t)!.n})));
const quoteCount=()=>all<{name:string}>("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%quote%'").filter(r=>/^[a-z_]+$/.test(r.name)).reduce((n,r)=>n+one<{n:number}>('SELECT COUNT(*) n FROM '+r.name)!.n,0);
const baselineSpend=spendSnapshot(),baselineQuotes=quoteCount();
const port = 6800 + Math.floor(Math.random() * 90), origin = `http://localhost:${port}`;
const server = spawn(process.execPath, [path.resolve("node_modules/next/dist/bin/next"), "start", "-p", String(port), "-H", "127.0.0.1"], { env: { ...process.env, APP_URL: origin, NEXT_TELEMETRY_DISABLED: "1", NODE_OPTIONS: `--import=${path.resolve("scripts/lot9/network-guard.mjs")}` }, stdio: ["ignore", "pipe", "pipe"], detached: true });
let log = ""; server.stdout.on("data", (d) => { log += d; }); server.stderr.on("data", (d) => { log += d; });
const stop = () => { try { process.kill(-server.pid!, "SIGTERM"); } catch { /* arrêté */ } };
process.on("exit", stop);

type Step = { etape: string; ok: boolean; detail?: string; capture?: string };
const results: { mode: Mode; format: Format; business: string; steps: Step[]; ok: boolean }[] = [];
const errors: string[] = [], forbidden: string[] = [], jsErrors: string[] = [], constats: string[] = [];
const check = (c: unknown, m: string) => { if (!c) throw Error(m); };

try {
  const start = Date.now();
  for (;;) { if (Date.now() - start > 240000) throw Error("Next non prêt : " + log.slice(-800)); try { if ((await fetch(origin + "/connexion", { signal: AbortSignal.timeout(3000) })).ok) break; } catch { /* attente */ } await new Promise((r) => setTimeout(r, 1000)); }
  servedVersion=await(await fetch(origin+'/api/version')).json();
  check(servedVersion.commit==='9f8507c7776906e1ef85764b6419ce652b64c3c8'&&servedVersion.tree==='clean'&&servedVersion.mode==='production'&&servedVersion.source==='compiled-build','Incorrect compiled source');
  const b = await chromium.launch({ executablePath:"/usr/bin/chromium", args: ["--no-sandbox", "--disable-background-networking"] });
  for (const k of prepared) {
    const label = `${k.mode}-${k.format}-${k.business}`, steps: Step[] = [];
    const ctx = await b.newContext({ viewport: SIZE[k.format], locale: "fr-FR", reducedMotion: "reduce", ...(k.format === "telephone" ? { hasTouch: true, isMobile: true } : {}) });
    await ctx.addInitScript(() => { (globalThis as { __name?: unknown }).__name = (t: unknown) => t; try { sessionStorage.setItem("ecsSeen", "1"); } catch { /* */ } });
    await ctx.addCookies([{ name: "ecs_session", value: k.token, url: origin }]);
    await ctx.route("**/*", (r) => { if (new URL(r.request().url()).origin === origin) return r.continue(); forbidden.push(r.request().url()); return r.abort(); });
    const page = await ctx.newPage(); page.setDefaultTimeout(120000);
    page.on("pageerror", (e) => jsErrors.push(`${label} : ${e.message}`));
    const panel = page.locator("#syna-panel:visible");
    const shot = async (n: string) => { const file = `${label}-${n}.png`; await page.screenshot({ path: path.join(out, file) }); return file; };
    const step = async (etape: string, fn: () => Promise<string | void>) => {
      try { const d = await fn(); steps.push({ etape, ok: true, ...(d ? { detail: d } : {}) }); console.log(`  ✓ ${label} · ${etape}${d ? " — " + d : ""}`); }
      catch (e) { steps.push({ etape, ok: false, detail: String(e).slice(0, 400), capture: await shot("echec-" + steps.length).catch(() => undefined) }); console.log(`  ✗ ${label} · ${etape} : ${String(e).slice(0, 300)}`); throw e; }
    };
    const openSyna = async () => {
      for (let i = 0; i < 3 && !(await panel.count()); i++) {
        const trigger = page.locator('[aria-controls="syna-panel"]:visible').first();
        try { await trigger.click({ timeout: 20000 }); }
        catch (e) {
          // Diagnostic : qui reçoit le toucher à la place du bouton « Syna » ?
          const who = await trigger.evaluate((el) => { const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, top = document.elementFromPoint(x, y); return `bouton ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}×${Math.round(r.height)} · fenêtre ${innerWidth}×${innerHeight} · reçu par ${top ? top.tagName + "." + String(top.className).slice(0, 80) + (el.contains(top) ? " (le bouton)" : "") : "rien"}`; }).catch((x) => String(x));
          throw Error(`bouton Syna inaccessible : ${who} · ${String(e).slice(0, 120)}`);
        }
        await panel.waitFor({ timeout: 10000 }).catch(() => {});
      }
      await panel.waitFor();
    };
    const box = () => panel.getByRole("textbox", { name: "Décrivez votre projet ou posez votre question à SYNA" });
    const say = async (text: string) => { await openSyna(); await box().fill(text); await panel.getByRole("button", { name: "Enregistrer", exact: true }).click(); };
    const noQuote = async () => check(!(await panel.getByRole("button", { name: "Voir le devis de la réponse de SYNA" }).count()), "bouton de devis affiché");
    const noOverflow = async () => check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "débordement horizontal");
    const goto = async (tab: string) => { await page.goto(`${origin}/studio/${k.pid}/${tab}`, { waitUntil: "networkidle", timeout: 180000 }); await page.locator("#ecs-splash").waitFor({ state: "hidden" }).catch(() => {}); const nudge = page.locator("[data-tuto-nudge]"); if (await nudge.isVisible()) await nudge.locator("button").last().click(); };
    const cur = () => currentTheme(k.pid)!;
    const bodies: Record<string, unknown>[] = [];
    page.on("request", (r) => { if (r.method() === "POST" && /\/api\/studio-agent\/conversations\/[^/]+$/.test(new URL(r.url()).pathname)) { try { bodies.push(r.postDataJSON()); } catch { /* multipart */ } } });
    const confirm = async (card: ReturnType<typeof panel.getByRole>, receipt: RegExp) => { const elapsed=await waitAtLeast(17000,ms=>page.waitForTimeout(ms));waits.push(elapsed);check(elapsed>=17000,'minimum wait');let lost=false;const startVersions=listThemeVersions(k.pid).length;const startBodies=bodies.length;
      await page.route('**/api/studio-agent/conversations/'+k.c.id,async route=>{let body:any;try{body=route.request().postDataJSON();}catch{}if(body?.action==='confirm-booking-edit'&&!lost){const response=await route.fetch();check(response.ok(),'server rejected lost-reply write');lost=true;await route.abort('failed');}else await route.continue();});
      await card.getByRole("button",{name:"Confirmer gratuitement",exact:true}).click();
      await card.getByRole('button',{name:'Vérifier l’enregistrement',exact:true}).waitFor();check(lost&&listThemeVersions(k.pid).length===startVersions+1,'lost reply did not commit exactly once');
      await noQuote();
      if(k.format==='telephone')await card.getByRole('button',{name:'Vérifier l’enregistrement',exact:true}).click();
      else await card.getByRole('button',{name:'Réessayer la même confirmation gratuite',exact:true}).click();
      await page.unroute('**/api/studio-agent/conversations/'+k.c.id);
      const retries=bodies.slice(startBodies).filter((r:any)=>r.action==='confirm-booking-edit');check(retries.length===(k.format==='telephone'?1:2),'unexpected confirmation POST count');check(retries.every((r:any)=>r.requestId===retries[0].requestId&&r.proposalId===retries[0].proposalId&&r.confirmation===true),'retry acquired a different agreement');check(listThemeVersions(k.pid).length===startVersions+1,'duplicate write after lost reply');
      await card.getByRole("status").getByText(receipt).waitFor();await noQuote();constats.push(`${label}: lost reply, ${retries.length} POST(s), one native version, ${k.format==='telephone'?'GET recovery':'same-request retry'}`); };
    try {
      type Row = { id: string; name: string; price: number | null; duration: number | null };
      const rows = () => (native.readPrestations(k.pid) as { services: Row[] } | null)?.services ?? [];
      const svc = rows().find((x) => typeof x.price === "number" && rows().filter((y) => y.name === x.name).length === 1);
      check(svc, "aucune prestation native à prix unique");
      const target = svc!, before = target.price!, after = before + 10;
      const euros = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
      const card = panel.getByRole("region", { name: "Retouche réservable — gratuit", exact: true });
      const rdvText = async () => (await page.locator("[data-rdv]").first().innerText()).replace(/\u202f|\u00a0/g, " ");
      await step(`Rendez-vous : « Mets le prix réservable de « ${target.name} » à ${after} € » → avant / après → accord → prix relu à l'écran sans recharger`, async () => {
        await goto("rendez-vous"); check((await page.locator("[data-syna-shell]").first().getAttribute("data-syna-shell")) === k.mode, "mode");
        const shownBefore = await rdvText(); check(shownBefore.includes(target.name), "prestation absente de l'écran Rendez-vous");
        await say(`Mets le prix réservable de « ${target.name} » à ${after} €`); await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).waitFor();
        const b4 = (await card.locator("[data-syna-booking-before]").innerText()).replace(/\u202f|\u00a0/g, " "), af = (await card.locator("[data-syna-booking-after]").innerText()).replace(/\u202f|\u00a0/g, " ");
        check(b4 === euros(before).replace(/\u202f|\u00a0/g, " ") && af === euros(after).replace(/\u202f|\u00a0/g, " "), `avant / après : ${b4} → ${af}`);
        check(rows().find((x) => x.id === target.id)!.price === before, "écriture avant l'accord"); await noQuote(); await noOverflow(); await shot("1-proposition");
        const versions = listThemeVersions(k.pid).length;
        await confirm(card, /Enregistré et relu · reçu/);
        check(rows().find((x) => x.id === target.id)!.price === after, "prix natif non relu"); check(listThemeVersions(k.pid).length === versions + 1, "une seule nouvelle version attendue");
        const want = `${after},00 €`;
        await page.waitForFunction((w) => (document.querySelector("[data-rdv]")?.textContent ?? "").replace(/\u202f|\u00a0/g, " ").includes(w), want, { timeout: 30000 }).catch(() => { throw Error(`l'écran Rendez-vous n'affiche pas ${want} sans rechargement`); });
        check((await card.getByRole("link", { name: "Voir dans Rendez-vous", exact: true }).getAttribute("href")) === `/studio/${k.pid}/rendez-vous`, "lien Rendez-vous");
        await noOverflow(); await shot("2-recu");
        await page.reload({ waitUntil: "networkidle" }); check((await rdvText()).includes(want), "prix perdu au rechargement");
        return `${euros(before)} → ${euros(after)}, écran à jour sans rechargement`;
      });
      await step(`« Peux-tu modifier la durée de réservation de « ${target.name} » à 45 minutes ? » → avant / après → Annuler → rien n'est écrit`, async () => {
        const dur = rows().find((x) => x.id === target.id)!.duration, next = dur === 45 ? 50 : 45, versions = listThemeVersions(k.pid).length;
        await say(`Peux-tu modifier la durée de réservation de « ${target.name} » à ${next} minutes ?`); await card.getByRole("button", { name: "Annuler", exact: true }).waitFor();
        const af = await card.locator("[data-syna-booking-after]").innerText(); check(af.includes(`${next} min`), `après : ${af}`); await shot("3-duree");
        await card.getByRole("button", { name: "Annuler", exact: true }).click(); await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).waitFor({ state: "detached", timeout: 30000 });
        check(rows().find((x) => x.id === target.id)!.duration === dur && listThemeVersions(k.pid).length === versions, "écriture après annulation"); await noQuote(); await noOverflow();
      });
    } catch (e) { errors.push(`${label} : ${String(e).slice(0, 300)}`); }
    results.push({ mode: k.mode, format: k.format, business: k.business, steps, ok: steps.length > 0 && steps.every((s) => s.ok) });
    await ctx.close();
  }
  await b.close();
  check(JSON.stringify(all('SELECT * FROM ai_calls ORDER BY id'))===baselineAI,'AI baseline changed');check(spendSnapshot()===baselineSpend,'spend/jobs changed');check(quoteCount()===baselineQuotes,'free action created a quote');
  const calls = realAiCalls();
  console.log(`· projet ${PREPARED ? "PRÉPARÉ" : "neuf"} · lignes simulées : ${simulatedFixtureCalls()} · appels IA : ${calls} · requêtes refusées hors boucle locale : ${forbidden.length} · erreurs JS : ${jsErrors.length}`);
  if (calls) errors.push(`ai_calls = ${calls}`); if (jsErrors.length) errors.push(...jsErrors);
} catch (e) { errors.push(String(e)); console.error("✗ " + String(e)); }
finally {
  stop();
  fs.writeFileSync(path.join(out, "RESUME-LOT9-301.json"), JSON.stringify({ schema: "syna301-lot9-recette-1", results, errors, constats, forbidden: [...new Set(forbidden)], coutIA: 0,servedVersion,waits,jsErrors,baselineQuotes,quotesAfter:quoteCount(),baselineSpend,spendAfter:spendSnapshot(),baselineAIUnchanged:JSON.stringify(all('SELECT * FROM ai_calls ORDER BY id'))===baselineAI }, null, 2) + "\n");
  fs.writeFileSync(path.join(out, "serveur-local.log"), log.slice(-200000));
  fs.rmSync(dir, { recursive: true, force: true });
  const ok = results.filter((r) => r.ok).length; console.log(`${ok}/${results.length} parcours réussis`); if (constats.length) console.log("Constats :\n" + constats.join("\n"));
  if (errors.length || ok !== results.length) process.exitCode = 1;
}
