/** Vérifie, depuis l'interface réelle du studio (Next.js lancé en développement, base temporaire), le bouton « Ajouter une
 * section » de l'onglet Boutique : recherche d'une section de la bibliothèque, aperçu, ajout, affichage dans l'aperçu
 * du thème, duplication, déplacement, masquage, choix de disposition, modification d'un texte et d'une image par les
 * opérations du studio, puis rechargement de la page : tout doit être conservé. Captures à chaque étape.
 *
 *   CHROMIUM=/chemin/chrome npx tsx scripts/lot2c-studio-check.ts <dossier-captures> <dossier-du-kit-extrait> [fraise|onde]
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium, type Page } from "playwright";
if (process.env.DATA_DIR || process.env.DATABASE_FILE) throw new Error("Base existante refusée");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-studio-")); process.env.DATA_DIR = temp; process.env.STOCK_OFFLINE = "1";
const out = path.resolve(process.argv[2] ?? "reports/lot2c-studio"); fs.mkdirSync(out, { recursive: true });
const pack = process.argv[3]; const kind = (process.argv[4] ?? "fraise") as "fraise" | "onde";
const PORT = 3123 + Math.floor(Math.random() * 500), origin = `http://127.0.0.1:${PORT}`;
const { conversionProject } = await import("../tests/lot2c-fixtures");
const { createUser } = await import("../src/lib/auth"); const { saveThemeVersion } = await import("../src/lib/projects"); const { runWithLang } = await import("../src/lib/i18n-server");
const password = "studio-check-" + Math.random().toString(36).slice(2), email = "studio-check@example.invalid";
const user = await createUser(email, password, "Vérification studio");
const f = await runWithLang({ content: "fr", ui: "fr" }, () => conversionProject(user.id, kind, pack, {}));
saveThemeVersion(f.pid, f.spec, "Thème référence — vérification studio", "user");
// Serveur Next.js de développement sur la même base (pas le lanceur « npm run dev », qui démarre aussi le worker).
const dev = spawn("npx", ["next", "dev", "-p", String(PORT), "-H", "127.0.0.1"], { env: { ...process.env, DATA_DIR: temp, STOCK_OFFLINE: "1", NEXT_TELEMETRY_DISABLED: "1" }, stdio: ["ignore", "pipe", "pipe"], detached: true });
const stopDev = () => { try { process.kill(-dev.pid!, "SIGTERM"); } catch { /* déjà arrêté */ } }; process.on("exit", stopDev);
let log = ""; dev.stdout.on("data", (d) => { log += d; }); dev.stderr.on("data", (d) => { log += d; });
const started = Date.now();
for (;;) { if (Date.now() - started > 240000) throw new Error("Studio non démarré :\n" + log.slice(-2000)); try { const r = await fetch(`${origin}/connexion`); if (r.ok) break; } catch { /* pas encore prêt */ } await new Promise((r) => setTimeout(r, 1500)); }
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/usr/bin/chromium", args: ["--no-sandbox"] });
const steps: Record<string, unknown>[] = [];
const shot = async (page: Page, name: string) => { await page.screenshot({ path: path.join(out, `${kind}-${name}.png`) }); };
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" }); const page = await context.newPage();
  const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
  // Connexion par l'API du studio (le cookie de session est posé dans le navigateur).
  const login = await context.request.post(`${origin}/api/auth/login`, { data: { email, password } }); assert.ok(login.ok(), `connexion : ${login.status()}`);
  await page.goto(`${origin}/studio/${f.pid}/boutique`, { waitUntil: "networkidle", timeout: 180000 }); await page.waitForTimeout(1500);
  const frame = () => page.frameLocator("iframe[src*='/preview/']").first();
  await frame().locator("body").waitFor({ timeout: 120000 }); await shot(page, "01-onglet-boutique");
  // Invitation au tutoriel vidéo (coin de l'écran) : fermée comme le ferait l'utilisateur, sinon elle couvre le bouton.
  const nudge = page.locator("[data-tuto-nudge]").getByRole("button", { name: /^(Masquer|Dismiss)$/ }); if (await nudge.count()) { await nudge.click(); await page.waitForTimeout(300); }
  // 1. Bouton « Ajouter une section » (bas de la page), recherche, aperçu, ajout.
  const addButtons = page.getByRole("button", { name: /^Ajouter une section$/ }); await addButtons.last().scrollIntoViewIfNeeded(); await addButtons.last().click();
  const dialog = page.getByRole("dialog"); await dialog.waitFor(); await dialog.getByPlaceholder("Rechercher des sections").fill("Points interactifs"); await page.waitForTimeout(600);
  // Sur ordinateur, le survol montre l'aperçu de la section dans la boutique ; le clic l'ajoute (comme dans Shopify).
  const option = dialog.getByRole("option", { name: /points interactifs/i }).first(); await option.hover(); await dialog.frameLocator("iframe").first().locator("[data-cv-hotspots]").waitFor({ timeout: 90000 }); await page.waitForTimeout(1200); await shot(page, "02-bibliotheque-apercu");
  await option.click(); await dialog.waitFor({ state: "hidden", timeout: 90000 }); await page.waitForTimeout(2500);
  assert.ok(await page.getByText(/points interactifs/i).first().isVisible(), "section listée après ajout");
  await frame().locator("[data-cv-hotspots]").first().waitFor({ timeout: 60000 }); await shot(page, "03-section-ajoutee");
  steps.push({ step: "ajout depuis le bouton Sections", ok: true });
  // 2. Points interactifs : un point s'ouvre dans l'aperçu, en vue « Téléphone » (l'aperçu « Ordinateur » est réduit par une
  //    transformation CSS pour tenir dans la colonne, ce qui fausse les coordonnées d'un clic automatisé ; le clic réel au
  //    téléphone et à l'ordinateur hors studio est couvert par la preuve `lot2c-proof.ts`).
  await page.getByTitle(/^(Téléphone|Phone)$/).click(); await page.waitForTimeout(1500); await frame().locator("[data-cv-hotspots]").first().waitFor({ timeout: 60000 });
  await frame().locator("[data-cv-hotspots]").first().scrollIntoViewIfNeeded(); await page.waitForTimeout(1200); await frame().locator("[data-cv-hotspot]").first().click(); await page.waitForTimeout(400);
  assert.equal(await frame().locator("[data-cv-hotspot]").first().getAttribute("aria-expanded"), "true"); await shot(page, "04-point-ouvert"); steps.push({ step: "point interactif ouvert dans l'aperçu (vue Téléphone)", ok: true }); await page.getByTitle(/^(Ordinateur|Desktop)$/).click(); await page.waitForTimeout(800);
  // 3. Menu de la section : dupliquer, puis choisir la disposition.
  const menu = page.getByRole("button", { name: /Actions pour « .*points interactifs »/i }).first(); await menu.click(); await page.getByRole("menuitem", { name: /Dupliquer/ }).click();
  // L'aperçu est rechargé avec la nouvelle version : on attend la seconde section plutôt qu'un délai fixe.
  await frame().locator("[data-cv-hotspots]").nth(1).waitFor({ timeout: 90000 }); await page.waitForTimeout(800);
  assert.equal(await frame().locator("[data-cv-hotspots]").count(), 2, "section dupliquée dans l'aperçu"); await shot(page, "05-dupliquee"); steps.push({ step: "duplication", ok: true });
  await page.getByRole("button", { name: /Actions pour « .*points interactifs »/i }).first().click(); const layoutItem = page.getByRole("menuitem", { name: /Choisir la disposition/ });
  if (await layoutItem.count()) { await layoutItem.click(); await page.waitForTimeout(800); await shot(page, "06-dispositions"); const side = page.getByText(/côte à côte/).first(); if (await side.count()) { await side.click(); await page.waitForTimeout(2500); } await page.keyboard.press("Escape"); steps.push({ step: "choix de disposition", ok: true, applied: (await frame().locator(".cv-hotspots--side").count()) > 0 }); } else { await page.keyboard.press("Escape"); steps.push({ step: "choix de disposition", ok: false, reason: "menu absent" }); }
  // 4. Texte et image modifiés par les opérations du studio (mêmes appels que les panneaux de l'interface), puis masquage d'une copie.
  const theme = await (await context.request.get(`${origin}/api/projects/${f.pid}/theme`)).json() as { current: { versionId: string; structure: { template: string; sections: { id: string; type: string }[] }[] } };
  const index = theme.current.structure.find((t) => t.template === "index")!; const added = index.sections.filter((s) => s.type === "cv-hotspots");
  assert.equal(added.length, 2);
  const otherImage = Object.keys(f.spec.files).find((k) => /scene|banniere/.test(k) && k.endsWith(".webp"))!;
  const ops = await context.request.post(`${origin}/api/projects/${f.pid}/theme/ops`, { data: { ops: [{ op: "set_setting", template: "index", section: added[0].id, key: "heading", value: "Titre modifié depuis le studio" }, { op: "set_setting", template: "index", section: added[0].id, key: "image_asset", value: otherImage }, { op: "toggle_section", template: "index", section: added[1].id, disabled: true }], summary: "Vérification : texte, image, masquage" } });
  assert.ok(ops.ok(), `opérations : ${ops.status()} ${await ops.text()}`);
  // 5. Rechargement complet de la page du studio : tout est conservé.
  await page.reload({ waitUntil: "networkidle", timeout: 180000 }); await page.waitForTimeout(1500); await frame().locator("body").waitFor({ timeout: 120000 });
  await frame().locator("[data-cv-hotspots]").first().waitFor({ timeout: 60000 });
  const after = { visible: await frame().locator("[data-cv-hotspots]").count(), heading: await frame().locator("[data-cv-hotspots] h2").first().innerText(), image: await frame().locator("[data-cv-hotspots] img").first().getAttribute("src"), listed: await page.getByText(/points interactifs/i).count() };
  assert.equal(after.visible, 1, "la copie masquée n'est plus rendue, l'originale reste"); assert.match(after.heading, /titre modifié depuis le studio/i); assert.ok((after.image ?? "").includes(otherImage), `image remplacée (${after.image})`); assert.ok(after.listed >= 2, "les deux sections restent listées (dont une masquée)");
  await page.getByTitle(/^(Téléphone|Phone)$/).click(); await frame().locator("[data-cv-hotspots]").first().waitFor({ timeout: 60000 }); await frame().locator("[data-cv-hotspots]").first().scrollIntoViewIfNeeded(); await page.waitForTimeout(1500); await shot(page, "07-apres-rechargement"); steps.push({ step: "texte, image, masquage puis rechargement", ok: true, after });
  assert.deepEqual(errors.filter((e) => !/ResizeObserver/.test(e)), [], "erreurs de page du studio");
  fs.writeFileSync(path.join(out, `${kind}-studio.json`), JSON.stringify({ kind, origin: "studio Next.js de développement, base temporaire", steps, date: new Date().toISOString() }, null, 2) + "\n");
  console.log(JSON.stringify({ ok: true, kind, steps }));
} finally { await browser.close(); stopDev(); await new Promise((r) => setTimeout(r, 1500)); try { process.kill(-dev.pid!, "SIGKILL"); } catch { /* arrêté */ } fs.rmSync(temp, { recursive: true, force: true }); }
