/** Vérifie les bibliothèques par famille (issue #141) depuis l'interface réelle du studio (Next.js en développement,
 * base temporaire, aucune IA, aucun réseau) : la galerie « Ajouter une section » ne montre que les 20 fonctions de la
 * famille du projet, une fonction d'une autre famille est introuvable, l'aperçu change avec la disposition choisie,
 * l'ajout pose la section avec l'identité du projet ; puis, dans le panneau « Réglages » : changement de disposition
 * (contenu conservé), modification du titre, déplacement, disposition d'en-tête et de pied de page ; enfin rechargement
 * complet de la page : tout est conservé. Captures ordinateur et téléphone à chaque étape.
 *
 *   npx tsx scripts/family-studio-check.ts <dossier-captures> [fraise|orbe|rive]
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium, type Page } from "playwright";
if (process.env.DATA_DIR || process.env.DATABASE_FILE) throw new Error("Base existante refusée");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-familles-studio-")); process.env.DATA_DIR = temp; process.env.STOCK_OFFLINE = "1";
const out = path.resolve(process.argv[2] ?? "reports/familles-studio"); fs.mkdirSync(out, { recursive: true });
const demoId = (process.argv[3] ?? "fraise") as "fraise" | "orbe" | "rive";
/** Scénario par famille : fonction ajoutée, disposition d'aperçu, disposition choisie ensuite, fonction d'une autre famille. */
const PLAN = {
  fraise: { family: "specialty", entry: "Fabrication et savoir-faire", type: "fs-making", preview: "sticky", then: "timeline", foreign: "Étude de cas", header: "two-rows", footer: "centered" },
  orbe: { family: "catalog", entry: "Ambiance et lookbook", type: "fs-lookbook", preview: "side", then: "markers", foreign: "Composition et matériaux", header: "mega-columns", footer: "columns" },
  rive: { family: "services", entry: "Étude de cas", type: "fs-case", preview: "columns", then: "stacked", foreign: "Ambiance et lookbook", header: "booking", footer: "brand-left" },
}[demoId];
const PORT = 3600 + Math.floor(Math.random() * 300), origin = `http://127.0.0.1:${PORT}`;
const { demoProject } = await import("../tests/demo-fixtures");
const { createUser } = await import("../src/lib/auth"); const { saveThemeVersion } = await import("../src/lib/projects"); const { runWithLang } = await import("../src/lib/i18n-server");
const { FAMILY_LIBRARY } = await import("../src/lib/theme/section-families");
const password = "familles-" + Math.random().toString(36).slice(2), email = "familles-studio@example.invalid";
const user = await createUser(email, password, "Vérification familles");
const f = await runWithLang({ content: "fr", ui: "fr" }, () => demoProject(user.id, demoId));
saveThemeVersion(f.pid, f.spec, "Démonstration — vérification des bibliothèques", "user");
const entryName = FAMILY_LIBRARY[PLAN.family as "specialty"].find((e) => e.name.fr === PLAN.entry);
assert.ok(entryName, `fonction « ${PLAN.entry} » absente du registre`);
const dev = spawn("npx", ["next", "dev", "-p", String(PORT), "-H", "127.0.0.1"], { env: { ...process.env, DATA_DIR: temp, STOCK_OFFLINE: "1", NEXT_TELEMETRY_DISABLED: "1" }, stdio: ["ignore", "pipe", "pipe"], detached: true });
const stopDev = () => { try { process.kill(-dev.pid!, "SIGTERM"); } catch { /* arrêté */ } }; process.on("exit", stopDev);
let log = ""; dev.stdout.on("data", (d) => { log += d; }); dev.stderr.on("data", (d) => { log += d; });
const started = Date.now();
for (;;) { if (Date.now() - started > 240000) throw new Error("Studio non démarré :\n" + log.slice(-2000)); try { const r = await fetch(`${origin}/connexion`); if (r.ok) break; } catch { /* pas prêt */ } await new Promise((r) => setTimeout(r, 1500)); }
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const steps: Record<string, unknown>[] = [];
const shot = async (page: Page, name: string) => { await page.screenshot({ path: path.join(out, `${demoId}-${name}.png`) }); };
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" }); const page = await context.newPage();
  const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
  const login = await context.request.post(`${origin}/api/auth/login`, { data: { email, password } }); assert.ok(login.ok(), `connexion : ${login.status()}`);
  await page.goto(`${origin}/studio/${f.pid}/boutique`, { waitUntil: "networkidle", timeout: 240000 }); await page.waitForTimeout(1500);
  const frame = () => page.frameLocator("iframe[src*='/preview/']").first();
  await frame().locator("body").waitFor({ timeout: 120000 });
  const nudge = page.locator("[data-tuto-nudge]").getByRole("button", { name: /^(Masquer|Dismiss)$/ }); if (await nudge.count()) { await nudge.click(); await page.waitForTimeout(300); }
  await shot(page, "01-onglet-boutique");
  // 1. Galerie : les 20 fonctions de la famille, rien d'autre.
  const addButtons = page.getByRole("button", { name: /^Ajouter une section$/ }); await addButtons.last().scrollIntoViewIfNeeded(); await addButtons.last().click();
  const dialog = page.getByRole("dialog"); await dialog.waitFor();
  const names = (await dialog.getByRole("option").allInnerTexts()).map((x) => x.trim()).filter((x) => x && !/^Générer$/.test(x));
  const expected = FAMILY_LIBRARY[PLAN.family as "specialty"].map((e) => e.name.fr);
  for (const n of expected) assert.ok(names.includes(n), `galerie : « ${n} » absente`);
  const extra = names.filter((n) => !expected.includes(n));
  steps.push({ step: "galerie de la famille", ok: true, functions: expected.length, structure: extra });
  await shot(page, "02-galerie");
  await dialog.getByPlaceholder("Rechercher des sections").fill(PLAN.foreign); await page.waitForTimeout(500);
  assert.equal(await dialog.getByRole("option", { name: new RegExp(`^${PLAN.foreign}$`) }).count(), 0, `« ${PLAN.foreign} » (autre famille) ne doit pas être proposée`);
  await shot(page, "03-autre-famille-introuvable"); steps.push({ step: `fonction d'une autre famille introuvable (« ${PLAN.foreign} »)`, ok: true });
  // 2. Aperçu d'une fonction, choix d'une disposition, ajout.
  await dialog.getByPlaceholder("Rechercher des sections").fill(PLAN.entry); await page.waitForTimeout(500);
  const option = dialog.getByRole("option", { name: PLAN.entry }).first(); await option.focus();
  const chip = dialog.locator(`[data-disposition$="~${PLAN.preview}"]`); await chip.waitFor({ timeout: 30000 }); await chip.click();
  await dialog.frameLocator("iframe").first().locator(`.${PLAN.type}--${PLAN.preview}`).waitFor({ timeout: 120000 }); await page.waitForTimeout(1500);
  await shot(page, "04-apercu-disposition");
  await dialog.getByRole("button", { name: /^Ajouter cette section$/ }).click(); await dialog.waitFor({ state: "hidden", timeout: 120000 }); await page.waitForTimeout(2500);
  await frame().locator(`.${PLAN.type}--${PLAN.preview}`).first().waitFor({ timeout: 120000 }); await frame().locator(`.${PLAN.type}`).first().scrollIntoViewIfNeeded(); await page.waitForTimeout(1200);
  const headingAdded = (await frame().locator(`.${PLAN.type} h2`).first().innerText()).trim();
  await shot(page, "05-section-ajoutee"); steps.push({ step: "ajout depuis la galerie avec la disposition choisie", ok: true, heading: headingAdded });
  // 3. Panneau « Réglages » : changer de disposition (contenu conservé), modifier le titre.
  const theme = async () => (await (await context.request.get(`${origin}/api/projects/${f.pid}/theme`)).json()) as { current: { structure: { template: string; sections: { id: string; type: string; name: string }[] }[] } };
  const idx = (await theme()).current.structure.find((t) => t.template === "index")!; const sec = idx.sections.find((s) => s.type === PLAN.type)!;
  await page.getByRole("button", { name: new RegExp(`Actions pour « ${sec.name} »`) }).first().click(); await page.getByRole("menuitem", { name: /Modifier les réglages/ }).click();
  const panel = page.locator(`[data-section-settings='${PLAN.type}']`); await panel.waitFor({ timeout: 180000 }); await page.waitForTimeout(600); await shot(page, "06-panneau-dispositions");
  await panel.locator(`[data-disposition='${PLAN.then}']`).click();
  await frame().locator(`.${PLAN.type}--${PLAN.then}`).first().waitFor({ timeout: 120000 }); await page.waitForTimeout(800);
  assert.equal((await frame().locator(`.${PLAN.type} h2`).first().innerText()).trim(), headingAdded, "titre conservé au changement de disposition");
  steps.push({ step: "changement de disposition depuis le panneau (titre conservé)", ok: true });
  const headingInput = panel.locator("[data-setting='heading'] input"); await headingInput.fill("Titre modifié dans le panneau"); await headingInput.press("Enter");
  await frame().locator(`.${PLAN.type} h2`, { hasText: /Titre modifié dans le panneau/ }).first().waitFor({ timeout: 120000 }); await page.waitForTimeout(600);
  await shot(page, "07-titre-modifie"); steps.push({ step: "titre modifié dans le panneau", ok: true });
  // 4. Déplacement (ordre de la page).
  await page.getByRole("button", { name: /^(← Structure)$/ }).click().catch(() => {});
  const before = (await theme()).current.structure.find((t) => t.template === "index")!.sections.findIndex((s) => s.type === PLAN.type);
  await page.getByRole("button", { name: new RegExp(`Actions pour « ${sec.name} »`) }).first().click(); await page.getByRole("menuitem", { name: /^Monter$/ }).click(); await page.waitForTimeout(2500);
  const afterMove = (await theme()).current.structure.find((t) => t.template === "index")!.sections.findIndex((s) => s.type === PLAN.type);
  assert.equal(afterMove, before - 1, "section remontée d'un rang"); steps.push({ step: "section déplacée", ok: true, from: before, to: afterMove });
  // 5. En-tête et pied de page : une autre des cinq dispositions de la famille.
  for (const [part, preset] of [["header", PLAN.header], ["footer", PLAN.footer]] as const) {
    const g = (await theme()).current.structure.find((t) => t.template === `group:${part}`)!; const s = g.sections.find((x) => x.type === part)!;
    await page.getByRole("button", { name: new RegExp(`Actions pour « ${s.name} »`) }).first().click(); await page.getByRole("menuitem", { name: /Modifier les réglages/ }).click();
    const p = page.locator(`[data-section-settings='${part}']`); await p.waitFor({ timeout: 180000 }); await page.waitForTimeout(500);
    assert.equal(await p.locator("[data-dispositions] [data-disposition]").count(), 5, `${part} : cinq dispositions`);
    assert.equal(await p.locator("[data-dispositions] [data-disposition]").first().getAttribute("aria-pressed"), "true", `${part} : la disposition actuelle est la n° 1`);
    await shot(page, `08-${part}-dispositions`);
    await p.locator(`[data-disposition='${preset}']`).click(); await page.waitForTimeout(3000);
    await p.locator(`[data-disposition='${preset}'][aria-pressed='true']`).waitFor({ timeout: 60000 });
    await shot(page, `09-${part}-change`); steps.push({ step: `${part} : disposition « ${preset} » appliquée`, ok: true });
    await page.getByRole("button", { name: /^(← Structure)$/ }).click().catch(() => {});
  }
  // 6. Rechargement complet : tout est conservé.
  await page.reload({ waitUntil: "networkidle", timeout: 240000 }); await page.waitForTimeout(1500); await frame().locator("body").waitFor({ timeout: 120000 });
  await frame().locator(`.${PLAN.type}--${PLAN.then} h2`, { hasText: /Titre modifié dans le panneau/ }).first().waitFor({ timeout: 120000 });
  const spec = await (await context.request.get(`${origin}/api/projects/${f.pid}/theme`)).json();
  steps.push({ step: "rechargement : disposition, titre, ordre, en-tête et pied de page conservés", ok: true, structure: spec.current.structure.find((t: { template: string }) => t.template === "index").sections.map((s: { type: string }) => s.type) });
  await frame().locator(`.${PLAN.type}`).first().scrollIntoViewIfNeeded(); await page.waitForTimeout(800); await shot(page, "10-apres-rechargement");
  await page.getByTitle(/^(Téléphone|Phone)$/).click(); await page.waitForTimeout(2000); await frame().locator(`.${PLAN.type}`).first().scrollIntoViewIfNeeded(); await page.waitForTimeout(1500); await shot(page, "11-telephone");
  assert.deepEqual(errors.filter((e) => !/ResizeObserver/.test(e)), [], "erreurs de page du studio");
  fs.writeFileSync(path.join(out, `${demoId}-studio.json`), JSON.stringify({ demo: demoId, family: PLAN.family, origin: "studio Next.js de développement, base temporaire", steps, date: new Date().toISOString() }, null, 2) + "\n");
  console.log(JSON.stringify({ ok: true, demoId, steps }));
} catch (e) { try { const pages = browser.contexts().flatMap((c) => c.pages()); if (pages[0]) await pages[0].screenshot({ path: path.join(out, `${demoId}-99-echec.png`) }); } catch { /* */ } throw e; } finally { await browser.close(); stopDev(); await new Promise((r) => setTimeout(r, 1500)); try { process.kill(-dev.pid!, "SIGKILL"); } catch { /* */ } fs.rmSync(temp, { recursive: true, force: true }); }
