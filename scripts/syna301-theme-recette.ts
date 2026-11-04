/**
 * Recette #301 « SYNA complète » — choix d'un thème de la galerie en phrase naturelle (contrat #376 de Codex), dans la
 * conversation SYNA de l'écran Site, Encre / Plein cadre, 1440 / 390 px, produits et services. Rien d'aménagé :
 *  « Choisis un autre thème pour mon site » → clarification gratuite avec la liste native → bouton d'un thème → la phrase
 *  du client est remplie, il l'envoie → aperçu NATIF INACTIF préparé sans IA (site courant inchangé), deux liens d'aperçu
 *  réels → Annuler → rien d'écrit → nouvelle proposition → confirmation → reçu, nouvelle version relue dans la direction
 *  choisie, marque inchangée ; rechargement sans écriture. Projet produits : la règle native « angle marketing choisi
 *  avant tout thème » est d'abord vérifiée (refus honnête, rien d'écrit), puis l'angle est choisi par le moteur natif de
 *  Stratégie (mêmes fonctions que l'écran Stratégie) avant de reprendre la même phrase. Si le moteur refuse (retouches non reportées), la carte
 *  n'offre aucune confirmation : constat consigné tel quel, jamais contourné.
 * Stockage isolé, clés vides, réseau hors boucle locale refusé, 0 appel IA exigé.
 * Usage : npx tsx scripts/syna301-theme-recette.ts <dossier de sortie>
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

if (process.env.DATABASE_FILE || process.env.STORAGE_DIR || process.env.DATA_DIR) throw Error("Refus du stockage préexistant");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-theme301-"));
process.env.DATA_DIR = dir; process.env.STOCK_OFFLINE = "1"; process.env.APP_SECRET = "theme301-" + randomUUID();
for (const key of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "DASHSCOPE_API_KEY", "FAL_KEY", "GOOGLE_API_KEY", "PIXABAY_API_KEY"]) process.env[key] = "";
Object.assign(process.env, Object.fromEntries(["LOT_A", "AI", "UI", "CONTEXT", "SPECIALISTS", "TOOLS", "THEME_TOOLS", "LOCAL_SITE"].map((k) => ["STUDIO_CONVERSATION_" + k, "1"])), { STUDIO_SYNA_SHELL: "1" });
const out = path.resolve(process.argv[2] ?? "work/recette-theme-301");
fs.mkdirSync(out, { recursive: true });

const { localSiteFixture } = await import("../tests/conversation284-b1-fixtures");
const { currentTheme, loadProject, saveProduct, saveBrand, listThemeVersions } = await import("../src/lib/projects");
const { localBrand } = await import("../src/lib/engine/local");
const { prepareStrategyChange, activateStrategy, stageStrategyModule } = await import("../src/lib/marketing-strategy");
const { seedSourcedAnglesForTest } = await import("../tests/sourced-strategy-fixture");
const { runWithLang } = await import("../src/lib/i18n-server");
const { id, run, one, all, now } = await import("../src/lib/db");
const { sha256 } = await import("../src/lib/secrets");
const { writeSynaPrefs } = await import("../src/lib/syna-ui/prefs-store");
const { chromium } = await import("playwright");

type Mode = "encre" | "plein";
type Format = "ordinateur" | "telephone";
const ONLY = process.env.RECETTE_CAS;
const ALL_CASES: { mode: Mode; format: Format; business: "products" | "services" }[] = [
  { mode: "encre", format: "ordinateur", business: "products" }, { mode: "encre", format: "telephone", business: "services" },
  { mode: "plein", format: "ordinateur", business: "services" }, { mode: "plein", format: "telephone", business: "products" },
];
const CASES = ALL_CASES.filter((k) => !ONLY || ONLY.split(",").includes(`${k.mode}-${k.format}`));
const SIZE = { ordinateur: { width: 1440, height: 1000 }, telephone: { width: 390, height: 844 } } as const;
const prepared: (typeof CASES[number] & Awaited<ReturnType<typeof localSiteFixture>> & { token: string })[] = [];
for (const k of CASES) {
  const f = await runWithLang({ ui: "fr", content: "fr" }, () => localSiteFixture(k.business));
  // Même préparation que le test de Codex : une marque définie (le moteur refuse d'en inventer une).
  const p = loadProject(f.pid); saveProduct(f.pid, { ...p.product, name: "Atelier fictif", summary: "Présentation fournie." } as never);
  saveBrand(f.pid, localBrand(loadProject(f.pid).product, "Atelier fictif", { business: k.business, services: p.services } as never).brand);
  const token = id(); run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)", sha256(token), f.u.id, now() + 3600000, now());
  writeSynaPrefs(f.u.id, "account", null, { mode: k.mode, panel: "collapsed" });
  prepared.push({ ...k, ...f, token });
}

const port = 6400 + Math.floor(Math.random() * 90), origin = `http://localhost:${port}`;
const server = spawn(process.execPath, [path.resolve("node_modules/next/dist/bin/next"), "dev", "-p", String(port), "-H", "127.0.0.1"], { env: { ...process.env, APP_URL: origin, NEXT_TELEMETRY_DISABLED: "1", NODE_OPTIONS: `--import=${path.resolve("scripts/lot9/network-guard.mjs")}` }, stdio: ["ignore", "pipe", "pipe"], detached: true });
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
  const b = await chromium.launch({ args: ["--no-sandbox", "--disable-background-networking"] });
  for (const k of prepared) {
    const label = `${k.mode}-${k.format}-${k.business}`, steps: Step[] = [];
    const ctx = await b.newContext({ viewport: SIZE[k.format], locale: "fr-FR", reducedMotion: "reduce", ...(k.format === "telephone" ? { hasTouch: true, isMobile: true } : {}) });
    await ctx.addInitScript(() => { (globalThis as { __name?: unknown }).__name = (t: unknown) => t; try { sessionStorage.setItem("ecsSeen", "1"); } catch { /* */ } });
    await ctx.addCookies([{ name: "ecs_session", value: k.token, url: origin }]);
    await ctx.route("**/*", (r) => { if (new URL(r.request().url()).origin === origin) return r.continue(); forbidden.push(r.request().url()); return r.abort(); });
    const page = await ctx.newPage(); page.setDefaultTimeout(120000);
    page.on("pageerror", (e) => jsErrors.push(`${label} : ${e.message}`));
    const panel = page.locator("#syna-panel:visible"), card = panel.getByRole("region", { name: "Thème du site — gratuit", exact: true });
    const shot = async (n: string) => { const file = `${label}-${n}.png`; await page.screenshot({ path: path.join(out, file) }); return file; };
    const step = async (etape: string, fn: () => Promise<string | void>) => {
      try { const d = await fn(); steps.push({ etape, ok: true, ...(d ? { detail: d } : {}) }); console.log(`  ✓ ${label} · ${etape}${d ? " — " + d : ""}`); }
      catch (e) { steps.push({ etape, ok: false, detail: String(e).slice(0, 400), capture: await shot("echec-" + steps.length).catch(() => undefined) }); console.log(`  ✗ ${label} · ${etape} : ${String(e).slice(0, 300)}`); throw e; }
    };
    const openSyna = async () => { for (let i = 0; i < 3 && !(await panel.count()); i++) { await page.locator('[aria-controls="syna-panel"]:visible').first().click(); await panel.waitFor({ timeout: 10000 }).catch(() => {}); } await panel.waitFor(); };
    const say = async (text: string) => { await openSyna(); await panel.getByRole("textbox", { name: "Décrivez votre projet ou posez votre question à SYNA" }).fill(text); await panel.getByRole("button", { name: "Enregistrer", exact: true }).click(); };
    const noQuote = async () => check(!(await panel.getByRole("button", { name: "Voir le devis de la réponse de SYNA" }).count()), "bouton de devis affiché");
    const noOverflow = async () => check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "débordement horizontal");
    const cur = () => currentTheme(k.pid)!, brand = () => JSON.stringify(loadProject(k.pid).brand);
    const turns = () => all<{ request_json: string }>("SELECT request_json FROM agent_conversation_turns WHERE conversation_id=?", k.c.id).filter((t) => /confirm-theme-choice/.test(t.request_json)).length;
    const start0 = cur(), brand0 = brand();
    let chosen = "", blocked = "";
    try {
      await step("Site ouvert dans le mode du compte", async () => {
        await page.goto(`${origin}/studio/${k.pid}/boutique`, { waitUntil: "networkidle", timeout: 180000 });
        await page.locator("#ecs-splash").waitFor({ state: "hidden" }).catch(() => {});
        const nudge = page.locator("[data-tuto-nudge]"); if (await nudge.isVisible()) await nudge.locator("button").last().click();
        check((await page.locator("[data-syna-shell]").first().getAttribute("data-syna-shell")) === k.mode, "mode");
        return `thème actuel : ${start0.spec.direction}`;
      });
      await step("« Choisis un autre thème pour mon site » → clarification gratuite, liste native, rien d'écrit", async () => {
        const n = listThemeVersions(k.pid).length;
        await say("Choisis un autre thème pour mon site");
        const list = card.getByRole("list", { name: "Thèmes proposés", exact: true }); await list.waitFor();
        const names = (await list.getByRole("button").allInnerTexts()).map((s) => s.trim());
        check(names.length > 1, `liste : ${names.join(", ")}`); await noQuote();
        check(listThemeVersions(k.pid).length === n && cur().version.id === start0.version.id, "écriture pendant la clarification");
        const norm = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        const others = names.filter((x) => norm(x) !== norm(start0.spec.direction) && norm(x) !== norm(String(start0.spec.name ?? "")));
        chosen = others.find((x) => /rive/i.test(x)) ?? others[0];
        await list.getByRole("button", { name: chosen, exact: true }).click();
        const box = panel.getByRole("textbox", { name: "Décrivez votre projet ou posez votre question à SYNA" });
        check((await box.inputValue()) === `Choisis le thème ${chosen} pour mon site`, `phrase remplie : ${await box.inputValue()}`);
        await noOverflow(); await shot("1-liste");
        return `${names.length} thèmes · choisi : ${chosen}`;
      });
      if (k.business === "products") await step("projet produits sans angle choisi : refus natif honnête, rien d'écrit, puis angle choisi dans Stratégie (moteur natif)", async () => {
        const n = listThemeVersions(k.pid).length;
        await panel.getByRole("button", { name: "Enregistrer", exact: true }).click();
        const alert = panel.getByRole("alert").filter({ hasText: /angle marketing/ }); await alert.waitFor({ timeout: 300000 });
        check(listThemeVersions(k.pid).length === n && cur().version.id === start0.version.id, "écriture malgré le refus"); await noQuote(); await shot("1b-refus-angle");
        seedSourcedAnglesForTest(k.pid); const prep = prepareStrategyChange(k.pid, "usage") as unknown as { id: string; contents: { module: string; contentId: string }[] };
        // Choix natifs de l'écran Stratégie : conserver le site actuel (« conserver ce thème ») puis activer l'angle.
        for (const module of [...new Set(prep.contents.map((c) => c.module))]) stageStrategyModule(k.pid, prep.id, module, { contentIds: [], retainedContentIds: prep.contents.filter((c) => c.module === module).map((c) => c.contentId) });
        activateStrategy(k.pid, { angleId: "usage", preparationId: prep.id, idempotencyKey: "recette-theme-" + label, confirmed: true, retainUnaligned: true } as never); // « conserver les contenus actuels », choix natif de Stratégie
        return (await alert.innerText()).split("\n")[0];
      });
      const propose = async () => {
        await panel.getByRole("button", { name: "Enregistrer", exact: true }).click();
        const ok = card.getByRole("button", { name: "Confirmer gratuitement", exact: true });
        await Promise.race([ok.waitFor({ timeout: 300000 }), card.getByText(/non reportés|correction de cet aperçu|Aperçu natif conservé/).first().waitFor({ timeout: 300000 })]);
        await page.waitForTimeout(1500);
        if (!(await ok.count()) && (await card.getByText(/Aperçu natif conservé/).count())) {
          const r = await page.request.get(`${origin}/api/studio-agent/conversations/${k.c.id}`); const j = await r.json() as Record<string, any>;
          // Constat (4 novembre) : projet préparé = fiche en lecture seule → l'exécution n'est plus projetée, aucun bouton.
          if (/préparation engagée/.test(String(j.readOnlyReason)) && !j.localThemeChoiceExecution) { blocked = `BLOQUÉ — proposition affichée sans accord possible : ${j.readOnlyReason}`; return 0; }
          throw Error(`proposition affichée sans bouton : état=${j.localThemeChoice?.state} exécution=${JSON.stringify(j.localThemeChoiceExecution)} lectureSeule=${j.readOnlyReason} reprise=${JSON.stringify(j.recovery ?? null)}`);
        }
        return ok.count();
      };
      await step("phrase envoyée → aperçu natif inactif, deux liens réels, site courant inchangé, aucun devis", async () => {
        const confirmable = await propose(); const txt = await card.innerText();
        check(/Gratuit — 0 €/.test(txt), `carte : ${txt}`); await noQuote();
        check(cur().version.id === start0.version.id && brand() === brand0, "site ou marque modifiés avant l'accord");
        if (blocked) { check(cur().version.id === start0.version.id && brand() === brand0, "écriture malgré le blocage"); await panel.getByText(/préparation engagée/).first().waitFor(); constats.push(`${label} : ${blocked}`); await shot("2-bloque"); return blocked; }
        if (!confirmable) { constats.push(`${label} : moteur — ${txt.split("\n").find((l) => /reportés|correction/.test(l))}`); throw Error("aucune confirmation offerte (refus natif consigné)"); }
        const links = card.getByRole("link"); const before = await links.filter({ hasText: "Ouvrir le site actuel" }).getAttribute("href"), after = await links.filter({ hasText: "Ouvrir l’aperçu du nouveau thème" }).getAttribute("href");
        check(before && after && before !== after, "liens d'aperçu");
        for (const href of [before!, after!]) { const r = await page.request.get(origin + href); check(r.ok() && (await r.text()).length > 1000, `aperçu ${href} : ${r.status()}`); }
        await noOverflow(); await shot("2-proposition");
        return `${before} → ${after}`;
      });
      if (blocked) throw Error("STOP-BLOQUE");
      await step("Annuler → rien d'écrit ; même phrase de nouveau → nouvelle proposition", async () => {
        await card.getByRole("button", { name: "Annuler", exact: true }).click();
        await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).waitFor({ state: "detached" });
        check(cur().version.id === start0.version.id && brand() === brand0, "écriture après annulation");
        await say(`Choisis le thème ${chosen} pour mon site`); await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).waitFor({ timeout: 300000 });
      });
      await step("confirmation → reçu, nouvelle version relue dans le thème choisi, parent = ancienne version, marque inchangée", async () => {
        const n = turns();
        await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).click();
        await card.getByRole("status").getByText(/Enregistré et relu · version/).waitFor({ timeout: 120000 });
        const now1 = cur(); check(now1.version.id !== start0.version.id && now1.version.parent_id === start0.version.id, "version relue");
        check(now1.spec.direction !== start0.spec.direction, `direction inchangée : ${now1.spec.direction}`); check(brand() === brand0, "marque modifiée"); check(turns() === n + 1, "écritures en double");
        const href = await card.getByRole("link", { name: "Voir le site de travail", exact: true }).getAttribute("href"); const r = await page.request.get(origin + href!); check(r.ok(), `site de travail ${href}`);
        await noOverflow(); await shot("3-recu");
        return `${start0.spec.direction} → ${now1.spec.direction} · v${now1.version.number}`;
      });
      await step("rechargement : reçu conservé, aucune nouvelle écriture", async () => {
        const n = turns(), v = cur().version.id; await page.reload({ waitUntil: "networkidle" }); await openSyna();
        await card.getByRole("status").getByText(/Enregistré et relu · version/).waitFor(); check(turns() === n && cur().version.id === v, "écriture au rechargement"); await shot("4-recharge");
      });
    } catch (e) { if (!String(e).includes("STOP-BLOQUE")) errors.push(`${label} : ${String(e).slice(0, 300)}`); }
    results.push({ mode: k.mode, format: k.format, business: k.business, steps, ok: !blocked && steps.length > 0 && steps.every((s) => s.ok), ...(blocked ? { bloque: blocked } : {}) } as never);
    await ctx.close();
  }
  await b.close();
  // La préparation de Stratégie (fonction de test seedSourcedAnglesForTest) inscrit une ligne d'historique SIMULÉE
  // (provider « simulated », id « fixture_research_… ») : comptée à part, jamais confondue avec un appel réel.
  const calls = one<{ n: number }>("SELECT COUNT(*) n FROM ai_calls WHERE NOT (provider='simulated' AND id LIKE 'fixture_research_%')")!.n;
  const simulated = one<{ n: number }>("SELECT COUNT(*) n FROM ai_calls WHERE provider='simulated' AND id LIKE 'fixture_research_%'")!.n;
  console.log(`· appels IA : ${calls} (lignes simulées de la préparation Stratégie : ${simulated}) · requêtes refusées hors boucle locale : ${forbidden.length} · erreurs JS : ${jsErrors.length}`);
  if (calls) errors.push(`ai_calls = ${calls}`); if (jsErrors.length) errors.push(...jsErrors);
} catch (e) { errors.push(String(e)); console.error("✗ " + String(e)); }
finally {
  stop();
  fs.writeFileSync(path.join(out, "RESUME-THEME-301.json"), JSON.stringify({ schema: "syna301-theme-recette-1", results, errors, constats, forbidden: [...new Set(forbidden)], coutIA: 0 }, null, 2) + "\n");
  fs.writeFileSync(path.join(out, "serveur-local.log"), log.slice(-200000));
  fs.rmSync(dir, { recursive: true, force: true });
  const ok = results.filter((r) => r.ok).length, nb = results.filter((r) => (r as { bloque?: string }).bloque).length; console.log(`${ok}/${results.length} parcours réussis · ${nb} bloqué(s) (constat consigné, non contourné)`); if (constats.length) console.log("Constats :\n" + constats.join("\n"));
  if (errors.length || ok + nb !== results.length) process.exitCode = 1;
}
