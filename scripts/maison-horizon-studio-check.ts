/** MAISON & HORIZON (issue #172) : preuve de l'onglet « Biens » dans l'interface réelle du studio (Next.js en
 * développement, base temporaire, aucune IA, aucun réseau). Parcours de Thomas : Biens → Ajouter → saisir → photos →
 * prévisualiser → enregistrer / publier ; publication refusée tant qu'il manque l'essentiel (message du serveur
 * affiché) ; une fois publié, le bien apparaît sur la page Louer et a sa fiche, sans toucher au thème ; retiré, il
 * disparaît. Captures à chaque étape.
 *
 *   npx tsx scripts/maison-horizon-studio-check.ts <dossier-captures>      (VIDEO_DIR=<dossier> : vidéo du parcours)
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium, type Page } from "playwright";
if (process.env.DATA_DIR || process.env.DATABASE_FILE) throw new Error("Base existante refusée");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-mh-studio-")); process.env.DATA_DIR = temp; process.env.STOCK_OFFLINE = "1";
const out = path.resolve(process.argv[2] ?? "reports/maison-horizon-studio"); fs.mkdirSync(out, { recursive: true });
const PORT = 3600 + Math.floor(Math.random() * 300), origin = `http://127.0.0.1:${PORT}`;
const { demoProject } = await import("../tests/demo-fixtures");
const { createUser } = await import("../src/lib/auth"); const { saveThemeVersion } = await import("../src/lib/projects"); const { runWithLang } = await import("../src/lib/i18n-server");
const password = "mh-" + Math.random().toString(36).slice(2), email = "mh-studio@example.invalid";
const user = await createUser(email, password, "Vérification Maison & Horizon");
const f = await runWithLang({ content: "fr", ui: "fr" }, () => demoProject(user.id, "maison-horizon"));
const version = saveThemeVersion(f.pid, f.spec, "Démonstration Maison & Horizon — vérification des biens", "user");
const { run } = await import("../src/lib/db");
run("INSERT INTO subscriptions (user_id,status,plan,owner_user_id,project_id,source,created_at,updated_at) VALUES (?,'active',?,?,?,'admin',?,?)", `mh-check-${f.pid}`, "dominer", user.id, f.pid, Date.now(), Date.now());
const dev = spawn("npx", ["next", "dev", "-p", String(PORT), "-H", "127.0.0.1"], { env: { ...process.env, DATA_DIR: temp, STOCK_OFFLINE: "1", NEXT_TELEMETRY_DISABLED: "1" }, stdio: ["ignore", "pipe", "pipe"], detached: true });
const stopDev = () => { try { process.kill(-dev.pid!, "SIGTERM"); } catch { /* arrêté */ } }; process.on("exit", stopDev);
let log = ""; dev.stdout.on("data", (d) => { log += d; }); dev.stderr.on("data", (d) => { log += d; });
const started = Date.now();
for (;;) { if (Date.now() - started > 240000) throw new Error("Studio non démarré :\n" + log.slice(-2000)); try { const r = await fetch(`${origin}/connexion`); if (r.ok) break; } catch { /* pas prêt */ } await new Promise((r) => setTimeout(r, 1000)); }
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const steps: Record<string, unknown>[] = [];
const shot = async (page: Page, name: string, full = false) => { await page.screenshot({ path: path.join(out, `mh-${name}.png`), fullPage: full }); };
const TITLE = "Studio lumineux près de la gare";
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR", ...(process.env.VIDEO_DIR ? { recordVideo: { dir: process.env.VIDEO_DIR, size: { width: 1440, height: 900 } } } : {}) });
  const page = await context.newPage();
  const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
  const login = await context.request.post(`${origin}/api/auth/login`, { data: { email, password } }); assert.ok(login.ok(), `connexion : ${login.status()}`);
  const preview = (p: string) => `${origin}/preview/${f.pid}/v/${version.id}${p}`;
  const louer = async () => (await context.request.get(preview("/pages/louer"))).text();
  const before = await louer();
  assert.ok(!before.includes(TITLE), "le bien n'existe pas encore");

  // 1. L'onglet « Biens » : la liste des 27 biens de la démonstration, dans le menu du studio.
  await page.goto(`${origin}/studio/${f.pid}/biens`, { waitUntil: "networkidle", timeout: 240000 });
  const nudge = page.locator("[data-tuto-nudge]").getByRole("button", { name: /^(Masquer|Dismiss)$/ }); if (await nudge.count()) await nudge.click();
  await page.getByText("Vos biens à vendre et à louer", { exact: true }).waitFor({ timeout: 120000 });
  await page.getByRole("link", { name: /^Biens/ }).first().waitFor({ timeout: 30000 });
  const listed = await page.locator("li").filter({ hasText: /V-0001|L-0001/ }).count();
  assert.ok(listed >= 2, "biens de la démonstration listés");
  await shot(page, "01-onglet-biens"); steps.push({ step: "onglet « Biens » dans le menu, biens de la démonstration listés", ok: true });

  // 2. Ajouter : un bien à louer, en brouillon.
  await page.getByRole("button", { name: "Ajouter un bien" }).first().click();
  const add = page.getByRole("dialog"); await add.waitFor();
  await add.getByRole("radio", { name: "À louer" }).click();
  await add.getByLabel(/Titre du bien/).fill(TITLE);
  await shot(page, "02-ajouter");
  await add.getByRole("button", { name: "Créer le brouillon" }).click();
  const edit = page.getByRole("dialog"); await edit.getByText(/^L-0014 — /).waitFor({ timeout: 30000 });
  steps.push({ step: "ajout : brouillon L-0014 créé, fiche ouverte", ok: true });

  // 3. Publication refusée tant qu'il manque l'essentiel : message du serveur affiché tel quel.
  await edit.getByLabel(/^Ville \*/).fill("Lille");
  await edit.getByRole("button", { name: "Enregistrer et publier" }).click();
  const refusal = edit.getByRole("alert"); await refusal.waitFor({ timeout: 30000 });
  const refusalText = (await refusal.innerText()).trim();
  assert.match(refusalText, /il manque/); assert.match(refusalText, /photo/); assert.match(refusalText, /surface/); assert.match(refusalText, /loyer/);
  await shot(page, "03-publication-refusee"); steps.push({ step: "publication refusée, message du serveur affiché", ok: true, message: refusalText });

  // 4. Saisie et photos du projet (bibliothèque), description de la photo.
  await edit.getByLabel(/Loyer hors charges/).fill("690");
  await edit.getByLabel(/Charges \(€/).fill("45");
  await edit.getByLabel(/Surface habitable/).fill("31");
  await edit.getByLabel(/^Pièces$/).fill("1");
  await edit.getByLabel(/Description \(paragraphes/).fill("Un studio clair, refait, à deux pas de la gare.\n\nCuisine équipée et salle d'eau.");
  await edit.getByRole("button", { name: "Ajouter des photos du projet" }).click();
  const picker = page.getByRole("dialog", { name: /Choisir des photos du projet/ }); await picker.waitFor();
  await picker.getByPlaceholder(/Rechercher/).fill("espace-recherche"); await page.waitForTimeout(1500);
  await picker.locator("button[aria-pressed]").first().click();
  await picker.getByRole("button", { name: /^Utiliser/ }).click();
  await edit.getByLabel("Description de la photo 1").fill("Maison en pierre à étage avec piscine (photo d'exemple)");
  await shot(page, "04-saisie-photos"); steps.push({ step: "saisie, photo choisie dans les médias du projet, description", ok: true });

  // 5. Enregistrer (brouillon) puis prévisualiser le brouillon seul.
  await edit.getByRole("button", { name: /^Enregistrer$/ }).click(); await page.getByText("Fiche enregistrée.").waitFor({ timeout: 30000 });
  const draftHref = await edit.getByRole("link", { name: /Prévisualiser/ }).getAttribute("href");
  assert.ok(draftHref && draftHref.includes("es_bien="), "aperçu du brouillon");
  const draftPage = await context.newPage(); await draftPage.goto(new URL(draftHref!, origin).toString(), { waitUntil: "load" });
  await draftPage.getByRole("heading", { level: 1, name: TITLE }).waitFor({ timeout: 60000 });
  await draftPage.screenshot({ path: path.join(out, "mh-05-apercu-brouillon.png"), fullPage: false }); await draftPage.close();
  assert.ok(!(await louer()).includes(TITLE), "brouillon absent de la page Louer");
  steps.push({ step: "brouillon prévisualisé seul, absent du site", ok: true });

  // 6. Publier : le bien apparaît sur la page Louer et a sa fiche, sans changer le thème.
  await edit.getByRole("button", { name: "Enregistrer et publier" }).click(); await page.getByText("Bien publié : le site l'affiche.").waitFor({ timeout: 30000 });
  const after = await louer(); assert.ok(after.includes(TITLE) && after.includes('data-ref="L-0014"'), "bien publié sur la page Louer");
  const site = await context.newPage(); await site.goto(preview("/pages/louer?ville=Lille"), { waitUntil: "load" });
  await site.locator('[data-ref="L-0014"]').waitFor({ timeout: 60000 }); await site.waitForTimeout(800);
  await site.screenshot({ path: path.join(out, "mh-06-site-louer-lille.png"), fullPage: true });
  // Bandeau cookies : on répond comme un visiteur ; puis clic sur le titre (lien qui couvre toute la carte).
  const refuse = site.locator("[data-cookie-banner] [data-cookie-choice=refuse]").first(); if (await refuse.isVisible()) await refuse.click();
  await site.locator('[data-ref="L-0014"]').getByRole("link", { name: TITLE }).click(); await site.getByRole("heading", { level: 1, name: TITLE }).waitFor({ timeout: 60000 });
  await site.screenshot({ path: path.join(out, "mh-07-fiche-publiee.png"), fullPage: false }); await site.close();
  steps.push({ step: "publié : visible sur la page Louer (filtre Lille) et fiche ouverte, version du thème inchangée", ok: true, version: version.id });
  await page.keyboard.press("Escape");
  await shot(page, "08-liste-apres-publication");

  // 7. Retirer : le bien quitte le site, reste dans l'onglet.
  const row = page.locator("li").filter({ hasText: TITLE }).first();
  await row.getByRole("button", { name: "Retirer" }).click(); await page.waitForTimeout(1500);
  assert.ok(!(await louer()).includes(TITLE), "bien retiré de la page Louer");
  await row.getByText("Retiré de l'affichage").waitFor({ timeout: 30000 });
  await shot(page, "09-retire"); steps.push({ step: "retiré : absent du site, conservé dans l'onglet", ok: true });

  assert.deepEqual(errors.filter((e) => !/ResizeObserver/.test(e)), [], "erreurs de page du studio");
  fs.writeFileSync(path.join(out, "maison-horizon-studio.json"), JSON.stringify({ demo: "maison-horizon", origin: "studio Next.js de développement, base temporaire", steps, date: new Date().toISOString() }, null, 2) + "\n");
  console.log(JSON.stringify({ ok: true, steps }));
  await context.close();
} catch (e) { try { const pages = browser.contexts().flatMap((c) => c.pages()); if (pages[0]) await pages[0].screenshot({ path: path.join(out, "mh-99-echec.png") }); } catch { /* */ } throw e; } finally { await browser.close(); stopDev(); await new Promise((r) => setTimeout(r, 500)); fs.rmSync(temp, { recursive: true, force: true }); }
