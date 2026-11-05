/** Compiled Studio proof: natural hide/delete, free before/after, real 17s, native receipt/reload and natural undo. No supplier. Mobile designation is restored from a native A2 fixture; desktop designation uses the actual preview. */
import fs from "node:fs";
import { waitAtLeast } from "./lot9/wait-at-least";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

if (process.env.DATABASE_FILE || process.env.STORAGE_DIR || process.env.DATA_DIR) throw Error("Refus du stockage préexistant");
if(!fs.existsSync('.next/BUILD_ID'))throw Error('Un build de production est nécessaire');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-section301-"));
process.env.DATA_DIR = dir; process.env.STOCK_OFFLINE = "1"; process.env.APP_SECRET = "site301-" + randomUUID();
for (const key of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "DASHSCOPE_API_KEY", "FAL_KEY", "GOOGLE_API_KEY", "PIXABAY_API_KEY"]) process.env[key] = "";
Object.assign(process.env, Object.fromEntries(["LOT_A", "AI", "UI", "CONTEXT", "LOCAL_SITE"].map((k) => ["STUDIO_CONVERSATION_" + k, "1"])), { STUDIO_SYNA_SHELL: "1" });
const out = path.resolve(process.argv[2] ?? "work/recette-sections-natives-301");
fs.mkdirSync(out, { recursive: true });

const { localSiteFixture } = await import("../tests/conversation284-b1-fixtures");
const { currentTheme, saveThemeVersion } = await import("../src/lib/projects");
const { runWithLang } = await import("../src/lib/i18n-server");
const { id, run, one, now } = await import("../src/lib/db");
const { sha256 } = await import("../src/lib/secrets");
const { writeSynaPrefs } = await import("../src/lib/syna-ui/prefs-store");
const { chromium } = await import("playwright");

type Mode = "encre" | "plein";
type Format = "ordinateur" | "telephone";
const ONLY = process.env.RECETTE_CAS; // ex. « encre-telephone » : rejouer un seul cas pour diagnostic
const ALL_CASES: { mode: Mode; format: Format; business: "products" | "services" }[] = [
  { mode: "encre", format: "ordinateur", business: "products" }, { mode: "encre", format: "telephone", business: "services" },
  { mode: "plein", format: "ordinateur", business: "services" }, { mode: "plein", format: "telephone", business: "products" },
];
const CASES = ALL_CASES.filter((k) => !ONLY || `${k.mode}-${k.format}` === ONLY);
if(!CASES.length)throw Error('Aucun cas de recette sélectionné');
const SIZE = { ordinateur: { width: 1440, height: 1000 }, telephone: { width: 390, height: 844 } } as const;
const prepared: (typeof CASES[number] & Awaited<ReturnType<typeof localSiteFixture>> & { token: string })[] = [];
for (const k of CASES) {
  const f = await runWithLang({ ui: "fr", content: "fr" }, () => localSiteFixture(k.business));
  const token = id(); run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)", sha256(token), f.u.id, now() + 3600000, now());
  writeSynaPrefs(f.u.id, "account", null, { mode: k.mode, panel: "collapsed" });
  prepared.push({ ...k, ...f, token });
}

const port = 6300 + Math.floor(Math.random() * 90), origin = `http://localhost:${port}`;
const server = spawn(process.execPath, [path.resolve("node_modules/next/dist/bin/next"), "start", "-p", String(port), "-H", "127.0.0.1"], { env: { ...process.env, APP_URL: origin, NEXT_TELEMETRY_DISABLED: "1", NODE_OPTIONS: `--import=${path.resolve("scripts/lot9/network-guard.mjs")}` }, stdio: ["ignore", "pipe", "pipe"], detached: true });
let log = ""; server.stdout.on("data", (d) => { log += d; }); server.stderr.on("data", (d) => { log += d; });
const stop = () => { try { process.kill(-server.pid!, "SIGTERM"); } catch { /* arrêté */ } };
process.on("exit", stop);

type Step = { etape: string; ok: boolean; detail?: string; capture?: string };
const results: { mode: Mode; format: Format; business: string; steps: Step[]; ok: boolean }[] = [];
let browserVersion='not_started';
const errors: string[] = [], forbidden: string[] = [], jsErrors: string[] = [];
const check = (c: unknown, m: string) => { if (!c) throw Error(m); };
const spec = (pid: string) => currentTheme(pid)!.spec as unknown as { templates: { index: { order: string[]; sections: Record<string, { type: string; disabled?: boolean; settings: Record<string, unknown> }> } } };

try {
  const start = Date.now();
  for (;;) { if (Date.now() - start > 240000) throw Error("Next non prêt : " + log.slice(-800)); try { if ((await fetch(origin + "/connexion", { signal: AbortSignal.timeout(3000) })).ok) break; } catch { /* attente */ } await new Promise((r) => setTimeout(r, 1000)); }
  const b = await chromium.launch({ ...(process.env.STUDIO_PROOF_CHROMIUM?{executablePath:process.env.STUDIO_PROOF_CHROMIUM}:{}),args: ["--no-sandbox", "--disable-background-networking"] });
  browserVersion=b.version();
  for (const k of prepared) {
    const label = `${k.mode}-${k.format}-${k.business}`, steps: Step[] = [], desktop = k.format === "ordinateur";
    const ctx = await b.newContext({ viewport: SIZE[k.format], locale: "fr-FR", reducedMotion: "reduce" });
    await ctx.addInitScript(() => { (globalThis as { __name?: unknown }).__name = (t: unknown) => t; try { sessionStorage.setItem("ecsSeen", "1"); } catch { /* */ } });
    await ctx.addCookies([{ name: "ecs_session", value: k.token, url: origin }]);
    await ctx.route("**/*", (r) => { if (new URL(r.request().url()).origin === origin) return r.continue(); forbidden.push(r.request().url()); return r.abort(); });
    const page = await ctx.newPage(); page.setDefaultTimeout(60000);
    page.on("pageerror", (e) => jsErrors.push(`${label} : ${e.message}`));
    // Journal des confirmations gratuites : corps envoyé et réponse exacte du serveur (diagnostic, jamais d'assertion cachée).
    page.on("response", async (r) => { try { if (r.request().method() === "POST" && /\/api\/studio-agent\/conversations\/[^/]+$/.test(new URL(r.url()).pathname)) { const body = r.request().postDataJSON() as { action?: string; proposalId?: string; requestId?: string }; if (body?.action === "confirm-local" || body?.action === "message") { const j = await r.json().catch(() => null) as { localSite?: { state?: string; command?: string; proposalId?: string; version?: { number?: number } }; error?: string } | null; console.log(`    [http] ${label} ${body.action} ${body.proposalId ?? ""} → ${r.status()} ${j?.localSite?.state ?? j?.error ?? ""} ${j?.localSite?.command ?? ""} v${j?.localSite?.version?.number ?? "-"} prop=${j?.localSite?.proposalId ?? ""}`); } } } catch { /* journal seulement */ } });
    const panel = page.locator("#syna-panel:visible"), free = panel.getByRole("region", { name: "Retouche gratuite", exact: true });
    const frame = () => page.frameLocator('iframe[title^="Aperçu"]');
    const shot = async (n: string) => { const file = `${label}-${n}.png`; await page.screenshot({ path: path.join(out, file) }); return file; };
    const step = async (etape: string, fn: () => Promise<string | void>) => {
      try { const d = await fn(); steps.push({ etape, ok: true, ...(d ? { detail: d } : {}) }); console.log(`  ✓ ${label} · ${etape}${d ? " — " + d : ""}`); }
      catch (e) { steps.push({ etape, ok: false, detail: String(e).slice(0, 400), capture: await shot("echec-" + steps.length).catch(() => undefined) }); console.log(`  ✗ ${label} · ${etape} : ${String(e).slice(0, 300)}`); throw e; }
    };
    const openSyna = async () => { for (let i = 0; i < 3 && !(await panel.count()); i++) { await page.locator('[aria-controls="syna-panel"]:visible').first().click(); await panel.waitFor({ timeout: 10000 }).catch(() => {}); } await panel.waitFor(); };
    const closeSyna = async () => { if (await panel.count()) await panel.getByRole("button", { name: "Replier SYNA", exact: true }).first().click(); await page.locator("#syna-panel:visible").waitFor({ state: "detached" }).catch(() => {}); };
    const noQuote = async (when: string) => check(!(await panel.getByRole("button", { name: "Voir le devis de la réponse de SYNA" }).count()), `bouton de devis affiché (${when})`);
    const version = () => currentTheme(k.pid)!.version.number;
    // Couleur réellement peinte : l'élément de la section qui porte la classe du schéma (l'enveloppe data-es-section n'a pas de fond).
    const sectionBg = () => frame().locator(`[data-es-section="index:${k.section}"]`).first().evaluate((el) => { const t = (el.matches('[class*="color-"]') ? el : el.querySelector('[class*="color-"]')) as HTMLElement | null; if (!t) return "aucun élément coloré"; const s = getComputedStyle(t); return `${s.backgroundColor}|${s.color}|${t.className.match(/color-[\w-]+/)?.[0] ?? ""}`; });
    // Désignation : ordinateur = outil natif « Désigner » de l'aperçu ; téléphone = même désignation enregistrée
    // côté conversation (A2) puis « Reprendre le repère sauvegardé » dans le panneau, comme après un rechargement.
    const designate = async () => {
      if (desktop) {
        await closeSyna();
        const tab = page.getByRole("tab", { name: "Aperçu", exact: true }); if (await tab.count()) await tab.click();
        const heading = frame().locator(`[data-es-section="index:${k.section}"]`).getByRole("heading").first();
        await heading.waitFor(); await heading.scrollIntoViewIfNeeded();
        const tools = page.locator("[data-site-tools]"); if (!(await tools.getAttribute("open"))) await tools.locator(":scope > summary").click();
        await page.getByRole("button", { name: "Désigner", exact: true }).click();
        const close = page.getByRole("button", { name: "Fermer les outils", exact: true }); if (await close.isVisible()) await close.click();
        await heading.click(); await panel.waitFor();
      } else {
        k.select(false); await page.reload({ waitUntil: "networkidle" }); await openSyna();
        const resume = panel.getByRole("button", { name: /^Reprendre le repère sauvegardé/ });
        // isVisible n'attend pas : on attend réellement le bouton (jamais de faux succès, la désignation est vérifiée après).
        await resume.waitFor({ timeout: 20000 }); await resume.click();
      }
      await panel.locator("[data-agent-active-context]").getByText(/Section désignée/).waitFor();
    };
    // Avant une phrase ciblée : reprendre le repère sauvegardé s'il est proposé, sinon désigner de nouveau.
    const ensureDesignated = async () => {
      await openSyna();
      const ctxBox = panel.locator("[data-agent-active-context]");
      if (await ctxBox.getByText(/Section désignée/).count()) return "déjà désignée";
      const resume = panel.getByRole("button", { name: /^Reprendre le repère sauvegardé/ });
      if (await resume.waitFor({ timeout: 5000 }).then(() => true, () => false)) { await resume.click(); if (await ctxBox.getByText(/Section désignée/).waitFor({ timeout: 10000 }).then(() => true, () => false)) return "repère repris"; }
      await designate(); return "désignée de nouveau";
    };
    const say = async (text: string) => { await openSyna(); await panel.getByRole("textbox", { name: "Décrivez votre projet ou posez votre question à SYNA" }).fill(text); await panel.getByRole("button", { name: "Enregistrer", exact: true }).click(); };
    const confirmBtn = () => free.getByRole("button", { name: "Confirmer la modification gratuite", exact: true });
    try {
      await step('Studio compilé ouvert et section désignée',async()=>{
        await page.goto(`${origin}/studio/${k.pid}/boutique`,{waitUntil:'networkidle',timeout:180000});
        await page.locator('#ecs-splash').waitFor({state:'hidden'}).catch(()=>{});
        const nudge=page.locator('[data-tuto-nudge]');if(await nudge.isVisible())await nudge.locator('button').last().click();
        check((await page.locator('[data-syna-shell]').first().getAttribute('data-syna-shell'))===k.mode,'mode');await designate();
      });
      for(const action of ['Cache cette section','Supprime cette section']){
        await ensureDesignated();const before=JSON.stringify(currentTheme(k.pid)!.spec),v0=version();
        await step(action+' : proposition naturelle, avant/après, aucune écriture',async()=>{
          await say(action);await confirmBtn().waitFor();await free.getByText('Avant',{exact:true}).waitFor();await free.getByText('Après confirmation',{exact:true}).waitFor();
          await noQuote('section gratuite');check(version()===v0,'écriture avant accord');await shot(action.startsWith('Cache')?'2-masquer-proposition':'5-supprimer-proposition');
        });
        await step(action+' : accord après 17 secondes et résultat natif relu',async()=>{
          const elapsed=await waitAtLeast(17000,(ms)=>page.waitForTimeout(ms));check(elapsed>=17000,'attente réelle monotone');check(await confirmBtn().isEnabled(),'accord perdu après actualisation');await confirmBtn().click();
          await free.getByText(/Résultat enregistré/).waitFor();check(version()===v0+1,'une version attendue');
          const after=spec(k.pid).templates.index;if(action.startsWith('Cache'))check(after.sections[k.section]?.disabled===true,'section non masquée');else check(!after.sections[k.section]&&!after.order.includes(k.section),'section non supprimée');
          await frame().locator(`[data-es-section="index:${k.section}"]`).waitFor({state:'hidden',timeout:20000});await shot(action.startsWith('Cache')?'3-masquee':'6-supprimee');
          await page.reload({waitUntil:'networkidle'});await openSyna();await free.getByText(/Résultat enregistré/).waitFor();check(version()===v0+1,'double écriture au rechargement');
        });
        await step(action+' : annulation naturelle, accord puis contenu restauré',async()=>{
          await say('Annule la dernière retouche du site');await confirmBtn().waitFor();await noQuote('annulation');await confirmBtn().click();
          await free.getByText(/Résultat enregistré/).waitFor();check(version()===v0+2,'version de restauration');check(JSON.stringify(currentTheme(k.pid)!.spec)===before,'contenu non restauré exactement');await frame().locator(`[data-es-section="index:${k.section}"]`).waitFor({state:'visible',timeout:20000});
          await shot(action.startsWith('Cache')?'4-annulation-masquage':'7-annulation-suppression');
        });
      }
    } catch (e) { errors.push(`${label} : ${String(e).slice(0, 300)}`); }
    results.push({ mode: k.mode, format: k.format, business: k.business, steps, ok: steps.length > 0 && steps.every((s) => s.ok) });
    await ctx.close();
  }
  await b.close();
  const calls = one<{ n: number }>("SELECT COUNT(*) n FROM ai_calls")!.n;
  console.log(`· appels IA : ${calls} · requêtes refusées hors boucle locale : ${forbidden.length} · erreurs JS : ${jsErrors.length}`);
  if (calls) errors.push(`ai_calls = ${calls}`); if (jsErrors.length) errors.push(...jsErrors);
} catch (e) { errors.push(String(e)); console.error("✗ " + String(e)); }
finally {
  stop();
  fs.writeFileSync(path.join(out, "RESUME-SECTIONS-NATIVES-301.json"), JSON.stringify({ schema: "syna301-native-sections-compiled-1", sourceCommit:process.env.STUDIO_PROOF_COMMIT??null,browserVersion,browserExecutable:process.env.STUDIO_PROOF_CHROMIUM??"playwright-bundled",buildId:fs.readFileSync(".next/BUILD_ID","utf8").trim(),results, errors, forbidden: [...new Set(forbidden)], coutIA: 0 }, null, 2) + "\n");
  fs.writeFileSync(path.join(out, "serveur-local.log"), log.slice(-200000));
  fs.rmSync(dir, { recursive: true, force: true });
  const ok = results.filter((r) => r.ok).length; console.log(`${ok}/${results.length} parcours réussis`);
  if (errors.length || ok !== results.length) process.exitCode = 1;
}
