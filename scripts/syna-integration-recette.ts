/**
 * Recette commune Claude + Codex (#292) : le parcours de confirmation gratuite de Codex (#291,
 * `scripts/verify-syna284-b1-confirmation-ui.ts`) rejoué DANS la coquille SYNA, en Encre et en Plein cadre.
 *
 * Mêmes données fictives, même garde réseau, mêmes assertions que la recette de Codex. Seuls changent :
 * - les sélecteurs de la coquille (panneau `#syna-panel`, ouverture par l'accès de la coquille, pas par la pastille) ;
 * - des bascules de mode au milieu du parcours (diff ouvert, brouillon tapé, erreur réseau, conflit), avec la
 *   preuve que la conversation n'est pas recréée et que proposition, brouillon, sélection et erreur restent.
 *
 * Stockage temporaire isolé, clés de fournisseurs vides, réseau hors boucle locale refusé (serveur et navigateur).
 * Usage : npx tsx scripts/syna-integration-recette.ts <dossier de sortie>
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

if (process.env.DATABASE_FILE || process.env.STORAGE_DIR || process.env.DATA_DIR) throw Error("Refus du stockage préexistant");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-integ-"));
process.env.DATA_DIR = dir; process.env.STOCK_OFFLINE = "1"; process.env.APP_SECRET = "integ-isolated-" + randomUUID();
for (const key of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "DASHSCOPE_API_KEY", "FAL_KEY", "GOOGLE_API_KEY", "PIXABAY_API_KEY"]) process.env[key] = "";
const out = path.resolve(process.argv[2] ?? "work/recette-integration");
fs.mkdirSync(out, { recursive: true });

const { businessFingerprints, historicalProject } = await import("../tests/conversation284-fixtures");
const { localSiteFixture } = await import("../tests/conversation284-b1-fixtures");
const { exportShopify } = await import("../src/lib/cms-v2/adapters/shopify");
const { getAsset, assetData } = await import("../src/lib/library");
const { unzipSync } = await import("fflate");
const { themeVersion, currentTheme, saveThemeVersion } = await import("../src/lib/projects");
const { chromium } = await import("playwright");
const { runWithLang } = await import("../src/lib/i18n-server");
const { id, run, one, all, now } = await import("../src/lib/db");
const { sha256 } = await import("../src/lib/secrets");
const { writeSynaPrefs, readSynaPrefs } = await import("../src/lib/syna-ui/prefs-store");

const flags: Record<string, string> = Object.fromEntries(["LOT_A", "AI", "UI", "CONTEXT", "LOCAL_SITE"].map((k) => ["STUDIO_CONVERSATION_" + k, "1"]));
Object.assign(process.env, flags, { STUDIO_SYNA_SHELL: "1" });
const CLOSED = process.env.SYNA_UI_CLOSED === "1";
if (CLOSED) process.env.STUDIO_CONVERSATION_LOCAL_SITE = "0";

type Mode = "encre" | "plein";
const MODES: Mode[] = ["encre", "plein"];
const BUSINESSES = ["products", "services"] as const;
// Un projet fictif neuf par (métier, mode) : le parcours finit par retirer les droits, il ne se rejoue pas.
const fixtures: (Awaited<ReturnType<typeof localSiteFixture>> & { business: (typeof BUSINESSES)[number]; mode: Mode; token: string })[] = [];
for (const mode of MODES) for (const business of BUSINESSES) {
  const f = await runWithLang({ ui: "fr", content: "fr" }, () => localSiteFixture(business));
  const token = id();
  run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)", sha256(token), f.u.id, now() + 3600000, now());
  writeSynaPrefs(f.u.id, "account", null, { mode });
  fixtures.push({ ...f, business, mode, token });
}
const histories: { u: { id: string }; pid: string; token: string; business: string; mode: Mode }[] = [];
for (const [i, business] of BUSINESSES.entries()) {
  const f = await runWithLang({ ui: "fr", content: "fr" }, () => historicalProject(business));
  const token = id();
  const { openProjectConversation } = await import("../src/lib/orchestrator/conversation");
  openProjectConversation(f.u, f.pid);
  run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)", sha256(token), f.u.id, now() + 3600000, now());
  writeSynaPrefs(f.u.id, "account", null, { mode: MODES[i] });
  histories.push({ ...f, token, business, mode: MODES[i] });
}

const port = 5100 + Math.floor(Math.random() * 150), origin = `http://localhost:${port}`;
const server = spawn(process.execPath, [path.resolve("node_modules/next/dist/bin/next"), "dev", "-p", String(port), "-H", "127.0.0.1"], {
  env: { ...process.env, APP_URL: origin, NEXT_TELEMETRY_DISABLED: "1", NODE_OPTIONS: `--import=${path.resolve("scripts/lot9/network-guard.mjs")}` },
  stdio: ["ignore", "pipe", "pipe"], detached: true,
});
let log = "";
server.stdout.on("data", (d) => { log += d; }); server.stderr.on("data", (d) => { log += d; });
const stop = () => { try { process.kill(-server.pid!, "SIGTERM"); } catch { /* déjà arrêté */ } };
process.on("exit", stop);

const proof = { schema: "syna-integration-recette-1", closed: CLOSED, runtime: null as unknown, cases: [] as unknown[], switches: [] as unknown[], screenshots: [] as string[], errors: [] as string[] };
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
// Empreinte métier de Codex. En plus des projets et des versions (déjà retirés par Codex), on retire les réglages
// d'affichage du Studio (`studio_ui_prefs`) : chaque bascule de mode les réenregistre (date mise à jour) ; ce ne sont pas
// des données du client. Leur contenu est vérifié à part, après chaque série de bascules (retour exact au réglage choisi).
const invariant = () => { const f = businessFingerprints(); delete f.database.projects; delete f.database.theme_versions; delete f.database.studio_ui_prefs; return f; };
const step = (s: string) => console.log("· " + s);
const WAIT_REFRESH = 17_000; // > 15 s : l'actualisation automatique du Studio (ProjectProvider au repos) a forcément eu lieu.
const designationText = (t: string) => t.split("\n").find((l) => /désign|Aucun objet/.test(l))?.trim() ?? "(aucune désignation)";
const designation17s: { case: string; step: string; after: string }[] = [];

try {
  const start = Date.now();
  for (;;) {
    if (Date.now() - start > 240000) throw Error("Next non prêt : " + log.slice(-1200));
    try { if ((await fetch(origin + "/connexion", { signal: AbortSignal.timeout(3000) })).ok) break; } catch { /* attente */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  proof.runtime = await (await fetch(origin + "/api/version")).json();
  const b = await chromium.launch({ args: ["--no-sandbox", "--disable-background-networking"] });
  browser = b;

  for (const f of fixtures) {
    const label = `${f.mode}-${f.business}`;
    const context = await b.newContext({ viewport: { width: 1440, height: 1000 }, locale: "fr-FR", reducedMotion: "reduce" });
    await context.addInitScript(() => { (globalThis as { __name?: unknown }).__name = (t: unknown) => t; });
    await context.addCookies([{ name: "ecs_session", value: f.token, url: origin }]);
    await context.route("**/*", (r) => (new URL(r.request().url()).origin === origin ? r.continue() : r.abort()));
    const page = await context.newPage(), errors: string[] = [], forbidden: string[] = [], http: { method: string; endpoint: string; status: number }[] = [];
    page.on("response", (r) => { const u = new URL(r.url()); if (u.pathname.includes("/conversation") || u.pathname.endsWith("/theme/restore")) http.push({ method: r.request().method(), endpoint: u.pathname.endsWith("/context") ? "context" : u.pathname.endsWith("/theme/restore") ? "native-restore" : "conversation", status: r.status() }); });
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => { if (r.method() === "POST" && /\/(intelligence|theme-tools|tools)(?:$|\?)/.test(r.url())) forbidden.push(r.url()); });
    page.setDefaultTimeout(45000);

    // Coquille SYNA : un seul panneau `#syna-panel` (colonne, feuille ou panneau selon la taille et le mode).
    const panel = page.locator("#syna-panel"), free = panel.getByRole("region", { name: "Retouche gratuite", exact: true });
    const frame = () => page.frameLocator('iframe[title^="Aperçu"]');
    const capture = async (name: string) => {
      await page.evaluate(async () => { await document.fonts.ready; await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))); });
      const filename = `${label}-${name}.png`;
      await page.screenshot({ path: path.join(out, filename) });
      proof.screenshots.push(filename);
    };
    const dismiss = async () => {
      await page.locator("#ecs-splash").waitFor({ state: "hidden" });
      const nudge = page.locator("[data-tuto-nudge]");
      if (await nudge.isVisible()) await nudge.locator("button").last().click();
    };
    const shellMode = () => page.locator("[data-syna-shell]").first().getAttribute("data-syna-shell");
    const collapse = async () => { if (await panel.isVisible()) await panel.getByRole("button", { name: "Replier SYNA", exact: true }).click(); await panel.waitFor({ state: "hidden" }); };
    const openPanel = async () => {
      if (await panel.isVisible()) return;
      // L'accès de la coquille : onglet signature (Encre) ou onglet Syna (téléphone) ; Ctrl J partout (Plein cadre).
      const trigger = page.locator('[aria-controls="syna-panel"]').filter({ visible: true }).first();
      if (await trigger.count()) await trigger.click();
      else { await page.locator("#studio-main").click({ position: { x: 4, y: 4 } }); await page.keyboard.press("Control+j"); }
      await panel.waitFor();
    };
    const textbox = () => panel.getByRole("textbox", { name: "Décrivez votre projet ou posez votre question à SYNA" });
    const select = async () => {
      await collapse();
      const tab = page.getByRole("tab", { name: "Aperçu", exact: true });
      if (await tab.count()) await tab.click();
      const heading = frame().locator(`[data-es-section="index:${f.section}"]`).getByRole("heading").first();
      await heading.waitFor(); await heading.scrollIntoViewIfNeeded();
      await heading.evaluate((el) => new Promise<void>((resolve) => { if (el.ownerDocument.readyState === "complete") resolve(); else el.ownerDocument.defaultView!.addEventListener("load", () => resolve(), { once: true }); }));
      const tools = page.locator("[data-site-tools]");
      if (!(await tools.getAttribute("open"))) await tools.locator(":scope > summary").click();
      await page.getByRole("button", { name: "Désigner", exact: true }).click();
      const close = page.getByRole("button", { name: "Fermer les outils", exact: true });
      if (await close.isVisible()) await close.click();
      await heading.click(); await panel.waitFor();
      await panel.locator("[data-agent-active-context]").getByText(/Section désignée/).waitFor();
    };
    const message = async (text: string) => {
      await textbox().fill(text);
      await panel.getByRole("button", { name: "Enregistrer", exact: true }).click();
      await free.getByRole("button", { name: "Confirmer la modification gratuite", exact: true }).waitFor();
    };
    const applied = async () => { await free.getByText(/Résultat enregistré · version/).waitFor(); };
    const visibleTitle = async (title: string) => {
      const heading = frame().locator(`[data-es-section="index:${f.section}"]`).getByRole("heading").first().filter({ hasText: title });
      await heading.waitFor(); await heading.scrollIntoViewIfNeeded();
    };
    /**
     * Bascule de mode au milieu du parcours, aller puis retour (raccourci Ctrl Maj M, le focus étant dans le Studio).
     * Prouve : même instance de conversation (marqueur posé avant, retrouvé après), même état visible (`keep`),
     * même brouillon, même sélection, aucune requête vers la conversation pendant la bascule.
     */
    // `selectionMayRefresh` : pendant un conflit, une version plus récente existe ; le Studio relit le projet toutes les
    // 15 s (fonctionnement de main) et remplace alors la désignation périmée par la page. Ce changement ne vient pas du
    // mode : il est noté, et l'état du conflit, la conversation et le brouillon restent exigés.
    const switchTwice = async (when: string, keep: () => Promise<boolean>, selectionMayRefresh = false) => {
      const draft = `Brouillon pendant ${when} — ${f.business}`;
      await textbox().fill(draft);
      const marked = await page.evaluate(() => { const el = document.querySelector("#syna-panel [data-agent-conversation]"); el?.setAttribute("data-recette-integ", "1"); return !!el; });
      const context0 = await panel.locator("[data-agent-active-context]").innerText().catch(() => "");
      const requests: string[] = [];
      const onReq = (r: { url: () => string; method: () => string }) => { if (r.method() !== "GET" && /conversations|ui-prefs/.test(r.url())) requests.push(new URL(r.url()).pathname); };
      page.on("request", onReq);
      const result: Record<string, unknown> = { case: label, when };
      for (const target of [f.mode === "encre" ? "plein" : "encre", f.mode] as Mode[]) {
        await textbox().focus();
        await page.keyboard.press("Control+Shift+M");
        await page.waitForFunction((m) => document.querySelector("[data-syna-shell]")?.getAttribute("data-syna-shell") === m, target);
        await panel.waitFor();
        const same = await page.evaluate(() => !!document.querySelector('#syna-panel [data-recette-integ="1"]'));
        const value = await textbox().inputValue();
        const context1 = await panel.locator("[data-agent-active-context]").innerText().catch(() => "");
        const kept = await keep();
        if (target !== f.mode) await capture(`bascule-${when.replace(/\W+/g, "-")}`);
        result[target] = { sameConversation: same, draftKept: value === draft, selectionKept: context1 === context0, stateKept: kept };
        assert.ok(marked && same, `${label} ${when} : conversation recréée en ${target}`);
        assert.equal(value, draft, `${label} ${when} : brouillon perdu en ${target}`);
        if (!selectionMayRefresh) assert.equal(context1, context0, `${label} ${when} : sélection perdue en ${target}`);
        else if (context1 !== context0) result.selectionRefreshedByPoll = { before: context0.split("\n").find((l) => /désign/.test(l)), after: context1.split("\n").find((l) => /désign/.test(l)) };
        assert.ok(kept, `${label} ${when} : état perdu en ${target}`);
      }
      page.off("request", onReq);
      // Seule écriture permise pendant la bascule : le réglage d'affichage. Jamais la conversation.
      assert.deepEqual(requests.filter((p) => !p.endsWith("/ui-prefs")), [], `${label} ${when} : la bascule a écrit dans la conversation`);
      result.writes = requests;
      assert.equal(await shellMode(), f.mode);
      // L'enregistrement du retour peut être encore en route : on attend qu'il arrive (5 s au plus), puis on vérifie.
      const settleEnd = Date.now() + 5000;
      while (Date.now() < settleEnd && readSynaPrefs(f.u.id, f.pid).account.mode !== f.mode) await page.waitForTimeout(100);
      const prefsAfter = readSynaPrefs(f.u.id, f.pid);
      assert.deepEqual({ account: prefsAfter.account, project: prefsAfter.project }, { account: { mode: f.mode }, project: null }, `${label} ${when} : réglage d'affichage non rétabli`);
      result.prefsRestored = true;
      await textbox().fill("");
      proof.switches.push(result);
      step(`${label} : bascules pendant ${when} — conversation, brouillon, sélection et état conservés`);
    };

    await page.goto(`${origin}/studio/${f.pid}/boutique`, { waitUntil: "networkidle", timeout: 180000 });
    await dismiss();
    assert.equal(await shellMode(), f.mode, "le mode du compte est appliqué au chargement");
    assert.equal(await page.getByRole("button", { name: "SYNA", exact: true }).count(), 0, "plus de pastille noire dans la coquille");
    await select();
    step(`${label} : sélection native dans l'aperçu`);

    if (CLOSED) {
      const before = currentTheme(f.pid)!.version.id;
      await textbox().fill("Remplace le titre par “Titre gratuit fermé”");
      await panel.getByRole("button", { name: "Enregistrer", exact: true }).click();
      await free.getByText("Les retouches gratuites ne sont pas activées ici. Aucun appel IA lancé.", { exact: true }).waitFor();
      assert.equal(await free.getByRole("button", { name: "Confirmer la modification gratuite", exact: true }).count(), 0);
      assert.equal(await panel.getByRole("button", { name: "Voir le devis de la réponse de SYNA", exact: true }).count(), 0);
      assert.equal(currentTheme(f.pid)!.version.id, before);
      assert.deepEqual(forbidden, []);
      await capture("drapeau-ferme");
      proof.cases.push({ case: label, flagClosed: true, noDeadConfirmation: true, noPaidFallback: true, manualPreviewIntact: true });
      await context.close();
      continue;
    }

    const loader = (assetId: string) => { const a = getAsset(assetId); return a ? { data: assetData(a), mime: a.mime, updated: a.created_at } : null; };
    const projectFields = () => { const p = { ...one<Record<string, unknown>>("SELECT * FROM projects WHERE id=?", f.pid)! }; delete p.current_theme_version_id; delete p.updated_at; return p; };
    const originalFields = projectFields(), otherProjects = () => all("SELECT * FROM projects WHERE id<>? ORDER BY id", f.pid), originalOtherProjects = otherProjects(), oldVersions = all<{ id: string }>("SELECT * FROM theme_versions ORDER BY id");
    const old = structuredClone(currentTheme(f.pid)!.spec), zipBefore = unzipSync((await exportShopify(old, loader)).zip), before = invariant(), versionBefore = currentTheme(f.pid)!.version.number;
    const title = `Un titre gratuit pour ${f.business === "products" ? "notre collection" : "nos prestations"}`;

    // Ambiguïté : réponse gratuite, aucune exécution ni bascule payante.
    await textbox().fill("Change le titre joliment");
    await panel.getByRole("button", { name: "Enregistrer", exact: true }).click();
    await free.getByText(/Précisez gratuitement/).waitFor();
    assert.equal(await free.getByRole("button", { name: "Confirmer la modification gratuite", exact: true }).count(), 0);
    assert.equal(currentTheme(f.pid)!.version.number, versionBefore);
    // Annulation : fait foi, garde la sélection.
    await message(`Remplace le titre de cette section par “${title}”`);
    await free.getByRole("button", { name: "Annuler la modification gratuite", exact: true }).click();
    await free.waitFor({ state: "detached" });
    assert.equal(currentTheme(f.pid)!.version.number, versionBefore);
    // Proposition gratuite : diff et « Gratuit — 0 € ».
    await message(`Remplace le titre de cette section par “${title}”`);
    assert.equal(currentTheme(f.pid)!.version.number, versionBefore);
    await free.getByText("Gratuit — 0 €", { exact: true }).waitFor();
    assert.equal(await panel.getByRole("button", { name: "Voir le devis de la réponse de SYNA", exact: true }).count(), 0);
    // Bascule pendant le diff ouvert : la proposition, le coût, la sélection et le brouillon restent.
    await switchTwice("le diff ouvert", async () => (await free.getByText("Gratuit — 0 €", { exact: true }).isVisible()) && (await free.getByRole("button", { name: "Confirmer la modification gratuite", exact: true }).isVisible()));
    assert.equal(currentTheme(f.pid)!.version.number, versionBefore, "la bascule n'exécute rien");

    await free.scrollIntoViewIfNeeded(); await capture("ordinateur-confirmation");
    for (const [width, height, name] of [[1024, 768, "tablette-1024"], [390, 844, "telephone-390"], [360, 780, "telephone-360"]] as const) {
      await page.setViewportSize({ width, height });
      await openPanel();
      await free.getByRole("button", { name: "Confirmer la modification gratuite", exact: true }).scrollIntoViewIfNeeded();
      await free.evaluate((el) => el.scrollIntoView({ block: "start" }));
      // Plein cadre : la barre de commande ne recouvre jamais la feuille SYNA (ni sa zone de saisie).
      if (f.mode === "plein") {
        const overlap = await page.evaluate(() => {
          const p = document.querySelector("#syna-panel")?.getBoundingClientRect(), c = document.querySelector(".ss-cmd-zone .ss-cmd-form")?.getBoundingClientRect();
          return !!p && !!c && p.width > 0 && c.width > 0 && p.bottom > c.top + 1 && p.left < c.right && p.right > c.left;
        });
        assert.ok(!overlap, `${label} ${name} : la barre de commande recouvre la feuille SYNA`);
      }
      // Aucune page plus large que l'écran, à chaque taille.
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${label} ${name} : débordement horizontal`);
      await capture(`${name}-confirmation`);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openPanel();
    // Double clic : une seule version.
    await free.getByRole("button", { name: "Confirmer la modification gratuite", exact: true }).dblclick();
    await applied();
    step(`${label} : titre confirmé`);
    assert.equal(currentTheme(f.pid)!.version.number, versionBefore + 1);
    assert.equal(currentTheme(f.pid)!.spec.templates.index.sections[f.section].settings.heading, title);
    await visibleTitle(title); await free.scrollIntoViewIfNeeded(); await capture("ordinateur-recu");
    await collapse(); await visibleTitle(title); await capture("ordinateur-resultat");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Téléphone", exact: true }).click();
    await visibleTitle(title);
    const mobileBox = await frame().locator(`[data-es-section="index:${f.section}"]`).getByRole("heading").first().boundingBox();
    assert.ok(mobileBox && mobileBox.x >= 0 && mobileBox.x + mobileBox.width <= 390 && mobileBox.y >= 0 && mobileBox.y + mobileBox.height <= 844, "Titre mobile entièrement visible");
    await capture("telephone-resultat");
    await page.reload({ waitUntil: "networkidle" }); await dismiss();
    assert.equal(await shellMode(), f.mode, "le mode est retrouvé après rechargement");
    await visibleTitle(title);
    assert.equal(currentTheme(f.pid)!.spec.templates.index.sections[f.section].settings.heading, title);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole("button", { name: "Ordinateur", exact: true }).click();

    // Déplacement d'une section, réponse perdue APRÈS l'enregistrement natif, puis reprise identique.
    await select();
    await message(`Place cette section après ${f.anchor}`);
    const cid = f.c.id, confirmBodies: unknown[] = [];
    let lost = true;
    await page.route(`**/api/studio-agent/conversations/${cid}`, async (route) => {
      const request = route.request();
      if (request.method() === "POST" && request.postDataJSON()?.action === "confirm-local") {
        confirmBodies.push(request.postDataJSON());
        if (lost) { lost = false; await route.fetch(); await route.abort("failed"); return; }
      }
      await route.continue();
    });
    await free.getByRole("button", { name: "Confirmer la modification gratuite", exact: true }).click();
    await free.getByRole("button", { name: "Réessayer la confirmation gratuite", exact: true }).waitFor();
    // Bascule pendant l'erreur : la reprise reste proposée, rien n'est renvoyé tout seul.
    await switchTwice("l'erreur réseau", async () => free.getByRole("button", { name: "Réessayer la confirmation gratuite", exact: true }).isVisible());
    assert.equal(confirmBodies.length, 1, "la bascule ne renvoie pas la confirmation");
    await free.getByRole("button", { name: "Réessayer la confirmation gratuite", exact: true }).click();
    await applied();
    step(`${label} : déplacement et reprise réseau`);
    assert.equal(confirmBodies.length, 2);
    assert.deepEqual(confirmBodies[0], confirmBodies[1]);
    assert.equal(currentTheme(f.pid)!.version.number, versionBefore + 2);
    await collapse();
    const moveEnd = Date.now() + 30000;
    for (;;) {
      // L'aperçu se recharge sur la nouvelle version : une lecture faite pendant ce rechargement est simplement refaite.
      const ids = await frame().locator('main [data-es-section^="index:"]').evaluateAll((els) => els.map((el) => el.getAttribute("data-es-section")!.split(":")[1])).catch(() => [] as string[]);
      if (ids.indexOf(f.section) === ids.indexOf(f.anchor) + 1 && ids.includes(f.section)) break;
      if (Date.now() > moveEnd) throw Error("Ordre natif non visible dans iframe : " + JSON.stringify(ids));
      await page.waitForTimeout(100);
    }
    await openPanel();
    const moved = currentTheme(f.pid)!, order = moved.spec.templates.index.order;
    assert.equal(order.indexOf(f.section), order.indexOf(f.anchor) + 1);
    const zipAfter = unzipSync((await exportShopify(moved.spec, loader)).zip);
    const changed = [...new Set([...Object.keys(zipBefore), ...Object.keys(zipAfter)])].filter((k) => !Buffer.from(zipBefore[k] ?? []).equals(Buffer.from(zipAfter[k] ?? [])));
    assert.deepEqual(changed, ["templates/index.json"]);
    assert.deepEqual(invariant(), before);

    // Conflit N→N+1 : l'ancien accord n'écrase rien ; revalidation explicite, puis nouvelle proposition.
    await select();
    await message("Remplace le titre de cette section par “Nouvelle proposition après conflit”");
    const manual = structuredClone(currentTheme(f.pid)!.spec);
    manual.templates.index.sections[f.section].settings.heading = "Titre humain à préserver";
    saveThemeVersion(f.pid, manual, "Modification manuelle fictive", "user");
    await free.getByRole("button", { name: "Confirmer la modification gratuite", exact: true }).click();
    await free.getByRole("button", { name: "Revalider la cible actuelle", exact: true }).waitFor();
    await switchTwice("le conflit", async () => free.getByRole("button", { name: "Revalider la cible actuelle", exact: true }).isVisible(), true);
    assert.equal(currentTheme(f.pid)!.spec.templates.index.sections[f.section].settings.heading, "Titre humain à préserver");
    await free.getByRole("button", { name: "Revalider la cible actuelle", exact: true }).click();
    await free.waitFor({ state: "detached" });
    // Correctif #300 : la section revalidée doit survivre à l'actualisation automatique du Studio (ProjectProvider, 15 s).
    // Attente réelle de 17 s, sans rien toucher, puis la section doit toujours être désignée.
    await page.waitForTimeout(WAIT_REFRESH);
    const afterRevalidate = designationText(await panel.locator("[data-agent-active-context]").innerText());
    designation17s.push({ case: label, step: "revalidation", after: afterRevalidate });
    await capture("apres-revalidation-17s");
    assert.match(afterRevalidate, /Section désignée/, `${label} : désignation perdue 17 s après « Revalider » (${afterRevalidate})`);
    await message("Remplace le titre de cette section par “Nouvelle proposition après conflit”");
    await free.getByRole("button", { name: "Confirmer la modification gratuite", exact: true }).click();
    await applied();

    // Historique manuel existant (aucun nouveau moteur d'annulation).
    await collapse();
    await page.getByRole("button", { name: "Versions", exact: true }).click();
    const versions = page.getByRole("dialog").filter({ hasText: /Versions du site|Versions de la boutique/ });
    await versions.waitFor();
    await versions.getByRole("button", { name: "Restaurer", exact: true }).last().click();
    const end = Date.now() + 30000;
    while (Date.now() < end && JSON.stringify(currentTheme(f.pid)!.spec) !== JSON.stringify(old)) await page.waitForTimeout(100);
    assert.deepEqual(currentTheme(f.pid)!.spec, old);
    assert.deepEqual(themeVersion(f.pid, f.cur.version.id)!.spec, old);
    assert.deepEqual(forbidden, []); assert.deepEqual(errors, []); assert.deepEqual(invariant(), before);
    assert.deepEqual(projectFields(), originalFields); assert.deepEqual(otherProjects(), originalOtherProjects);
    for (const oldVersion of oldVersions) assert.deepEqual(one("SELECT * FROM theme_versions WHERE id=?", oldVersion.id), oldVersion);
    assert.equal(currentTheme(f.pid)!.version.number, versionBefore + 5);
    await page.keyboard.press("Escape").catch(() => {});
    // Après la restauration, la personne attend que l'aperçu montre la version restaurée, puis désigne la section.
    const restoredTitle = String(currentTheme(f.pid)!.spec.templates.index.sections[f.section].settings.heading ?? "");
    await frame().locator(`[data-es-section="index:${f.section}"]`).getByRole("heading").first().filter({ hasText: restoredTitle.slice(0, 20) }).waitFor();

    // Droits retirés entre la proposition et le clic (abonnement fictif uniquement).
    await select();
    // Après une restauration aussi : attente réelle de 17 s, la section doit rester désignée.
    await page.waitForTimeout(WAIT_REFRESH);
    const afterRestore = designationText(await panel.locator("[data-agent-active-context]").innerText());
    designation17s.push({ case: label, step: "restauration", after: afterRestore });
    assert.match(afterRestore, /Section désignée/, `${label} : désignation perdue 17 s après la restauration (${afterRestore})`);
    await message("Remplace le titre par “Ne doit pas être enregistré”");
    const protectedVersion = currentTheme(f.pid)!.version.id;
    run("UPDATE subscriptions SET status='canceled' WHERE project_id=?", f.pid);
    await free.getByRole("button", { name: "Confirmer la modification gratuite", exact: true }).click();
    await free.getByRole("alert").waitFor();
    assert.equal(currentTheme(f.pid)!.version.id, protectedVersion);
    assert.equal(await free.getByText(/Résultat enregistré/).count(), 0);
    assert.equal(await free.getByRole("button", { name: "Confirmer la modification gratuite", exact: true }).count(), 0);
    assert.deepEqual(forbidden, []);
    // Le réglage d'affichage n'a pas bougé (la bascule revient toujours au mode choisi).
    assert.equal(readSynaPrefs(f.u.id, f.pid).account.mode, f.mode);

    proof.cases.push({ case: label, mode: f.mode, business: f.business, http, permissionsRevokedNoWrite: true, ambiguityNoWrite: true, iframeOrderVerified: true, projectFieldsIntact: true, otherProjectsIntact: true, oldVersionsIntact: true, realSelection: true, typedCommand: true, freeDiff: true, doubleClickOneVersion: true, refreshPersistent: true, lostResponseSameCommand: true, manualRaceExplicitRevalidation: true, newProposalRequired: true, manualNativeRestore: true, zipChanged: changed, paidRequests: 0, jsErrors: errors });
    await context.close();
    console.log(`✓ Parcours validé : ${label}`);
  }

  // Projets historiques (A1) : lecture seule, aucune retouche gratuite ni devis, dans les deux modes, au téléphone.
  for (const f of histories) {
    const context = await b.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR", reducedMotion: "reduce" });
    await context.addInitScript(() => { (globalThis as { __name?: unknown }).__name = (t: unknown) => t; });
    await context.addCookies([{ name: "ecs_session", value: f.token, url: origin }]);
    await context.route("**/*", (r) => (new URL(r.request().url()).origin === origin ? r.continue() : r.abort()));
    const page = await context.newPage();
    await page.goto(`${origin}/studio/${f.pid}/boutique`, { waitUntil: "networkidle", timeout: 180000 });
    await page.locator("#ecs-splash").waitFor({ state: "hidden" });
    const nudge = page.locator("[data-tuto-nudge]");
    if (await nudge.isVisible()) await nudge.locator("button").last().click();
    assert.equal(await page.locator("[data-syna-shell]").first().getAttribute("data-syna-shell"), f.mode);
    const panel = page.locator("#syna-panel");
    const trigger = page.locator('[aria-controls="syna-panel"]').filter({ visible: true }).first();
    if (await trigger.count()) await trigger.click();
    else { await page.locator("#studio-main").click({ position: { x: 4, y: 4 } }); await page.keyboard.press("Control+j"); }
    await panel.getByText("Contexte existant · lecture seule", { exact: true }).waitFor();
    assert.equal(await panel.getByRole("region", { name: "Retouche gratuite", exact: true }).count(), 0);
    assert.equal(await panel.getByRole("button", { name: "Voir le devis de la réponse de SYNA", exact: true }).count(), 0);
    await page.screenshot({ path: path.join(out, `historique-${f.mode}-${f.business}-telephone-390.png`) });
    proof.screenshots.push(`historique-${f.mode}-${f.business}-telephone-390.png`);
    proof.cases.push({ case: `historique-${f.mode}-${f.business}`, A1ReadOnly: true, noFreeControl: true });
    await context.close();
    console.log(`✓ Projet historique en lecture seule : ${f.mode}-${f.business}`);
  }
  for (const table of ["ai_calls", "jobs", "usage_events"]) assert.equal(one<{ n: number }>(`SELECT COUNT(*) n FROM ${table}`)!.n, 0, `${table} doit rester vide (0 appel IA)`);
  console.log("✓ 0 appel IA, 0 tâche, 0 consommation");
} catch (e) {
  proof.errors.push(String(e));
  if (browser) for (const c of browser.contexts()) for (const p of c.pages()) try { await p.screenshot({ path: path.join(out, "echec-reel.png") }); fs.writeFileSync(path.join(out, "echec-dom.txt"), await p.locator("body").innerText()); } catch { /* page fermée */ }
  console.error("✗ " + String(e));
  process.exitCode = 1;
} finally {
  await browser?.close();
  stop();
  fs.writeFileSync(path.join(out, "RESUME-INTEGRATION.json"), JSON.stringify({ ...proof, designation17s }, null, 2) + "\n");
  fs.writeFileSync(path.join(out, "serveur-local.log"), log);
  fs.rmSync(dir, { recursive: true, force: true });
}
