/** TRAVERSE (dossier du 23 octobre, PR #167) : preuve d'édition depuis l'interface réelle du studio (Next.js en
 * développement, base temporaire, aucune IA, aucun réseau).
 *  1. La galerie « Boutique spécialisée » propose chaque composition des maquettes TRAVERSE avec un aperçu réel.
 *  2. Un bandeau photo est ajouté depuis la galerie, puis modifié dans le panneau « Réglages » : titre, bouton en
 *     contour, photo remplacée par une autre image du projet (« Mes images »), couleurs ; il est dupliqué, déplacé ;
 *     après rechargement complet, tout est conservé.
 *  3. Un projet client fictif (son logo, son produit, ses photos, ses textes) est habillé en TRAVERSE par l'adaptation
 *     du studio : l'aperçu montre son logo et son produit, aucune photo ni aucun texte de la démonstration.
 *
 *   npx tsx scripts/traverse-studio-check.ts <dossier-captures>      (VIDEO_DIR=<dossier> : vidéo du parcours)
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium, type Page } from "playwright";
if (process.env.DATA_DIR || process.env.DATABASE_FILE) throw new Error("Base existante refusée");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-traverse-studio-")); process.env.DATA_DIR = temp; process.env.STOCK_OFFLINE = "1";
const out = path.resolve(process.argv[2] ?? "reports/traverse-studio"); fs.mkdirSync(out, { recursive: true });
/** Compositions des maquettes : fonction de la galerie, disposition, classe attendue dans l'aperçu. */
const GALLERY = [
  ["Présentation principale", "photo-band", ".cv-banner--h-hero"],
  ["Présentation principale", "band", ".cv-banner--h-medium"],
  ["Présentation principale", "product-card", ".cv-hero--card"],
  ["Bénéfices du produit", "essentials", ".cv-feature--essentials"],
  ["Détails du produit", "photo-cards", ".cv-cards--overlay"],
  ["Garanties et livraison", "notes", ".fs-notes"],
  ["Contact", "form-photo", ".es-contact"],
] as const;
const PORT = 3600 + Math.floor(Math.random() * 300), origin = `http://127.0.0.1:${PORT}`;
const { demoProject } = await import("../tests/demo-fixtures");
const { clientFixture } = await import("../tests/mission154-fixtures");
const { createUser } = await import("../src/lib/auth"); const { saveThemeVersion, currentTheme } = await import("../src/lib/projects"); const { runWithLang } = await import("../src/lib/i18n-server");
const { buildShop } = await import("../src/lib/engine/shop");
const password = "traverse-" + Math.random().toString(36).slice(2), email = "traverse-studio@example.invalid";
const user = await createUser(email, password, "Vérification TRAVERSE");
const fr = <T,>(fn: () => T) => runWithLang({ content: "fr", ui: "fr" }, fn);
const f = await fr(() => demoProject(user.id, "traverse"));
saveThemeVersion(f.pid, f.spec, "Démonstration TRAVERSE — vérification de l'édition", "user");
const { run } = await import("../src/lib/db");
const plan = process.env.CHECK_PLAN ?? "dominer";
run("INSERT INTO subscriptions (user_id,status,plan,owner_user_id,project_id,source,created_at,updated_at) VALUES (?,'active',?,?,?,'admin',?,?)", `traverse-check-${f.pid}`, plan, user.id, f.pid, Date.now(), Date.now());
// Projet client fictif : logo, produit « Théière Anse », photos et textes saisis ; habillé en TRAVERSE sans IA.
const client = await clientFixture({ brand: "Céramor" });
await fr(() => buildShop(null, client.pid, { direction: "traverse", useAi: false }));
const clientTheme = currentTheme(client.pid)!, clientSpec = clientTheme.spec;
assert.equal(clientSpec.direction, "traverse"); assert.ok(clientSpec.settings.logo_asset, "logo du client posé dans le thème");
const dev = spawn("npx", ["next", "dev", "-p", String(PORT), "-H", "127.0.0.1"], { env: { ...process.env, DATA_DIR: temp, STOCK_OFFLINE: "1", NEXT_TELEMETRY_DISABLED: "1" }, stdio: ["ignore", "pipe", "pipe"], detached: true });
const stopDev = () => { try { process.kill(-dev.pid!, "SIGTERM"); } catch { /* arrêté */ } }; process.on("exit", stopDev);
let log = ""; dev.stdout.on("data", (d) => { log += d; }); dev.stderr.on("data", (d) => { log += d; });
const started = Date.now();
for (;;) { if (Date.now() - started > 240000) throw new Error("Studio non démarré :\n" + log.slice(-2000)); try { const r = await fetch(`${origin}/connexion`); if (r.ok) break; } catch { /* pas prêt */ } await new Promise((r) => setTimeout(r, 1500)); }
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const steps: Record<string, unknown>[] = [];
const shot = async (page: Page, name: string) => { await page.screenshot({ path: path.join(out, `traverse-${name}.png`) }); };
/** Pleine page : images chargées à la demande forcées, page parcourue puis images décodées avant la capture. */
const loadAll = async (p: Page) => { await p.evaluate(async () => { document.querySelectorAll("img[loading=lazy]").forEach((i) => ((i as HTMLImageElement).loading = "eager")); for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); await Promise.all([...document.images].map((i) => i.decode().catch(() => {}))); }); await p.waitForTimeout(500); };
type Structure = { template: string; sections: { id: string; type: string; name: string }[] }[];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR", ...(process.env.VIDEO_DIR ? { recordVideo: { dir: process.env.VIDEO_DIR, size: { width: 1440, height: 900 } } } : {}) }); const page = await context.newPage();
  const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
  const login = await context.request.post(`${origin}/api/auth/login`, { data: { email, password } }); assert.ok(login.ok(), `connexion : ${login.status()}`);
  const theme = async () => ((await (await context.request.get(`${origin}/api/projects/${f.pid}/theme`)).json()) as { current: { structure: Structure } }).current.structure;
  const index = async () => (await theme()).find((t) => t.template === "index")!.sections;
  const section = async (id: string) => (await (await context.request.get(`${origin}/api/projects/${f.pid}/theme/section?template=index&section=${id}`)).json()) as Record<string, unknown>;
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
  steps.push({ step: `forfait « ${plan} » : fonctions proposées (${offered.length})`, ok: true, offered });
  for (const [entry, disp, cls] of GALLERY) {
    await search.fill(entry); await page.waitForTimeout(400);
    await dialog.getByRole("option", { name: entry }).first().focus();
    const chips = dialog.locator(`[data-disposition$="~${disp}"]`);
    assert.equal(await chips.count(), 1, `« ${entry} › ${disp} » proposée une seule fois`);
    await chips.click(); await page.waitForTimeout(500);
    const src = await dialog.locator("iframe").first().getAttribute("src");
    assert.ok(src && decodeURIComponent(src).includes(`~${disp}`), `aperçu : adresse sans la disposition « ${disp} » (${src})`);
    const served = await (await context.request.get(new URL(src!, origin).toString(), { timeout: 240000 })).text();
    assert.ok(served.includes(cls.slice(1)), `aperçu servi sans « ${cls} »`);
    assert.ok(!/theme-assets\/traverse\/(ambiance|produit-0|logo)/.test(served), "aucune ancienne photo TRAVERSE dans l'aperçu");
    const shown = async (ms: number) => dialog.frameLocator("iframe").first().locator(cls).first().waitFor({ state: "attached", timeout: ms }).then(() => true, () => false);
    if (!(await shown(45000))) { await dialog.locator("[data-disposition]").first().click(); await page.waitForTimeout(1500); await chips.click(); assert.ok(await shown(120000), `aperçu « ${disp} » absent après un nouvel essai`); }
    await page.locator("text=Aperçu dans votre boutique…").waitFor({ state: "hidden", timeout: 120000 }).catch(() => {}); await page.waitForTimeout(1500);
    await shot(page, `02-galerie-${disp}`); steps.push({ step: `galerie : « ${entry} › ${disp} » avec aperçu`, ok: true });
  }
  // 2. Ajout du bandeau photo depuis la galerie.
  await search.fill("Présentation principale"); await page.waitForTimeout(400);
  await dialog.getByRole("option", { name: "Présentation principale" }).first().focus();
  await dialog.locator(`[data-disposition$="~photo-band"]`).click(); await dialog.frameLocator("iframe").first().locator(".cv-banner--h-hero").first().waitFor({ timeout: 120000 });
  await dialog.getByRole("button", { name: /^Ajouter cette section$/ }).click(); await dialog.waitFor({ state: "hidden", timeout: 120000 }); await page.waitForTimeout(2500);
  const afterAdd = await index(); assert.equal(afterAdd.length, initial.length + 1, "une section ajoutée");
  const added = afterAdd.find((s) => !initial.some((x) => x.id === s.id))!; assert.equal(added.type, "cv-banner");
  const imageBefore = String(JSON.stringify(await section(added.id)).match(/"image_asset":"([^"]*)"/)?.[1] ?? "");
  steps.push({ step: "ajout du bandeau photo depuis la galerie", ok: true, section: added.id, image: imageBefore });
  const actions = async (id: string) => { const list = await index(); const s = list.find((x) => x.id === id)!; const nth = list.filter((x) => x.name === s.name).findIndex((x) => x.id === id); return page.getByRole("button", { name: `Actions pour « ${s.name} »` }).nth(nth); };
  await (await actions(added.id)).click(); await page.getByRole("menuitem", { name: /Modifier les réglages/ }).click();
  const panel = page.locator("[data-section-settings='cv-banner']"); await panel.waitFor({ timeout: 180000 }); await page.waitForTimeout(600);
  await shot(page, "03-reglages");
  // 3. Réglages : titre, texte du bouton, bouton en contour, photo remplacée, couleurs.
  const text = async (key: string, value: string) => { const i = panel.locator(`[data-setting='${key}'] input, [data-setting='${key}'] textarea`).first(); await i.fill(value); await i.press("Enter"); await i.blur(); await page.waitForTimeout(1500); };
  const TITLE = "UN BANDEAU MODIFIÉ DANS LE STUDIO";
  await text("heading", TITLE);
  await frame().locator(".cv-banner", { hasText: TITLE }).first().waitFor({ timeout: 120000 });
  await text("button_label", "Voir le sac");
  await panel.locator("[data-setting='button_style'] select").selectOption("outline"); await page.waitForTimeout(1500);
  const field = panel.locator("[data-setting='image_asset']");
  await field.getByRole("button", { name: /Mes images/ }).click();
  const pick = field.getByRole("button", { name: /Utiliser « .*lac/ }).first(); await pick.waitFor({ timeout: 60000 });
  await pick.click(); await page.waitForTimeout(2500);
  await panel.locator("[data-setting='color_scheme'] select").selectOption("scheme-3");
  const edited = frame().locator(".cv-banner.color-scheme-3", { hasText: TITLE }).first();
  await edited.waitFor({ timeout: 120000 }); await page.waitForTimeout(2500);
  const imageAfter = String(JSON.stringify(await section(added.id)).match(/"image_asset":"([^"]*)"/)?.[1] ?? "");
  assert.ok(imageAfter && imageAfter !== imageBefore, `photo remplacée (${imageBefore} → ${imageAfter})`);
  const shownSrc = (await edited.locator("img").first().getAttribute("src")) ?? ""; assert.ok(shownSrc.includes(imageAfter.replace(/\.[a-z]+$/, "")), `nouvelle photo visible dans l'aperçu (${shownSrc})`);
  assert.equal(await edited.locator(".cv-button--outline, .es-button--outline, [class*='outline']").count() > 0, true, "bouton en contour dans l'aperçu");
  await edited.scrollIntoViewIfNeeded(); await page.waitForTimeout(1500);
  await shot(page, "04-modifiee"); steps.push({ step: "titre, texte du bouton, bouton en contour, photo remplacée et couleurs modifiés dans le panneau", ok: true, image: `${imageBefore} → ${imageAfter}` });
  await page.getByRole("button", { name: /^(← Structure)$/ }).click().catch(() => {});
  // 4. Duplication puis déplacement.
  await (await actions(added.id)).click(); await page.getByRole("menuitem", { name: /^Dupliquer$/ }).click(); await page.waitForTimeout(2500);
  const afterDup = await index(); assert.equal(afterDup.length, afterAdd.length + 1, "section dupliquée");
  const copy = afterDup.find((s) => !afterAdd.some((x) => x.id === s.id))!;
  await frame().locator(".cv-banner", { hasText: TITLE }).nth(1).waitFor({ timeout: 120000 });
  steps.push({ step: "section dupliquée (copie modifiable)", ok: true, copy: copy.id });
  const before = afterDup.findIndex((s) => s.id === added.id);
  await (await actions(added.id)).click(); await page.getByRole("menuitem", { name: /^Monter$/ }).click(); await page.waitForTimeout(2500);
  const moved = (await index()).findIndex((s) => s.id === added.id); assert.equal(moved, before - 1, "section remontée d'un rang");
  steps.push({ step: "section déplacée", ok: true, from: before, to: moved });
  await frame().locator(".cv-banner", { hasText: TITLE }).first().scrollIntoViewIfNeeded(); await page.waitForTimeout(2000);
  await shot(page, "05-dupliquee-deplacee");
  // 5. Rechargement complet : tout est conservé (enregistrement automatique du studio).
  await page.reload({ waitUntil: "networkidle", timeout: 240000 }); await page.waitForTimeout(1500); await frame().locator("body").waitFor({ timeout: 120000 });
  await frame().locator(".cv-banner.color-scheme-3", { hasText: TITLE }).nth(1).waitFor({ timeout: 120000 });
  const final = await index();
  assert.equal(final.findIndex((s) => s.id === added.id), moved, "ordre conservé");
  for (const id of [added.id, copy.id]) {
    const raw = JSON.stringify(await section(id));
    for (const v of [TITLE, "Voir le sac", "\"button_style\":\"outline\"", "\"scheme-3\"", imageAfter]) assert.ok(raw.includes(v), `${id} : ${v} conservé après rechargement`);
  }
  steps.push({ step: "rechargement : ajout, réglages, photo, copie et ordre conservés", ok: true, structure: final.map((s) => s.type) });
  await frame().locator(".cv-banner", { hasText: TITLE }).first().scrollIntoViewIfNeeded(); await page.waitForTimeout(2500); await shot(page, "06-apres-rechargement");
  await page.getByTitle(/^(Téléphone|Phone)$/).click(); await page.waitForTimeout(2000);
  await frame().locator(".cv-banner", { hasText: TITLE }).first().scrollIntoViewIfNeeded(); await page.waitForTimeout(2500); await shot(page, "07-telephone");
  // 6. Projet client habillé en TRAVERSE : son logo, son produit, ses photos ; rien de la démonstration.
  // Le projet client appartient à son propre compte (titulaire du forfait) : connexion avec ce compte.
  const clientCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR", ...(process.env.VIDEO_DIR ? { recordVideo: { dir: process.env.VIDEO_DIR, size: { width: 1440, height: 900 } } } : {}) });
  assert.ok((await clientCtx.request.post(`${origin}/api/auth/login`, { data: { email: client.user.email, password: "fictitious-client-154" } })).ok(), "connexion du compte client");
  await page.close(); const cpage = await clientCtx.newPage(); cpage.on("pageerror", (e) => errors.push(e.message));
  await cpage.goto(`${origin}/studio/${client.pid}/boutique`, { waitUntil: "networkidle", timeout: 240000 }); await cpage.waitForTimeout(1500);
  const cnudge = cpage.locator("[data-tuto-nudge]").getByRole("button", { name: /^(Masquer|Dismiss)$/ }); if (await cnudge.count()) { await cnudge.click(); await cpage.waitForTimeout(300); }
  await cpage.frameLocator("iframe[src*='/preview/']").first().locator(".es-header__logo-img").first().waitFor({ timeout: 120000 }); await cpage.waitForTimeout(2500);
  await shot(cpage, "08-client-studio");
  const preview = await clientCtx.newPage();
  for (const [route, name] of [["", "accueil"], [`products/${clientSpec.store.product.handle}`, "produit"]] as const) {
    await preview.setViewportSize({ width: 1440, height: 900 });
    await preview.goto(`${origin}/preview/${client.pid}/v/${clientTheme.version.id}/${route}`, { waitUntil: "networkidle", timeout: 240000 });
    const html = await preview.content();
    const logo = await preview.locator(".es-header__logo-img").first().getAttribute("src");
    assert.ok(logo && logo.includes(String(clientSpec.settings.logo_asset).replace(/\.[a-z]+$/, "")), `logo du client dans l'en-tête (${logo})`);
    assert.ok(html.includes("Théière Anse") && html.includes("Céramor"), `${name} : produit et marque du client`);
    assert.ok(!/theme-assets\/traverse|traverse-(hero-gare|lac|montagne|train|paysage|produit-reference|detail-)/.test(html), `${name} : aucune photo de la démonstration`);
    assert.ok(!/FERMEZ L'ORDI|PRÊT POUR VENDREDI|CHANGEZ DE DÉCOR|LA SUITE EST DEHORS/i.test(html), `${name} : aucun texte de la démonstration`);
    await loadAll(preview); await preview.screenshot({ path: path.join(out, `traverse-09-client-${name}.png`), fullPage: true });
    await preview.setViewportSize({ width: 390, height: 844 }); await preview.reload({ waitUntil: "networkidle" }); await loadAll(preview);
    await preview.screenshot({ path: path.join(out, `traverse-10-client-${name}-telephone.png`), fullPage: true });
    steps.push({ step: `projet client en TRAVERSE (${name}) : logo, produit et photos du client, rien de la démonstration`, ok: true, logo });
  }
  await preview.close(); await clientCtx.close();
  assert.deepEqual(errors.filter((e) => !/ResizeObserver/.test(e)), [], "erreurs de page du studio");
  fs.writeFileSync(path.join(out, "traverse-studio.json"), JSON.stringify({ demo: "traverse", origin: "studio Next.js de développement, base temporaire", steps, date: new Date().toISOString() }, null, 2) + "\n");
  console.log(JSON.stringify({ ok: true, steps: steps.map((s) => s.step) }));
  await context.close();
} catch (e) { try { const pages = browser.contexts().flatMap((c) => c.pages()); if (pages[0]) await pages[0].screenshot({ path: path.join(out, "traverse-99-echec.png") }); } catch { /* */ } console.error(log.slice(-1500)); throw e; } finally { await browser.close(); stopDev(); await new Promise((r) => setTimeout(r, 1500)); try { process.kill(-dev.pid!, "SIGKILL"); } catch { /* */ } fs.rmSync(temp, { recursive: true, force: true }); }
