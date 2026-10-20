/** Parcours studio réel pour SILLON (issue #148) — Next.js de développement + worker, base temporaire, aucune IA, aucun réseau :
 * un projet distinct (« Atelier Verre », boutique spécialisée, installé dans FRAISE) ouvre la galerie « Thèmes », choisit
 * SILLON et l'applique (vraie tâche « shop.direction » du worker) ; l'aperçu montre le profil « nomade » avec l'identité du
 * projet (aucun nom ni texte de la démonstration SILLON) ; puis, dans le panneau « Réglages » d'une section : changement de
 * disposition et modification du titre ; rechargement complet (tout est conservé) ; enfin l'aperçu est ouvert sur
 * téléphone et ordinateur. Captures à chaque étape.
 *
 *   npx tsx scripts/sillon-studio-check.ts <dossier-captures>
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium, type Page } from "playwright";
if (process.env.DATA_DIR || process.env.DATABASE_FILE) throw new Error("Base existante refusée");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-sillon-studio-")); process.env.DATA_DIR = temp; process.env.STOCK_OFFLINE = "1";
const out = path.resolve(process.argv[2] ?? "reports/sillon-studio"); fs.mkdirSync(out, { recursive: true });
const PORT = 3900 + Math.floor(Math.random() * 300), origin = `http://127.0.0.1:${PORT}`;
const { createUser } = await import("../src/lib/auth"); const { run } = await import("../src/lib/db");
const { saveThemeVersion, loadProject, saveBrand, saveSettings } = await import("../src/lib/projects"); const { runWithLang } = await import("../src/lib/i18n-server");
const { composeShop } = await import("../src/lib/engine/shop"); const { seedHoldout } = await import("../tests/lot1-holdout-fixtures");
const password = "sillon-" + Math.random().toString(36).slice(2), email = "sillon-studio@example.invalid";
const user = await createUser(email, password, "Vérification SILLON");
// Forfait Créer actif, rattaché au projet (comme un abonnement payé) : les cinq thèmes de référence y sont inclus.
const subscribe = (projectId: string) => run("INSERT INTO subscriptions (user_id,status,plan,owner_user_id,project_id,source,created_at,updated_at) VALUES (?,'active','creer',?,?,'admin',?,?)", `sillon-check-${projectId}`, user.id, projectId, Date.now(), Date.now());
// Projet distinct : son nom, ses couleurs, son produit ; installé d'abord dans FRAISE (même famille).
const pid = seedHoldout(user.id, 0, "Atelier Verre");
subscribe(pid);
const p0 = loadProject(pid);
saveBrand(pid, { ...p0.brand!, name: "Atelier Verre", tagline: "Des verres soufflés pour tous les jours.", palette: { primary: "#1F4E5F", secondary: "#CFE3E8", accent: "#2A7F62", light: "#F6F8F7", dark: "#10242B" }, direction: "fraise" });
saveSettings(pid, { ...loadProject(pid).settings, storeKind: "specialty" });
const built = await runWithLang({ content: "fr", ui: "fr" }, () => composeShop(pid, "fraise", null, false));
saveThemeVersion(pid, built.spec, "Boutique Atelier Verre (FRAISE)", "user");
const env = { ...process.env, DATA_DIR: temp, STOCK_OFFLINE: "1", NEXT_TELEMETRY_DISABLED: "1" };
const dev = spawn("npx", ["next", "dev", "-p", String(PORT), "-H", "127.0.0.1"], { env, stdio: ["ignore", "pipe", "pipe"], detached: true });
const worker = spawn("npx", ["tsx", "worker/index.ts"], { env, stdio: ["ignore", "pipe", "pipe"], detached: true });
const stop = () => { for (const c of [dev, worker]) try { process.kill(-c.pid!, "SIGTERM"); } catch { /* arrêté */ } }; process.on("exit", stop);
let log = ""; for (const c of [dev, worker]) { c.stdout.on("data", (d) => { log += d; }); c.stderr.on("data", (d) => { log += d; }); }
const started = Date.now();
for (;;) { if (Date.now() - started > 240000) throw new Error("Studio non démarré :\n" + log.slice(-2000)); try { const r = await fetch(`${origin}/connexion`); if (r.ok) break; } catch { /* pas prêt */ } await new Promise((r) => setTimeout(r, 1500)); }
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const steps: Record<string, unknown>[] = [];
const shot = async (page: Page, name: string, full = false) => { await page.screenshot({ path: path.join(out, `sillon-studio-${name}.png`), fullPage: full }); };
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" }); const page = await context.newPage();
  const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
  const login = await context.request.post(`${origin}/api/auth/login`, { data: { email, password } }); assert.ok(login.ok(), `connexion : ${login.status()}`);
  const theme = async () => (await (await context.request.get(`${origin}/api/projects/${pid}/theme`)).json()) as { current: { id: string; direction?: string; structure: { template: string; sections: { id: string; type: string; name: string }[] }[] } };
  await page.goto(`${origin}/studio/${pid}/boutique`, { waitUntil: "networkidle", timeout: 240000 }); await page.waitForTimeout(1500);
  const frame = () => page.frameLocator("iframe[src*='/preview/']").first();
  await frame().locator("body[data-conversion='pop']").waitFor({ timeout: 180000 });
  const nudge = page.locator("[data-tuto-nudge]").getByRole("button", { name: /^(Masquer|Dismiss)$/ }); if (await nudge.count()) { await nudge.click(); await page.waitForTimeout(300); }
  await shot(page, "01-avant-fraise"); steps.push({ step: "projet distinct « Atelier Verre » ouvert dans FRAISE", ok: true });
  // 1. Galerie « Thèmes » : SILLON proposé avec les autres thèmes de la catégorie, puis appliqué.
  // Le serveur de développement peut recharger la page pendant sa première compilation : la galerie est rouverte tant
  // que la demande d'application n'est pas partie (la galerie se ferme d'elle-même quand le studio a accepté la demande).
  let shotDone = false;
  for (let attempt = 1; ; attempt++) {
    await page.getByRole("button", { name: /^Thèmes$/ }).first().click();
    const card = page.getByRole("dialog").locator("li").filter({ hasText: "Objet nomade, lumière chaude" }).first();
    await card.waitFor({ timeout: 60000 }); await card.scrollIntoViewIfNeeded(); await page.waitForTimeout(800);
    if (!shotDone) { await shot(page, "02-galerie-themes"); shotDone = true; }
    const sent = page.waitForResponse((r) => r.url().includes("/theme/build") && r.request().method() === "POST", { timeout: 30000 }).then((r) => r.ok(), () => false);
    await card.getByRole("button", { name: /Appliquer ce thème/ }).click();
    if (await sent) break;
    if (attempt >= 3) throw new Error("Demande d'application jamais envoyée");
    await page.reload({ waitUntil: "networkidle", timeout: 240000 }); await page.waitForTimeout(1500);
  }
  // La tâche du worker compose SILLON puis enregistre une nouvelle version : l'aperçu passe au profil « nomade ».
  for (const t0 = Date.now(); ; ) {
    await page.waitForTimeout(4000);
    await page.reload({ waitUntil: "networkidle", timeout: 240000 });
    if (await frame().locator("body[data-conversion='nomade']").waitFor({ timeout: 60000 }).then(() => true, () => false)) break;
    if (Date.now() - t0 > 300000) throw new Error("SILLON non appliqué :\n" + log.slice(-3000));
  }
  await page.waitForTimeout(1500);
  const text = await frame().locator("body").innerText();
  assert.ok(text.includes("Atelier Verre"), "nom du projet dans l'aperçu");
  assert.ok(!/SILLON|espresso|où tout coule|avant de partir/i.test(text), "aucun texte de la démonstration SILLON dans le projet");
  await shot(page, "03-sillon-applique");
  steps.push({ step: "SILLON choisi dans la galerie et appliqué (tâche du worker) : profil « nomade », identité du projet, aucun texte de la démo", ok: true });
  // 2. Panneau « Réglages » : changement de disposition de « Bénéfices du produit » et modification du titre.
  const idx = (await theme()).current.structure.find((t) => t.template === "index")!; const sec = idx.sections.find((s) => s.type === "cv-feature")!;
  assert.ok(sec, "section « Bénéfices du produit » présente");
  await page.getByRole("button", { name: new RegExp(`Actions pour « ${sec.name} »`) }).first().click(); await page.getByRole("menuitem", { name: /Modifier les réglages/ }).click();
  const panel = page.locator("[data-section-settings='cv-feature']"); await panel.waitFor({ timeout: 180000 }); await page.waitForTimeout(600);
  await shot(page, "04-panneau-dispositions");
  await panel.locator("[data-disposition='visual']").click();
  await frame().locator(".cv-feature--stacked").first().waitFor({ timeout: 120000 }); await page.waitForTimeout(800);
  steps.push({ step: "disposition changée depuis le panneau (« Autour d'un visuel »)", ok: true });
  const headingInput = panel.locator("[data-setting='heading'] input"); await headingInput.fill("Le verre, de près"); await headingInput.press("Enter");
  await frame().locator(".cv-feature", { hasText: /Le verre, de près/ }).first().waitFor({ timeout: 120000 }); await page.waitForTimeout(800);
  await frame().locator(".cv-feature").first().scrollIntoViewIfNeeded(); await page.waitForTimeout(800);
  await shot(page, "05-section-modifiee"); steps.push({ step: "titre modifié dans le panneau, enregistré", ok: true });
  // 3. Rechargement complet : la disposition et le titre sont conservés, le thème reste SILLON.
  await page.reload({ waitUntil: "networkidle", timeout: 240000 }); await page.waitForTimeout(1500);
  await frame().locator("body[data-conversion='nomade'] .cv-feature--stacked", { hasText: /Le verre, de près/ }).first().waitFor({ timeout: 180000 });
  await frame().locator(".cv-feature").first().scrollIntoViewIfNeeded(); await page.waitForTimeout(800);
  await shot(page, "06-apres-rechargement"); steps.push({ step: "rechargement : thème, disposition et titre conservés", ok: true });
  // 4. Aperçu ouvert seul, sur téléphone et ordinateur (page complète).
  const src = await page.locator("iframe[src*='/preview/']").first().getAttribute("src");
  for (const [w, h, name] of [[390, 844, "07-apercu-telephone"], [1440, 900, "08-apercu-ordinateur"]] as const) {
    const c = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); await c.addCookies(await context.cookies());
    const pg = await c.newPage(); const r = await pg.goto(new URL(src!, origin).toString(), { waitUntil: "load", timeout: 240000 }); await pg.waitForTimeout(1500);
    assert.equal(r?.headers()["x-robots-tag"], "noindex, nofollow, noarchive", "aperçu non indexable");
    const over = await pg.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(over <= 0, `${w} px : aucun débordement horizontal (${over})`);
    await pg.screenshot({ path: path.join(out, `sillon-studio-${name}.png`), fullPage: true }); await c.close();
  }
  steps.push({ step: "aperçu téléphone et ordinateur : aucun débordement, en-tête X-Robots-Tag noindex", ok: true });
  assert.deepEqual(errors.filter((e) => !/ResizeObserver/.test(e)), [], "erreurs de page du studio");
  fs.writeFileSync(path.join(out, "sillon-studio.json"), JSON.stringify({ project: "Atelier Verre (distinct de la démo SILLON)", origin: "studio Next.js de développement + worker, base temporaire, aucune IA", steps, date: new Date().toISOString() }, null, 2) + "\n");
  console.log(JSON.stringify({ ok: true, steps }));
} catch (e) { try { const pages = browser.contexts().flatMap((c) => c.pages()); if (pages[0]) await pages[0].screenshot({ path: path.join(out, "sillon-studio-99-echec.png") }); } catch { /* */ } console.error(log.slice(-3000)); throw e; } finally { fs.writeFileSync(path.join(out, "serveur-et-worker.log"), log); await browser.close(); stop(); }
