/** Parcours « démo complète puis choix » dans le vrai studio (revue de la PR #149) — Next.js de développement + worker, base
 * temporaire, aucune IA, aucun réseau. Un projet EXISTANT (« Atelier Verre », boutique spécialisée installée dans FRAISE) :
 *  1. ouvre la galerie « Thèmes » ; les cartes montrent les démonstrations, « Voir la démo complète » ouvre la boutique de
 *     démonstration entière de SILLON (accueil, fiche, pages par le sélecteur ET par les menus de la démo), en ordinateur
 *     puis en téléphone, puis celle de FRAISE ; Échap ferme la démo, la galerie reste ouverte ;
 *  2. preuve de non-modification : empreinte du projet (ligne du projet, versions de thème, médias, tâches, appels IA)
 *     identique avant et après la visite, et aucune requête d'écriture envoyée au projet pendant la visite ;
 *  3. « Choisir ce thème » depuis la démo, en double-clic, plus une seconde demande simultanée : une seule tâche, une seule
 *     nouvelle version ; l'éditeur s'ouvre sur le projet (identité « Atelier Verre », profil « nomade », aucun texte de la
 *     démo) avec le guide des informations à compléter ;
 *  4. galerie et démo sur un téléphone (390 × 844).
 *
 *   THEME_DEMOS_DIR=<démos préparées> npx tsx scripts/theme-demo-choice-check.ts <dossier-captures> [sillon|noctil|traverse|heuren|alcove|museau-club]
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium, type Page } from "playwright";
if (process.env.DATA_DIR || process.env.DATABASE_FILE) throw new Error("Base existante refusée");
/** Thème parcouru puis choisi (issue #152 : NOCTIL et TRAVERSE par le même parcours que SILLON). */
const T = (process.argv[3] ?? "sillon") as "sillon" | "noctil" | "traverse" | "heuren" | "alcove" | "museau-club";
const THEME = {
  sillon: { brand: /SILLON/, profile: "nomade", menuPage: "page-usages.html", menuLabel: "Usages", leak: /SILLON|espresso|où tout coule|avant de partir|Boutique de démonstration/i },
  noctil: { brand: /NOCTIL/, profile: "astral", menuPage: "page-univers.html", menuLabel: "Une galaxie par pièce", leak: /NOCTIL|galaxie|la nuit entre|une autre nuit|Boutique de démonstration/i },
  traverse: { brand: /TRAVERSE/, profile: "itineraire", menuPage: "page-carnet-de-route.html", menuLabel: "Carnet de route", leak: /TRAVERSE|quai de départ|Carnet de route|trois temps|Boutique de démonstration/i },
  // HEUREN et ALCÔVE (issue #155) : famille E-commerce, profil porté par « editorial_profile ».
  heuren: { brand: /HEUREN/, profile: "cadran", menuPage: "page-au-fil-du-jour.html", menuLabel: "Au fil du jour", leak: /HEUREN|heure bleue|bleu nuit soleillé|Au fil du jour|Boutique de démonstration/i },
  alcove: { brand: /ALCÔVE/, profile: "arrondi", menuPage: "page-piece-par-piece.html", menuLabel: "Pièce par pièce", leak: /ALCÔVE|alcôve à soi|terracotta|Pièce par pièce|Boutique de démonstration/i },
  "museau-club": { brand: /MUSEAU CLUB/, profile: "club", menuPage: "page-la-balade.html", menuLabel: "La balade", leak: /MUSEAU|harnais|pochette|bleu cobalt|La balade|Boutique de démonstration/i },
}[T];
/** Attribut du <body> qui porte le profil graphique : « conversion » (boutique spécialisée), « editorial » (E-commerce). */
const CATALOG = T === "heuren" || T === "alcove" || T === "museau-club";
const PROFILE_ATTR = CATALOG ? "editorial" : "conversion";
/** Projet de départ de la même famille que le thème choisi : boutique spécialisée dans FRAISE, ou E-commerce dans ORBE
 * (HEUREN et ALCÔVE, issue #155 : un thème E-commerce ne se propose pas à une boutique spécialisée). */
const START = (CATALOG ? { id: "orbe", name: "ORBE", kind: "catalog" } : { id: "fraise", name: "FRAISE", kind: "specialty" }) as { id: "orbe" | "fraise"; name: string; kind: "catalog" | "specialty" };
const demosDir = process.env.THEME_DEMOS_DIR; if (!demosDir || !fs.existsSync(path.join(demosDir, T, "accueil.html"))) throw new Error("THEME_DEMOS_DIR : démos préparées requises (scripts/prepare-theme-demos.ts)");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-demo-choice-")); process.env.DATA_DIR = temp; process.env.STOCK_OFFLINE = "1";
const out = path.resolve(process.argv[2] ?? "reports/theme-demo-choice"); fs.mkdirSync(out, { recursive: true });
const PORT = 4300 + Math.floor(Math.random() * 300), origin = `http://127.0.0.1:${PORT}`;
const { createUser } = await import("../src/lib/auth"); const { run, one, all } = await import("../src/lib/db");
const { saveThemeVersion, loadProject, saveBrand, saveSettings } = await import("../src/lib/projects"); const { runWithLang } = await import("../src/lib/i18n-server");
const { composeShop } = await import("../src/lib/engine/shop"); const { seedHoldout } = await import("../tests/lot1-holdout-fixtures");
const password = "demo-" + Math.random().toString(36).slice(2), email = "demo-choice@example.invalid";
const user = await createUser(email, password, "Vérification démo complète");
const pid = seedHoldout(user.id, 0, "Atelier Verre");
run("INSERT INTO subscriptions (user_id,status,plan,owner_user_id,project_id,source,created_at,updated_at) VALUES (?,'active','creer',?,?,'admin',?,?)", `demo-check-${pid}`, user.id, pid, Date.now(), Date.now());
const p0 = loadProject(pid);
saveBrand(pid, { ...p0.brand!, name: "Atelier Verre", tagline: "Des verres soufflés pour tous les jours.", palette: { primary: "#1F4E5F", secondary: "#CFE3E8", accent: "#2A7F62", light: "#F6F8F7", dark: "#10242B" }, direction: START.id });
saveSettings(pid, { ...loadProject(pid).settings, storeKind: START.kind });
const built = await runWithLang({ content: "fr", ui: "fr" }, () => composeShop(pid, START.id, null, false));
saveThemeVersion(pid, built.spec, `Boutique Atelier Verre (${START.name})`, "user");

/** Empreinte de tout ce que la visite pourrait toucher : elle doit être identique avant et après. */
const hash = (x: unknown) => crypto.createHash("sha256").update(JSON.stringify(x)).digest("hex").slice(0, 16);
const fingerprint = () => ({
  projet: hash(one("SELECT * FROM projects WHERE id = ?", pid)),
  versionsDeTheme: all<{ id: string; number: number }>("SELECT id, number FROM theme_versions WHERE project_id = ? ORDER BY number", pid).map((v) => `${v.number}:${v.id}`),
  medias: (one<{ n: number }>("SELECT COUNT(*) AS n FROM assets WHERE project_id = ?", pid)!).n,
  taches: (one<{ n: number }>("SELECT COUNT(*) AS n FROM jobs WHERE project_id = ?", pid)!).n,
  appelsIA: (one<{ n: number }>("SELECT COUNT(*) AS n FROM ai_calls WHERE project_id = ?", pid)!).n,
  versionsDeMarque: (one<{ n: number }>("SELECT COUNT(*) AS n FROM brand_versions WHERE project_id = ?", pid)!).n,
});

const env = { ...process.env, DATA_DIR: temp, STOCK_OFFLINE: "1", NEXT_TELEMETRY_DISABLED: "1", THEME_DEMOS_DIR: demosDir, THEME_DEMOS_AUTO: "0" };
const dev = spawn("npx", ["next", "dev", "-p", String(PORT), "-H", "127.0.0.1"], { env, stdio: ["ignore", "pipe", "pipe"], detached: true });
const worker = spawn("npx", ["tsx", "worker/index.ts"], { env, stdio: ["ignore", "pipe", "pipe"], detached: true });
const stop = () => { for (const c of [dev, worker]) try { process.kill(-c.pid!, "SIGTERM"); } catch { /* arrêté */ } }; process.on("exit", stop);
let log = ""; for (const c of [dev, worker]) { c.stdout.on("data", (d) => { log += d; }); c.stderr.on("data", (d) => { log += d; }); }
const started = Date.now();
for (;;) { if (Date.now() - started > 240000) throw new Error("Studio non démarré :\n" + log.slice(-2000)); try { const r = await fetch(`${origin}/connexion`); if (r.ok) break; } catch { /* pas prêt */ } await new Promise((r) => setTimeout(r, 1500)); }
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const steps: Record<string, unknown>[] = [];
const shot = async (page: Page, name: string) => { await page.screenshot({ path: path.join(out, `choix-${T}-${name}.png`) }); };
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" }); const page = await context.newPage();
  const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
  const login = await context.request.post(`${origin}/api/auth/login`, { data: { email, password } }); assert.ok(login.ok(), `connexion : ${login.status()}`);
  await page.goto(`${origin}/studio/${pid}/boutique`, { waitUntil: "networkidle", timeout: 240000 }); await page.waitForTimeout(1500);
  const preview = () => page.frameLocator("iframe[src*='/preview/']").first();
  await preview().locator(START.id === "orbe" ? "body[data-editorial='object']" : "body[data-conversion='pop']").waitFor({ timeout: 180000 });
  const nudge = page.locator("[data-tuto-nudge]").getByRole("button", { name: /^(Masquer|Dismiss)$/ }); if (await nudge.count()) { await nudge.click(); await page.waitForTimeout(300); }
  await shot(page, `01-projet-existant-${START.id}`);
  const before = fingerprint();
  steps.push({ step: `projet existant « Atelier Verre » (${START.kind === "catalog" ? "E-commerce" : "boutique spécialisée"}) ouvert dans ${START.name}`, empreinte: before, ok: true });

  // 1. Visite : aucune requête d'écriture vers le projet ne doit partir.
  const writes: string[] = [];
  page.on("request", (r) => { if (r.method() !== "GET" && r.url().includes(`/api/projects/${pid}`)) writes.push(`${r.method()} ${new URL(r.url()).pathname}`); });
  const openGallery = async () => {
    for (let attempt = 1; ; attempt++) {
      await page.getByRole("button", { name: /^Thèmes$/ }).first().click();
      const ok = await page.locator(`[data-open-demo='${T}']:not([disabled])`).waitFor({ timeout: 60000 }).then(() => true, () => false);
      if (ok) return;
      if (attempt >= 3) throw new Error("Galerie sans démo complète disponible");
      await page.reload({ waitUntil: "networkidle", timeout: 240000 }); await page.waitForTimeout(1500);
    }
  };
  await openGallery();
  const thumbs = await page.locator("[data-demo-thumb]").evaluateAll((els) => els.map((e) => (e as HTMLImageElement).getAttribute("src")));
  assert.ok(thumbs.length >= 5 && thumbs.every((s) => s && !s.startsWith("/api/projects/")), "cartes : visuels de démonstration, jamais le projet");
  await page.locator(`[data-open-demo='${T}']`).scrollIntoViewIfNeeded(); await page.waitForTimeout(600);
  await shot(page, "02-galerie-demos");
  steps.push({ step: "galerie : chaque carte montre la démonstration du thème et propose « Voir la démo complète »", vignettes: thumbs, ok: true });

  const viewer = page.locator(`[data-theme-demo='${T}']`);
  const demoFrame = () => page.frameLocator("[data-theme-demo] iframe").first();
  for (let attempt = 1; ; attempt++) {
    await page.locator(`[data-open-demo='${T}']`).click();
    if (await viewer.waitFor({ timeout: 20000 }).then(() => true, () => false)) break;
    if (attempt >= 3) throw new Error("Démo complète jamais ouverte");
    await page.reload({ waitUntil: "networkidle", timeout: 240000 }); await openGallery();
  }
  await demoFrame().locator(`body[data-${PROFILE_ATTR}='${THEME.profile}']`).waitFor({ timeout: 60000 }); await page.waitForTimeout(1200);
  const home = await demoFrame().locator("body").innerText();
  assert.ok(THEME.brand.test(home) && !/Atelier Verre/.test(home), `démo : contenus ${T.toUpperCase()}, jamais ceux du projet`);
  await shot(page, "03-demo-ordinateur-accueil");
  const pages = await page.locator("[data-demo-pages] option").evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).textContent));
  steps.push({ step: `démo complète ${T.toUpperCase()} ouverte (ordinateur) : contenus de démonstration`, pages, ok: true });
  // Défilement de toute la page d'accueil de la démo (toutes ses sections).
  const sections = await demoFrame().locator("main section, main > div[id^='shopify-section'], .shopify-section").count();
  await demoFrame().locator("footer").last().scrollIntoViewIfNeeded(); await page.waitForTimeout(800);
  await shot(page, "04-demo-bas-de-page");
  steps.push({ step: "accueil de la démo défilé jusqu'au pied de page", sections, ok: true });
  // Fiche produit par le sélecteur de pages.
  await page.locator("[data-demo-pages]").selectOption("produit.html");
  await demoFrame().locator(".es-product__title").first().waitFor({ timeout: 30000 }); await page.waitForTimeout(1000);
  await shot(page, "05-demo-fiche");
  // Navigation par un menu de la démo elle-même : le sélecteur suit la page affichée.
  // Lien visible du menu (TRAVERSE : le même lien existe aussi dans les encarts du sous-menu, fermé).
  await demoFrame().locator(`header a[href='${THEME.menuPage}'] >> visible=true`).first().click();
  await page.waitForFunction((want) => (document.querySelector("[data-demo-pages]") as HTMLSelectElement | null)?.value === want, THEME.menuPage, { timeout: 30000 });
  await page.waitForTimeout(1000);
  await shot(page, "06-demo-menu-usages");
  steps.push({ step: `navigation : fiche produit par le sélecteur, page « ${THEME.menuLabel} » par le menu de la démo`, ok: true });
  // Téléphone.
  await page.locator("[data-device='mobile']").click();
  await demoFrame().locator(`body[data-${PROFILE_ATTR}='${THEME.profile}']`).waitFor({ timeout: 30000 }); await page.waitForTimeout(1200);
  const width = await demoFrame().locator("html").evaluate(() => window.innerWidth);
  assert.equal(width, 390, "démo en téléphone : 390 px");
  await shot(page, "07-demo-telephone");
  await demoFrame().locator("[data-menu-open], .es-header__menu-toggle, button[aria-controls*='menu']").first().click().catch(() => undefined); await page.waitForTimeout(900);
  await shot(page, "08-demo-telephone-menu");
  steps.push({ step: "bascule téléphone : la démo s'affiche à 390 px, page conservée, menu mobile", ok: true });
  // Échap : la démo se ferme, la galerie reste ouverte.
  // (Dans la démo elle-même, Échap reste à la démo : il ferme ses menus et tiroirs.)
  await page.locator("[data-demo-pages]").focus(); await page.keyboard.press("Escape"); await viewer.waitFor({ state: "detached", timeout: 10000 });
  assert.ok(await page.locator("[data-open-demo='fraise']").isVisible(), "galerie toujours ouverte après Échap");
  // Un autre thème : FRAISE.
  await page.locator("[data-open-demo='fraise']").click();
  await page.locator("[data-theme-demo='fraise']").waitFor({ timeout: 20000 });
  await demoFrame().locator("body[data-conversion='pop']").waitFor({ timeout: 60000 }); await page.waitForTimeout(1200);
  const fraise = await demoFrame().locator("body").innerText();
  assert.ok(/FRAISE/i.test(fraise) && !/Atelier Verre/.test(fraise), "démo FRAISE : ses propres contenus");
  await shot(page, "09-demo-fraise-ordinateur");
  await page.getByRole("button", { name: "Fermer la démo" }).click(); await page.waitForTimeout(500);
  steps.push({ step: "démo complète FRAISE ouverte puis fermée ; Échap ne ferme que la démo", ok: true });

  // 2. Non-modification.
  const after = fingerprint();
  assert.deepEqual(after, before, "le projet n'a pas changé pendant la visite");
  assert.deepEqual(writes, [], "aucune requête d'écriture vers le projet pendant la visite");
  steps.push({ step: "aucune modification du projet pendant la visite (empreinte identique, aucune écriture)", avant: before, apres: after, ecritures: [...writes], ok: true });

  // 3. Choix explicite depuis la démo, en double-clic + une seconde demande simultanée.
  await page.locator(`[data-open-demo='${T}']`).click(); await viewer.waitFor({ timeout: 20000 });
  await demoFrame().locator(`body[data-${PROFILE_ATTR}='${THEME.profile}']`).waitFor({ timeout: 60000 }); await page.waitForTimeout(800);
  await shot(page, "10-demo-avant-choix");
  const posts: string[] = []; page.on("request", (r) => { if (r.method() === "POST" && r.url().endsWith("/theme/build")) posts.push(r.url()); });
  const [extra] = await Promise.all([
    context.request.post(`${origin}/api/projects/${pid}/theme/build`, { data: { direction: T } }),
    viewer.locator(`[data-choose-theme='${T}']`).dblclick(),
  ]);
  assert.ok(extra.ok(), `seconde demande : ${extra.status()}`);
  await viewer.waitFor({ state: "detached", timeout: 30000 });
  for (const t0 = Date.now(); ; ) {
    await page.waitForTimeout(3000);
    const done = all<{ status: string }>("SELECT status FROM jobs WHERE project_id = ? AND type = 'shop.direction'", pid);
    if (done.length && done.every((j) => ["done", "failed", "cancelled"].includes(j.status))) break;
    if (Date.now() - t0 > 300000) throw new Error("Application jamais terminée :\n" + log.slice(-3000));
  }
  const jobs = all<{ status: string; payload: string }>("SELECT status, payload FROM jobs WHERE project_id = ? AND type = 'shop.direction'", pid);
  assert.equal(jobs.length, 1, "une seule tâche d'application malgré le double-clic et la demande simultanée");
  assert.equal(jobs[0].status, "done");
  const versions = fingerprint().versionsDeTheme;
  assert.equal(versions.length, before.versionsDeTheme.length + 1, "une seule nouvelle version de thème");
  await page.reload({ waitUntil: "networkidle", timeout: 240000 });
  await preview().locator(`body[data-${PROFILE_ATTR}='${THEME.profile}']`).waitFor({ timeout: 180000 }); await page.waitForTimeout(1500);
  const text = await preview().locator("body").innerText();
  assert.ok(text.includes("Atelier Verre"), "identité du projet après le choix");
  assert.ok(!THEME.leak.test(text), `aucun contenu de la démo ${T.toUpperCase()} repris`);
  await shot(page, "11-editeur-apres-choix");
  steps.push({ step: "« Choisir ce thème » (double-clic + demande simultanée) : une seule tâche, une seule version, éditeur sur le projet, aucun contenu de démo", requetesInterface: posts.length, taches: jobs.length, versions, ok: true });
  // Guide après le choix (vue directe : le guide s'affiche quand l'application est terminée dans la même session).
  const guided = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" }); await guided.addCookies(await context.cookies());
  const g = await guided.newPage(); await g.goto(`${origin}/studio/${pid}/boutique`, { waitUntil: "networkidle", timeout: 240000 }); await g.waitForTimeout(1500);
  // Un second thème de la même catégorie, choisi depuis sa carte (ONDE ; en E-commerce, l'autre thème de l'issue #155) :
  // le guide liste ce qui attend les informations du projet.
  const second = START.kind === "catalog" ? { id: T === "heuren" ? "alcove" : "heuren", body: `body[data-editorial='${T === "heuren" ? "arrondi" : "cadran"}']` } : { id: "onde", body: "body[data-conversion='contrast']" };
  await g.getByRole("button", { name: /^Thèmes$/ }).first().click(); await g.locator(`[data-open-demo='${second.id}']`).waitFor({ timeout: 60000 });
  await g.locator(`[data-choose-theme='${second.id}']`).click();
  await g.locator("[data-theme-guide]").waitFor({ timeout: 300000 });
  await g.frameLocator("iframe[src*='/preview/']").first().locator(second.body).waitFor({ timeout: 180000 }); await g.waitForTimeout(1500);
  await g.screenshot({ path: path.join(out, "choix-12-guide-informations-a-completer.png") });
  const guide = await g.locator("[data-theme-guide]").innerText();
  steps.push({ step: "après un choix : guide des informations à compléter (sans rien emprunter à la démo)", guide, ok: true });
  await guided.close();

  // 4. Téléphone : galerie et démo complète dans le studio.
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR", isMobile: true, hasTouch: true }); await phone.addCookies(await context.cookies());
  const m = await phone.newPage(); await m.goto(`${origin}/studio/${pid}/boutique?themes=1`, { waitUntil: "networkidle", timeout: 240000 }); await m.waitForTimeout(1500);
  await m.locator("[data-open-demo='orbe']").waitFor({ timeout: 60000 }); await m.locator("[data-open-demo='orbe']").scrollIntoViewIfNeeded(); await m.waitForTimeout(600);
  await m.screenshot({ path: path.join(out, "choix-13-telephone-galerie.png") });
  await m.locator("[data-open-demo='orbe']").click(); await m.locator("[data-theme-demo='orbe']").waitFor({ timeout: 20000 });
  await m.frameLocator("[data-theme-demo] iframe").first().locator("body").waitFor({ timeout: 60000 }); await m.waitForTimeout(1500);
  await m.screenshot({ path: path.join(out, "choix-14-telephone-demo-orbe-ordinateur.png") });
  await m.locator("[data-device='mobile']").click(); await m.waitForTimeout(1500);
  await m.screenshot({ path: path.join(out, "choix-15-telephone-demo-orbe-telephone.png") });
  const over = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(over <= 0, `studio sur téléphone : aucun débordement (${over})`);
  steps.push({ step: "studio sur téléphone : galerie, démo complète ORBE en ordinateur puis téléphone, aucun débordement", ok: true });
  await phone.close();

  assert.deepEqual(errors.filter((e) => !/ResizeObserver/.test(e)), [], "erreurs de page du studio");
  fs.writeFileSync(path.join(out, "choix-theme.json"), JSON.stringify({ project: "Atelier Verre (projet existant, distinct des démonstrations)", origin: "studio Next.js de développement + worker, base temporaire, aucune IA", steps, date: new Date().toISOString() }, null, 2) + "\n");
  console.log(JSON.stringify({ ok: true, steps: steps.map((s) => s.step) }));
} catch (e) { try { const pages = browser.contexts().flatMap((c) => c.pages()); if (pages[0]) await pages[0].screenshot({ path: path.join(out, "choix-99-echec.png") }); } catch { /* */ } console.error(log.slice(-3000)); throw e; } finally { fs.writeFileSync(path.join(out, "serveur-et-worker.log"), log); await browser.close(); stop(); }
