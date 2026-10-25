/** HEUREN (consigne du 22 octobre, PR #167) : preuve d'édition depuis l'interface réelle du studio (Next.js en
 * développement, base temporaire, aucune IA, aucun réseau). La galerie « Ajouter une section » propose chaque
 * composition des maquettes HEUREN avec un aperçu réel ; une section est ajoutée depuis la galerie, modifiée dans le
 * panneau « Réglages » (titre, bouton, côté du texte, couleurs), dupliquée, déplacée ; après rechargement complet, tout
 * est conservé. Captures à chaque étape.
 *
 *   npx tsx scripts/heuren-studio-check.ts <dossier-captures>      (VIDEO_DIR=<dossier> : vidéo du parcours)
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium, type Page } from "playwright";
if (process.env.DATA_DIR || process.env.DATABASE_FILE) throw new Error("Base existante refusée");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-heuren-studio-")); process.env.DATA_DIR = temp; process.env.STOCK_OFFLINE = "1";
const out = path.resolve(process.argv[2] ?? "reports/heuren-studio"); fs.mkdirSync(out, { recursive: true });
/** Compositions des maquettes : fonction de la galerie, disposition, classe attendue dans l'aperçu. */
const GALLERY = [
  ["Présentation principale", "banner", ".ed-opening--banner"],
  ["Engagements de la marque", "strip", ".fs-commitments--strip"],
  ["Ambiance et lookbook", "band", ".ed-scene--band"],
  ["Usages et installation", "triptych", ".ed-diptych--triptych"],
  ["Produit à la une", "duo", ".fp__grid--duo"],
  ["Engagements de la marque", "aside", ".fs-commitments--aside"],
  ["Informations d'achat et FAQ", "columns", ".v2-faq--columns"],
  ["Ambiance et lookbook", "detail", ".fs-lookbook--detail"],
  ["Contact et points de vente", "form-image", ".ed-contact"],
] as const;
const PORT = 3600 + Math.floor(Math.random() * 300), origin = `http://127.0.0.1:${PORT}`;
const { demoProject } = await import("../tests/demo-fixtures");
const { createUser } = await import("../src/lib/auth"); const { saveThemeVersion } = await import("../src/lib/projects"); const { runWithLang } = await import("../src/lib/i18n-server");
const password = "heuren-" + Math.random().toString(36).slice(2), email = "heuren-studio@example.invalid";
const user = await createUser(email, password, "Vérification HEUREN");
const f = await runWithLang({ content: "fr", ui: "fr" }, () => demoProject(user.id, "heuren"));
saveThemeVersion(f.pid, f.spec, "Démonstration HEUREN — vérification de l'édition", "user");
// Droits du forfait : « Vendre » (12 fonctions de la bibliothèque) suffit à toutes les compositions HEUREN ; une fonction
// réservée à « Dominer » (Avis clients) ne doit pas être proposée.
const { run } = await import("../src/lib/db");
const plan = process.env.CHECK_PLAN ?? "vendre";
run("INSERT INTO subscriptions (user_id,status,plan,owner_user_id,project_id,source,created_at,updated_at) VALUES (?,'active',?,?,?,'admin',?,?)", `heuren-check-${f.pid}`, plan, user.id, f.pid, Date.now(), Date.now());
const dev = spawn("npx", ["next", "dev", "-p", String(PORT), "-H", "127.0.0.1"], { env: { ...process.env, DATA_DIR: temp, STOCK_OFFLINE: "1", NEXT_TELEMETRY_DISABLED: "1" }, stdio: ["ignore", "pipe", "pipe"], detached: true });
const stopDev = () => { try { process.kill(-dev.pid!, "SIGTERM"); } catch { /* arrêté */ } }; process.on("exit", stopDev);
let log = ""; dev.stdout.on("data", (d) => { log += d; }); dev.stderr.on("data", (d) => { log += d; });
const started = Date.now();
for (;;) { if (Date.now() - started > 240000) throw new Error("Studio non démarré :\n" + log.slice(-2000)); try { const r = await fetch(`${origin}/connexion`); if (r.ok) break; } catch { /* pas prêt */ } await new Promise((r) => setTimeout(r, 1500)); }
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const steps: Record<string, unknown>[] = [];
const shot = async (page: Page, name: string) => { await page.screenshot({ path: path.join(out, `heuren-${name}.png`) }); };
type Structure = { template: string; sections: { id: string; type: string; name: string }[] }[];
try {
  // VIDEO_DIR=<dossier> : enregistre le parcours en vidéo (WebM), pour la remise à Thomas.
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR", ...(process.env.VIDEO_DIR ? { recordVideo: { dir: process.env.VIDEO_DIR, size: { width: 1440, height: 900 } } } : {}) }); const page = await context.newPage();
  const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
  const login = await context.request.post(`${origin}/api/auth/login`, { data: { email, password } }); assert.ok(login.ok(), `connexion : ${login.status()}`);
  const theme = async () => ((await (await context.request.get(`${origin}/api/projects/${f.pid}/theme`)).json()) as { current: { structure: Structure } }).current.structure;
  const index = async () => (await theme()).find((t) => t.template === "index")!.sections;
  const section = async (id: string) => (await (await context.request.get(`${origin}/api/projects/${f.pid}/theme/section?template=index&section=${id}`)).json()) as { settings?: Record<string, unknown>; section?: { settings?: Record<string, unknown> } };
  await page.goto(`${origin}/studio/${f.pid}/boutique`, { waitUntil: "networkidle", timeout: 240000 }); await page.waitForTimeout(1500);
  const frame = () => page.frameLocator("iframe[src*='/preview/']").first();
  await frame().locator("body").waitFor({ timeout: 120000 });
  const nudge = page.locator("[data-tuto-nudge]").getByRole("button", { name: /^(Masquer|Dismiss)$/ }); if (await nudge.count()) { await nudge.click(); await page.waitForTimeout(300); }
  await shot(page, "01-studio");
  const initial = await index();
  // 1. Galerie : chaque composition des maquettes, avec son aperçu réel.
  const addButtons = page.getByRole("button", { name: /^Ajouter une section$/ }); await addButtons.last().scrollIntoViewIfNeeded(); await addButtons.last().click();
  const dialog = page.getByRole("dialog"); await dialog.waitFor();
  const search = dialog.getByPlaceholder("Rechercher des sections");
  const offered = (await dialog.getByRole("option").allInnerTexts()).map((x) => x.trim()).filter((x) => x && !/^Générer$/.test(x));
  if (plan === "vendre") assert.ok(!offered.includes("Avis clients"), "forfait Vendre : « Avis clients » réservée à Dominer");
  steps.push({ step: `forfait « ${plan} » : fonctions proposées`, ok: true, offered });
  for (const [entry, disp, cls] of GALLERY) {
    await search.fill(entry); await page.waitForTimeout(400);
    await dialog.getByRole("option", { name: entry }).first().focus();
    const chip = dialog.locator(`[data-disposition$="~${disp}"]`); await chip.waitFor({ timeout: 30000 }); await chip.click();
    await page.waitForTimeout(500);
    // L'adresse de l'aperçu porte la disposition choisie ; le rendu servi la montre, puis l'aperçu affiché aussi.
    const src = await dialog.locator("iframe").first().getAttribute("src");
    assert.ok(src && decodeURIComponent(src).includes(`~${disp}`), `aperçu : adresse sans la disposition « ${disp} » (${src})`);
    const served = await (await context.request.get(new URL(src!, origin).toString())).text();
    assert.ok(served.includes(cls.slice(1)), `aperçu servi sans « ${cls} »`);
    const shown = async (ms: number) => dialog.frameLocator("iframe").first().locator(cls).first().waitFor({ state: "attached", timeout: ms }).then(() => true, () => false);
    if (!(await shown(45000))) {
      // Diagnostic : adresse réellement chargée par le cadre d'aperçu face à l'adresse demandée, puis nouvel essai.
      const urls = page.frames().map((fr) => fr.url()).filter((u) => u.includes("section-preview"));
      steps.push({ step: `aperçu « ${disp} » resté sur l'ancien rendu`, ok: false, demande: decodeURIComponent(src!), charge: urls.map(decodeURIComponent) });
      console.error("APERÇU EN RETARD", disp, JSON.stringify(urls.map(decodeURIComponent)));
      await dialog.locator("[data-disposition]").first().click(); await page.waitForTimeout(1500); await chip.click();
      assert.ok(await shown(120000), `aperçu « ${disp} » absent après un nouvel essai`);
    }
    await page.locator("text=Aperçu dans votre boutique…").waitFor({ state: "hidden", timeout: 120000 }).catch(() => {}); await page.waitForTimeout(1500);
    await shot(page, `02-galerie-${disp}`); steps.push({ step: `galerie : « ${entry} › ${disp} » avec aperçu`, ok: true });
  }
  // 2. Ajout du bandeau photo depuis la galerie.
  await search.fill("Ambiance et lookbook"); await page.waitForTimeout(400);
  await dialog.getByRole("option", { name: "Ambiance et lookbook" }).first().focus();
  await dialog.locator(`[data-disposition$="~band"]`).click(); await dialog.frameLocator("iframe").first().locator(".ed-scene--band").first().waitFor({ timeout: 120000 });
  await dialog.getByRole("button", { name: /^Ajouter cette section$/ }).click(); await dialog.waitFor({ state: "hidden", timeout: 120000 }); await page.waitForTimeout(2500);
  const afterAdd = await index(); assert.equal(afterAdd.length, initial.length + 1, "une section ajoutée");
  const added = afterAdd.find((s) => !initial.some((x) => x.id === s.id))!; assert.equal(added.type, "ed-scene");
  steps.push({ step: "ajout du bandeau photo depuis la galerie", ok: true, section: added.id });
  // Bouton d'actions de la section ajoutée (plusieurs bandeaux peuvent porter le même nom).
  const actions = async (id: string) => { const list = await index(); const s = list.find((x) => x.id === id)!; const nth = list.filter((x) => x.name === s.name).findIndex((x) => x.id === id); return page.getByRole("button", { name: `Actions pour « ${s.name} »` }).nth(nth); };
  await (await actions(added.id)).click(); await page.getByRole("menuitem", { name: /Modifier les réglages/ }).click();
  const panel = page.locator("[data-section-settings='ed-scene']"); await panel.waitFor({ timeout: 180000 }); await page.waitForTimeout(600);
  await shot(page, "03-reglages");
  // 3. Réglages : titre, bouton, côté du texte, couleurs.
  const text = async (key: string, value: string) => { const i = panel.locator(`[data-setting='${key}'] input, [data-setting='${key}'] textarea`).first(); await i.fill(value); await i.press(key === "heading" || key === "button_label" ? "Enter" : "Tab"); await page.waitForTimeout(1500); };
  await text("heading", "Un bandeau modifié dans le studio");
  await frame().locator(".ed-scene--band", { hasText: "Un bandeau modifié dans le studio" }).first().waitFor({ timeout: 120000 });
  await text("button_label", "Voir la montre");
  await panel.locator("[data-setting='text_side'] select").selectOption("right"); await page.waitForTimeout(1500);
  await frame().locator(".ed-scene--band.ed-scene--text-right", { hasText: "Un bandeau modifié dans le studio" }).first().waitFor({ timeout: 120000 });
  await panel.locator("[data-setting='color_scheme'] select").selectOption("scheme-3");
  const edited = frame().locator(".ed-scene--band.color-scheme-3", { hasText: "Un bandeau modifié dans le studio" }).first();
  await edited.waitFor({ timeout: 120000 }); await page.waitForTimeout(2500);
  await edited.scrollIntoViewIfNeeded(); await page.waitForTimeout(1500);
  await shot(page, "04-modifiee"); steps.push({ step: "titre, bouton, côté du texte et schéma de couleurs modifiés dans le panneau", ok: true });
  await page.getByRole("button", { name: /^(← Structure)$/ }).click().catch(() => {});
  // 4. Duplication puis déplacement.
  await (await actions(added.id)).click(); await page.getByRole("menuitem", { name: /^Dupliquer$/ }).click(); await page.waitForTimeout(2500);
  const afterDup = await index(); assert.equal(afterDup.length, afterAdd.length + 1, "section dupliquée");
  const copy = afterDup.find((s) => !afterAdd.some((x) => x.id === s.id))!;
  await frame().locator(".ed-scene--band", { hasText: "Un bandeau modifié dans le studio" }).nth(1).waitFor({ timeout: 120000 });
  assert.equal(await frame().locator(".ed-scene--band", { hasText: "Un bandeau modifié dans le studio" }).count(), 2, "copie visible dans l'aperçu");
  steps.push({ step: "section dupliquée (copie modifiable)", ok: true, copy: copy.id });
  const before = afterDup.findIndex((s) => s.id === added.id);
  await (await actions(added.id)).click(); await page.getByRole("menuitem", { name: /^Monter$/ }).click(); await page.waitForTimeout(2500);
  const moved = (await index()).findIndex((s) => s.id === added.id); assert.equal(moved, before - 1, "section remontée d'un rang");
  steps.push({ step: "section déplacée", ok: true, from: before, to: moved });
  await frame().locator(".ed-scene--band", { hasText: "Un bandeau modifié dans le studio" }).nth(1).waitFor({ timeout: 120000 }); await page.waitForTimeout(2500);
  await frame().locator(".ed-scene--band", { hasText: "Un bandeau modifié dans le studio" }).first().scrollIntoViewIfNeeded(); await page.waitForTimeout(1500);
  await shot(page, "05-dupliquee-deplacee");
  // 5. Rechargement complet : tout est conservé (enregistrement automatique du studio).
  await page.reload({ waitUntil: "networkidle", timeout: 240000 }); await page.waitForTimeout(1500); await frame().locator("body").waitFor({ timeout: 120000 });
  await frame().locator(".ed-scene--band.ed-scene--text-right.color-scheme-3", { hasText: "Un bandeau modifié dans le studio" }).nth(1).waitFor({ timeout: 120000 });
  const final = await index();
  assert.equal(final.findIndex((s) => s.id === added.id), moved, "ordre conservé");
  for (const id of [added.id, copy.id]) {
    const raw = JSON.stringify(await section(id));
    for (const v of ["Un bandeau modifié dans le studio", "Voir la montre", "\"right\"", "\"scheme-3\""]) assert.ok(raw.includes(v), `${id} : ${v} conservé après rechargement`);
  }
  steps.push({ step: "rechargement : ajout, réglages, copie et ordre conservés", ok: true, structure: final.map((s) => s.type) });
  await frame().locator(".ed-scene--band", { hasText: "Un bandeau modifié dans le studio" }).first().scrollIntoViewIfNeeded(); await page.waitForTimeout(2500); await shot(page, "06-apres-rechargement");
  await page.getByTitle(/^(Téléphone|Phone)$/).click(); await page.waitForTimeout(2000);
  await frame().locator(".ed-scene--band", { hasText: "Un bandeau modifié dans le studio" }).first().waitFor({ timeout: 120000 });
  await frame().locator(".ed-scene--band", { hasText: "Un bandeau modifié dans le studio" }).first().scrollIntoViewIfNeeded(); await page.waitForTimeout(2500); await shot(page, "07-telephone");
  assert.deepEqual(errors.filter((e) => !/ResizeObserver/.test(e)), [], "erreurs de page du studio");
  fs.writeFileSync(path.join(out, "heuren-studio.json"), JSON.stringify({ demo: "heuren", origin: "studio Next.js de développement, base temporaire", steps, date: new Date().toISOString() }, null, 2) + "\n");
  console.log(JSON.stringify({ ok: true, steps }));
  await context.close();
} catch (e) { try { const pages = browser.contexts().flatMap((c) => c.pages()); if (pages[0]) await pages[0].screenshot({ path: path.join(out, "heuren-99-echec.png") }); } catch { /* */ } throw e; } finally { await browser.close(); stopDev(); await new Promise((r) => setTimeout(r, 1500)); try { process.kill(-dev.pid!, "SIGKILL"); } catch { /* */ } fs.rmSync(temp, { recursive: true, force: true }); }
